import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  GameStateFromServer,
  RoundResult,
  AvailableRoom,
  RoomOptions,
  ChatMessage,
} from '../types';

// In production, frontend is served by the same server — use current origin
// In dev, connect to localhost:3001
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:3001`);

const SESSION_KEY = 'golf_game_session';

interface SavedSession {
  roomCode: string;
  persistentId: string;
}

function saveSession(roomCode: string, persistentId: string) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, persistentId }));
  } catch { /* ignore */ }
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const leavingRef = useRef(false);
  const rejoinAttemptedRef = useRef(false);
  const sessionRef = useRef<SavedSession | null>(null);

  const [gameState, setGameState] = useState<GameStateFromServer | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const currentRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (!rejoinAttemptedRef.current) {
        rejoinAttemptedRef.current = true;
        const session = loadSession();
        if (session) {
          socket.emit('rejoin_room', {
            roomCode: session.roomCode,
            persistentId: session.persistentId,
          });
        }
      }
    });

    socket.on('game_state', (state: GameStateFromServer) => {
      if (leavingRef.current) return;
      // Ignore stale game_state from a room we already left
      if (currentRoomRef.current && state.roomCode !== currentRoomRef.current) return;
      setGameState(state);

      if (state.phase === 'game_over') {
        clearSession();
      } else if (!loadSession() && sessionRef.current) {
        saveSession(sessionRef.current.roomCode, sessionRef.current.persistentId);
      }
    });

    socket.on('round_result', (result: RoundResult) => {
      if (leavingRef.current) return;
      setRoundResult(result);
    });

    socket.on('error_msg', ({ message }: { message: string }) => {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(''), 3000);
    });

    socket.on('room_created', ({ persistentId, roomCode }: { persistentId: string; roomCode: string }) => {
      leavingRef.current = false;
      currentRoomRef.current = roomCode;
      sessionRef.current = { roomCode, persistentId };
      saveSession(roomCode, persistentId);
    });

    socket.on('room_joined', ({ persistentId, roomCode }: { persistentId: string; roomCode: string }) => {
      leavingRef.current = false;
      currentRoomRef.current = roomCode;
      sessionRef.current = { roomCode, persistentId };
      saveSession(roomCode, persistentId);
    });

    socket.on('rejoin_success', ({ persistentId, roomCode }: { persistentId: string; roomCode: string }) => {
      leavingRef.current = false;
      currentRoomRef.current = roomCode;
      sessionRef.current = { roomCode, persistentId };
      saveSession(roomCode, persistentId);
    });

    socket.on('game_started', () => {
      setRoundResult(null);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      if (leavingRef.current) return;
      setChatMessages((prev) => [...prev.slice(-50), msg]);
    });

    socket.on('rooms_updated', (rooms: AvailableRoom[]) => {
      setAvailableRooms(rooms);
    });

    socket.emit('get_rooms');

    return () => {
      socket.disconnect();
    };
  }, []);

  // === Room Management ===
  const createRoom = useCallback((nickname: string, avatarIndex: number, options: Partial<RoomOptions>) => {
    socketRef.current?.emit('create_room', { nickname, avatarIndex, options });
  }, []);

  const joinRoom = useCallback((roomCode: string, nickname: string, avatarIndex: number) => {
    socketRef.current?.emit('join_room', { roomCode, nickname, avatarIndex });
  }, []);

  const toggleReady = useCallback(() => {
    socketRef.current?.emit('toggle_ready');
  }, []);

  const setRoomOptions = useCallback((options: Partial<RoomOptions>) => {
    socketRef.current?.emit('set_room_options', options);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game');
  }, []);

  const leaveRoom = useCallback(() => {
    leavingRef.current = true;
    currentRoomRef.current = null;
    socketRef.current?.emit('leave_room');
    setGameState(null);
    setRoundResult(null);
    setChatMessages([]);
    sessionRef.current = null;
    clearSession();
  }, []);

  // === Game Actions ===
  const peekDone = useCallback(() => {
    socketRef.current?.emit('peek_done');
  }, []);

  const drawFromPile = useCallback(() => {
    socketRef.current?.emit('draw_from_pile');
  }, []);

  const drawFromDiscard = useCallback(() => {
    socketRef.current?.emit('draw_from_discard');
  }, []);

  const thankYouAck = useCallback(() => {
    socketRef.current?.emit('thank_you_ack');
  }, []);

  const swapCard = useCallback((position: number) => {
    socketRef.current?.emit('swap_card', { position });
  }, []);

  const discardAndFlip = useCallback((flipPosition: number) => {
    socketRef.current?.emit('discard_and_flip', { flipPosition });
  }, []);

  const nextRound = useCallback(() => {
    socketRef.current?.emit('next_round');
    setRoundResult(null);
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit('play_again');
    setRoundResult(null);
    setChatMessages([]);
  }, []);

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit('send_chat', { message });
  }, []);

  return {
    gameState,
    roundResult,
    errorMsg,
    chatMessages,
    availableRooms,
    createRoom,
    joinRoom,
    toggleReady,
    setRoomOptions,
    startGame,
    leaveRoom,
    peekDone,
    drawFromPile,
    drawFromDiscard,
    thankYouAck,
    swapCard,
    discardAndFlip,
    nextRound,
    playAgain,
    sendChat,
  };
}
