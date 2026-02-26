import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { GameStateFromServer, RoundResult, PlayerCard, ActionLogEntry, Suit, Rank } from '../types';
import PlayingCard from '../components/PlayingCard';
import CardGrid from '../components/CardGrid';
import OpponentCards from '../components/OpponentCards';
import DrawPile from '../components/DrawPile';
import DiscardPile from '../components/DiscardPile';
import ToastContainer, { type ToastItem } from '../components/Toast';
import TurnIndicator from '../components/TurnIndicator';
import CountdownBar from '../components/CountdownBar';
import GlobalChat from '../components/GlobalChat';
import MusicToggle from '../components/MusicToggle';
import CardLogModal from '../components/CardLogModal';
import type { ChatMessage } from '../types';
import {
  playCardFlip, playCardDeal, playMyTurn, playThankYou,
  playSwap, playDiscard, playRoundEnd, playTimerWarning,
} from '../utils/sfx';
import './GamePage.css';

const AVATARS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮'];

function formatAction(entry: ActionLogEntry, myId?: string): string {
  const name = entry.playerId === myId ? '나' : entry.playerName;

  switch (entry.action) {
    case 'draw_from_pile':
      return `${name}(이)가 뽑기 더미에서 카드를 가져감`;
    case 'draw_from_discard': {
      const card = entry.details.drawnCard;
      const cardStr = card ? `${card.rank}` : '카드';
      return `${name}(이)가 버린 카드에서 ${cardStr}을 가져감`;
    }
    case 'swap_card': {
      const disc = entry.details.discardedCard;
      const discStr = disc ? `${disc.rank}` : '카드';
      return `${name}(이)가 카드 교환 → ${discStr} 버림`;
    }
    case 'discard_and_flip':
      return `${name}(이)가 카드를 버리고 한 장 뒤집음`;
    case 'all_face_up':
      return `${name}(이)가 모든 카드 공개! 마지막 턴!`;
    case 'peek':
      return `${name}(이)가 카드를 확인함`;
    default:
      return `${name}(이)가 행동함`;
  }
}

interface Props {
  gameState: GameStateFromServer;
  roundResult: RoundResult | null;
  chatMessages: ChatMessage[];
  onPeekDone: () => void;
  onDrawFromPile: () => void;
  onDrawFromDiscard: () => void;
  onThankYouAck: () => void;
  onSwapCard: (position: number) => void;
  onDiscardAndFlip: (flipPosition: number) => void;
  onNextRound: () => void;
  onSendChat: (message: string) => void;
}

let toastIdCounter = 0;

function AdvancedModePopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="advanced-popup-overlay" onClick={onClose}>
      <div className="advanced-popup" onClick={(e) => e.stopPropagation()}>
        <h3>상급자 모드</h3>
        <ul>
          <li>🃏 <strong>스트레이트</strong>: 연속 4장 → 합계의 마이너스</li>
          <li>✖️ <strong>배수</strong>: 끝에서 2번째 라운드 x2, 마지막 x3</li>
          <li>🧠 <strong>카드 메모 없음</strong>: 본 카드를 기억해야 함</li>
        </ul>
        <button className="btn btn-primary" onClick={onClose}>확인</button>
      </div>
    </div>
  );
}

export default function GamePage({
  gameState,
  roundResult,
  chatMessages,
  onPeekDone,
  onDrawFromPile,
  onDrawFromDiscard,
  onThankYouAck,
  onSwapCard,
  onDiscardAndFlip,
  onNextRound,
  onSendChat,
}: Props) {
  const [actionMode, setActionMode] = useState<'swap' | 'discard' | null>(null);
  const [peekedCards, setPeekedCards] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dealing, setDealing] = useState(true);
  const [showAdvancedPopup, setShowAdvancedPopup] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showCardLog, setShowCardLog] = useState(false);
  const advancedPopupShownRef = useRef(false);
  const prevLogLenRef = useRef(gameState.actionLog.length);
  const prevPhaseRef = useRef(gameState.phase);

  const me = gameState.players.find((p) => p.id === gameState.myId);
  const isHost = me?.isHost ?? false;
  const isMyTurn = gameState.currentTurnPlayerId === gameState.myId;
  const myTurnPhase = gameState.myTurnPhase || 'idle';
  const myCards: PlayerCard[] = gameState.myCards || [];
  const drawnCard = gameState.myDrawnCard;
  const drawSource = gameState.myDrawSource;
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.currentTurnPlayerId
  );
  const otherPlayers = gameState.players.filter((p) => p.id !== gameState.myId);
  const cols = gameState.roomOptions.cardCount === 4 ? 2 : 3;

  // === Deal animation on phase transition ===
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = gameState.phase;
    // Trigger deal animation when entering peeking (new round starts)
    if (curr === 'peeking' && prev !== 'peeking') {
      setDealing(true);
      setPeekedCards(new Set());
      playCardDeal();
      // Show advanced mode popup on first round only
      if (gameState.roomOptions.gameMode === 'advanced' && !advancedPopupShownRef.current) {
        advancedPopupShownRef.current = true;
        setShowAdvancedPopup(true);
      }
      const timer = setTimeout(() => setDealing(false), 800);
      return () => clearTimeout(timer);
    }
    // Show chat available toast when round scoring starts
    if (curr === 'round_scoring' && prev !== 'round_scoring') {
      setToasts((prev) => [...prev, { id: ++toastIdCounter, message: '💬 채팅이 가능합니다!', type: 'info' }]);
      playRoundEnd();
    }
    prevPhaseRef.current = curr;
  }, [gameState.phase, gameState.roomOptions.gameMode]);

  // === Scoring confetti for pairs/straights ===
  useEffect(() => {
    if (gameState.phase !== 'round_scoring' || !roundResult) return;
    const hasPairs = roundResult.playerScores.some((ps) => ps.pairBonuses.length > 0);
    const hasStraight = roundResult.playerScores.some((ps) => ps.straightBonus);
    if (!hasPairs && !hasStraight) return;

    // Delayed confetti burst for bonus scoring
    const timer = setTimeout(() => {
      if (hasStraight) {
        // Big burst for straight
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#007AFF', '#5AC8FA', '#34C759', '#FFD700'],
          startVelocity: 25,
        });
      }
      if (hasPairs) {
        // Side sparkles for pairs
        confetti({
          particleCount: 30,
          angle: 60,
          spread: 50,
          origin: { x: 0.15, y: 0.6 },
          colors: ['#4caf50', '#81c784', '#FFD700'],
        });
        confetti({
          particleCount: 30,
          angle: 120,
          spread: 50,
          origin: { x: 0.85, y: 0.6 },
          colors: ['#4caf50', '#81c784', '#FFD700'],
        });
      }
    }, 800);

    return () => {
      clearTimeout(timer);
    };
  }, [gameState.phase, roundResult]);

  // === Toast from action log changes ===
  useEffect(() => {
    const log = gameState.actionLog;
    const prevLen = prevLogLenRef.current;

    if (log.length > prevLen) {
      const newEntries = log.slice(prevLen);
      const newToasts: ToastItem[] = newEntries.map((entry) => ({
        id: ++toastIdCounter,
        message: formatAction(entry, gameState.myId),
        type: entry.action === 'all_face_up' ? 'alert' as const : 'info' as const,
      }));
      setToasts((prev) => [...prev, ...newToasts]);
    }

    prevLogLenRef.current = log.length;
  }, [gameState.actionLog, gameState.myId]);

  // Reset log ref on round change
  useEffect(() => {
    if (gameState.actionLog.length === 0) {
      prevLogLenRef.current = 0;
    }
  }, [gameState.actionLog.length]);

  // SFX: play chime when it becomes my turn
  const prevIsMyTurnRef = useRef(isMyTurn);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      playMyTurn();
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  // SFX: timer warning when <=5 seconds remain
  useEffect(() => {
    if (!gameState.timerEnd) return;
    const checkTimer = () => {
      const remaining = Math.max(0, gameState.timerEnd! - Date.now());
      if (remaining > 0 && remaining <= 5000) {
        playTimerWarning();
      }
    };
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [gameState.timerEnd]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // === Peeking ===
  const handlePeekCard = useCallback((position: number) => {
    // Front row = bottom row (positions cols ... cardCount-1)
    // Back row = top row (positions 0 ... cols-1) — cannot peek
    if (position < cols) return;
    playCardFlip();
    setPeekedCards((prev) => {
      const next = new Set(prev);
      next.add(position);
      return next;
    });
  }, [cols]);

  // Determine which positions are front row (can be peeked)
  const frontRowPositions = Array.from(
    { length: gameState.roomOptions.cardCount - cols },
    (_, i) => cols + i
  );

  // === Card click handler for swap/flip ===
  const handleMyCardClick = useCallback((position: number) => {
    if (myTurnPhase === 'select_own_card' || myTurnPhase === 'drawn_card_action') {
      if (actionMode === 'swap') {
        playSwap();
        onSwapCard(position);
        setActionMode(null);
      } else if (actionMode === 'discard') {
        // Can only flip face-down cards
        const card = myCards.find((c) => c.position === position);
        if (card && !card.faceUp) {
          playDiscard();
          onDiscardAndFlip(position);
          setActionMode(null);
        }
      } else if (myTurnPhase === 'select_own_card') {
        // From discard pile (must swap)
        playSwap();
        onSwapCard(position);
        setActionMode(null);
      }
    }
  }, [myTurnPhase, actionMode, myCards, onSwapCard, onDiscardAndFlip]);

  // Selectable positions for my cards
  const getSelectablePositions = (): number[] => {
    if (gameState.phase === 'peeking' && !gameState.peekingDone) {
      return frontRowPositions;
    }
    if (!isMyTurn) return [];

    if (myTurnPhase === 'select_own_card') {
      return myCards.map((c) => c.position);
    }
    if (myTurnPhase === 'drawn_card_action') {
      if (actionMode === 'swap') {
        return myCards.map((c) => c.position);
      }
      if (actionMode === 'discard') {
        return myCards.filter((c) => !c.faceUp).map((c) => c.position);
      }
    }
    return [];
  };

  // === Status message ===
  const getStatusMessage = (): string => {
    if (gameState.phase === 'peeking') {
      return gameState.peekingDone
        ? '다른 플레이어를 기다리는 중...'
        : '앞줄(아래) 카드를 클릭하여 확인하세요!';
    }
    if (gameState.phase === 'round_scoring') return '라운드 결과를 확인하세요';

    if (!isMyTurn) {
      switch (myTurnPhase) {
        case 'draw_choice': return '뽑기 더미 또는 버린 카드에서 카드를 가져오세요';
        case 'thank_you': return '땡큐! 버튼을 눌러주세요';
        case 'drawn_card_action': {
          if (actionMode === 'swap') return '교환할 카드를 선택하세요';
          if (actionMode === 'discard') return '뒤집을 카드를 선택하세요 (뒷면만 가능)';
          return '교환하기 또는 버리기를 선택하세요';
        }
        case 'select_own_card': return '교환할 카드를 선택하세요';
        default: return '';
      }
    }

    switch (myTurnPhase) {
      case 'draw_choice': return '뽑기 더미 또는 버린 카드에서 카드를 가져오세요';
      case 'thank_you': return '땡큐! 버튼을 눌러주세요';
      case 'drawn_card_action': {
        if (actionMode === 'swap') return '교환할 카드를 선택하세요';
        if (actionMode === 'discard') return '뒤집을 카드를 선택하세요 (뒷면만 가능)';
        return '교환하기 또는 버리기를 선택하세요';
      }
      case 'select_own_card': return '교환할 카드를 선택하세요';
      default: return '';
    }
  };

  // Build known cards map (normal mode only — advanced mode must memorize)
  const getKnownCards = (): Map<number, { suit: Suit; rank: Rank }> | undefined => {
    if (gameState.roomOptions.gameMode === 'advanced') return undefined;
    if (peekedCards.size === 0) return undefined;
    const map = new Map<number, { suit: Suit; rank: Rank }>();
    for (const pos of peekedCards) {
      const card = myCards.find((c) => c.position === pos);
      if (card?.card && !card.faceUp) {
        map.set(pos, { suit: card.card.suit as Suit, rank: card.card.rank as Rank });
      }
    }
    return map.size > 0 ? map : undefined;
  };

  // Peeking phase: show cards for peek with click interaction
  const getPeekingCards = (): PlayerCard[] => {
    return myCards.map((c) => ({
      ...c,
      faceUp: c.faceUp || peekedCards.has(c.position),
    }));
  };

  // Show turn indicator during playing phases
  const showTurnIndicator =
    (gameState.phase === 'playing' || gameState.phase === 'last_turn') &&
    currentTurnPlayer;

  // === Round Scoring Overlay ===
  if (gameState.phase === 'round_scoring' && roundResult) {
    return (
      <div className="page game-page">
        <div className="scoring-overlay">
          <motion.h2
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          >
            라운드 {roundResult.round} 결과
          </motion.h2>
          {roundResult.roundMultiplier > 1 && (
            <motion.div
              className="multiplier-badge"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
            >
              x{roundResult.roundMultiplier} 배수!
            </motion.div>
          )}
          <div className="score-results">
            {[...roundResult.playerScores]
              .sort((a, b) => a.finalScore - b.finalScore)
              .map((ps, i) => (
                <motion.div
                  key={ps.playerId}
                  className={`score-row ${i === 0 ? 'winner' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                >
                  <span className="score-rank">{i === 0 ? '🏆' : `${i + 1}`}</span>
                  <span className="score-name">{ps.nickname}</span>
                  <div className="score-details">
                    <span className="score-raw">기본: {ps.rawScore}</span>
                    {ps.pairBonuses.length > 0 && (
                      <span className="score-pair">페어: -{ps.pairBonuses.reduce((a, b) => a + b.saved, 0)}</span>
                    )}
                    {ps.straightBonus && (
                      <span className="score-straight">스트레이트: {ps.straightBonus.bonus}</span>
                    )}
                    {ps.multiplier > 1 && (
                      <span className="score-mult">x{ps.multiplier}</span>
                    )}
                  </div>
                  <motion.span
                    className="score-final"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.12 + 0.3, duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {ps.finalScore}점
                  </motion.span>
                </motion.div>
              ))}
          </div>
          <div className="score-cards-reveal">
            {roundResult.playerScores.map((ps, pi) => (
              <div key={ps.playerId} className="reveal-player">
                <span className="reveal-name">{ps.nickname}</span>
                <div className="reveal-cards">
                  {ps.cards.map((c, ci) => (
                    <motion.div
                      key={c.position}
                      initial={{ opacity: 0, rotateY: 180, scale: 0.7 }}
                      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                      transition={{
                        delay: pi * 0.3 + ci * 0.1 + 0.5,
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                      }}
                    >
                      <PlayingCard
                        suit={c.card.suit}
                        rank={c.card.rank}
                        faceUp={true}
                        size="sm"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {isHost && (
            <motion.button
              className="btn btn-primary btn-large"
              onClick={onNextRound}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {gameState.currentRound >= gameState.roomOptions.totalRounds ? '최종 결과 보기' : '다음 라운드'}
            </motion.button>
          )}
        </div>
        <GlobalChat messages={chatMessages} onSend={onSendChat} myId={gameState.myId} />
      </div>
    );
  }

  return (
    <div className="page game-page">
      {/* Advanced Mode Popup */}
      {showAdvancedPopup && (
        <AdvancedModePopup onClose={() => setShowAdvancedPopup(false)} />
      )}

      {/* Scoreboard Modal */}
      {showScoreboard && (
        <div className="advanced-popup-overlay" onClick={() => setShowScoreboard(false)}>
          <div className="scoreboard-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📊 점수판</h3>
            <table className="scoreboard-table">
              <thead>
                <tr>
                  <th>플레이어</th>
                  {Array.from({ length: gameState.currentRound }, (_, i) => (
                    <th key={i}>R{i + 1}</th>
                  ))}
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                {[...gameState.players].sort((a, b) => a.totalScore - b.totalScore).map((p) => (
                  <tr key={p.id} className={p.id === gameState.myId ? 'my-row' : ''}>
                    <td className="sb-name">{p.nickname}</td>
                    {p.roundScores.map((s, i) => (
                      <td key={i}>{s}</td>
                    ))}
                    {Array.from({ length: gameState.currentRound - p.roundScores.length }, (_, i) => (
                      <td key={`e${i}`}>-</td>
                    ))}
                    <td className="sb-total">{p.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-primary" onClick={() => setShowScoreboard(false)}>닫기</button>
          </div>
        </div>
      )}

      {/* Card Log Modal */}
      <CardLogModal
        isOpen={showCardLog}
        onClose={() => setShowCardLog(false)}
        actionLog={gameState.actionLog}
        myId={gameState.myId}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Turn Indicator */}
      {showTurnIndicator && (
        <TurnIndicator
          playerName={currentTurnPlayer!.nickname}
          isMyTurn={isMyTurn}
          isLastTurn={gameState.phase === 'last_turn'}
        />
      )}

      {/* Timer */}
      <CountdownBar timerEnd={gameState.timerEnd} />

      {/* Header */}
      <div className="game-header">
        <div className="header-left">
          <span className="round-info">
            R{gameState.currentRound}/{gameState.roomOptions.totalRounds}
          </span>
          {gameState.roomOptions.gameMode === 'advanced' && (
            <span className="badge badge-warning">상급자</span>
          )}
        </div>
        <div className="header-center">
          {(gameState.phase === 'last_turn') && (
            <span className="last-turn-alert">🔔 마지막 턴!</span>
          )}
        </div>
        <div className="header-right">
          {me && <span className="my-score">{me.totalScore}점</span>}
          <button className="btn btn-ghost scoreboard-btn" onClick={() => setShowScoreboard(true)}>점수판 📊</button>
          <button className="btn btn-ghost scoreboard-btn" onClick={() => setShowCardLog(true)}>로그 📋</button>
          <MusicToggle />
        </div>
      </div>

      {/* Other Players */}
      <div className="other-players">
        {otherPlayers.map((p) => (
          <div
            key={p.id}
            className={`other-player ${p.id === gameState.currentTurnPlayerId ? 'active-turn' : ''} ${!p.connected ? 'disconnected' : ''}`}
          >
            <div className="other-info">
              <span className="other-avatar">{AVATARS[p.avatarIndex] || '🎴'}</span>
              <span className="other-name">{p.nickname}</span>
              <span className="other-score">{p.totalScore}점</span>
              {!p.connected && <span className="disconnect-badge">끊김</span>}
            </div>
            <OpponentCards
              cards={p.cards}
              cardCount={gameState.roomOptions.cardCount}
              playerCount={gameState.players.length}
            />
          </div>
        ))}
      </div>

      {/* Center Area: Piles only */}
      <div className="center-area">
        <div className="piles-area">
          <DrawPile
            count={gameState.drawPileCount}
            onClick={() => { playCardFlip(); onDrawFromPile(); }}
            highlighted={isMyTurn && myTurnPhase === 'draw_choice'}
            disabled={!isMyTurn || myTurnPhase !== 'draw_choice'}
          />
          <DiscardPile
            topCard={gameState.discardPileTop}
            count={gameState.discardPileCount}
            onClick={() => { playCardFlip(); onDrawFromDiscard(); }}
            highlighted={isMyTurn && myTurnPhase === 'draw_choice' && gameState.discardPileCount > 0}
            disabled={!isMyTurn || myTurnPhase !== 'draw_choice' || gameState.discardPileCount === 0}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="status-bar">
        <AnimatePresence mode="wait">
          <motion.span
            key={getStatusMessage()}
            className="status-text"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {getStatusMessage()}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Drawn Card Area + Action Buttons */}
      <AnimatePresence>
        {isMyTurn && drawnCard && (
          <motion.div
            className="drawn-area"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="drawn-card-display">
              <span className="drawn-label">뽑은 카드</span>
              <motion.div
                initial={{ rotateY: -90, scale: 0.7 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                style={{ perspective: 600 }}
              >
                <PlayingCard
                  suit={drawnCard.suit}
                  rank={drawnCard.rank}
                  faceUp={true}
                  size="lg"
                  selected
                />
              </motion.div>
            </div>

            {/* Thank You Button */}
            {myTurnPhase === 'thank_you' && (
              <motion.button
                className="btn thank-you-btn"
                onClick={() => { playThankYou(); onThankYouAck(); }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
              >
                땡큐! 🎉
              </motion.button>
            )}

            {/* Action Choice (draw from pile: swap or discard) */}
            {myTurnPhase === 'drawn_card_action' && drawSource === 'pile' && !actionMode && (
              <motion.div
                className="action-choice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <button className="btn btn-primary" onClick={() => setActionMode('swap')}>
                  교환하기
                </button>
                <button className="btn btn-outline" onClick={() => setActionMode('discard')}>
                  버리기
                </button>
              </motion.div>
            )}

            {/* Cancel action mode */}
            {actionMode && (
              <button className="btn btn-ghost" onClick={() => setActionMode(null)}>
                취소
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Cards */}
      <div className="my-cards-area">
        {gameState.phase === 'peeking' ? (
          <>
            <CardGrid
              cards={getPeekingCards()}
              cardCount={gameState.roomOptions.cardCount}
              onCardClick={!gameState.peekingDone ? handlePeekCard : undefined}
              selectablePositions={!gameState.peekingDone ? frontRowPositions : []}
              size="lg"
              isMe
              dealing={dealing}
            />
            {!gameState.peekingDone && (
              <button
                className="btn btn-primary"
                onClick={onPeekDone}
                style={{ marginTop: '8px' }}
              >
                확인 완료
              </button>
            )}
          </>
        ) : (
          <CardGrid
            cards={myCards}
            cardCount={gameState.roomOptions.cardCount}
            onCardClick={handleMyCardClick}
            selectablePositions={getSelectablePositions()}
            size="lg"
            isMe
            knownCards={getKnownCards()}
          />
        )}
      </div>

    </div>
  );
}
