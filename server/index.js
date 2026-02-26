const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());

// Serve built frontend in production
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = new Map();
const MAX_PLAYERS = 10;
const TURN_TIMER_SECONDS = 30;

const BOT_NAMES = ["봇1", "봇2", "봇3", "봇4", "봇5", "봇6", "봇7", "봇8", "봇9"];

app.get("/api/status", (req, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

// ===== Utilities =====

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== Deck Creation =====

const SUITS = ["spade", "heart", "diamond", "club"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck(deckCount) {
  const deck = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          id: deckCount > 1 ? `${suit}_${rank}_${d + 1}` : `${suit}_${rank}`,
        });
      }
    }
  }
  return shuffleArray(deck);
}

// ===== Scoring =====

function getCardValue(rank) {
  switch (rank) {
    case "A": return 1;
    case "2": return 2;
    case "3": return 3;
    case "4": return 4;
    case "5": return 5;
    case "6": return 6;
    case "7": return 7;
    case "8": return 8;
    case "9": return 9;
    case "10": return 0;
    case "J": return 11;
    case "Q": return 12;
    case "K": return 0;
    default: return 0;
  }
}

function getRankOrder(rank) {
  const order = { "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13 };
  return order[rank] || 0;
}

// Find pairs: any two cards with the same rank (position-independent)
function findPairs(cards) {
  const pairs = [];
  const rankGroups = {};

  cards.forEach((c, i) => {
    if (!c.card) return;
    const r = c.card.rank;
    if (!rankGroups[r]) rankGroups[r] = [];
    rankGroups[r].push(i);
  });

  for (const rank of Object.keys(rankGroups)) {
    const positions = rankGroups[rank];
    for (let i = 0; i + 1 < positions.length; i += 2) {
      const saved = getCardValue(rank) * 2;
      pairs.push({
        positions: [positions[i], positions[i + 1]],
        rank,
        saved,
      });
    }
  }

  return pairs;
}

// Find best 4-card straight among cards (advanced mode)
function findStraight(cards) {
  if (cards.length < 4) return null;

  const validCards = cards.filter((c) => c.card);
  if (validCards.length < 4) return null;

  const combos = [];
  for (let i = 0; i < validCards.length; i++) {
    for (let j = i + 1; j < validCards.length; j++) {
      for (let k = j + 1; k < validCards.length; k++) {
        for (let l = k + 1; l < validCards.length; l++) {
          combos.push([validCards[i], validCards[j], validCards[k], validCards[l]]);
        }
      }
    }
  }

  let bestStraight = null;
  let bestBonus = 0;

  for (const combo of combos) {
    const values = combo.map((c) => getRankOrder(c.card.rank)).sort((a, b) => a - b);

    let isStraight = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        isStraight = false;
        break;
      }
    }

    if (!isStraight && values.includes(1)) {
      const altValues = values.map((v) => (v === 1 ? 14 : v)).sort((a, b) => a - b);
      isStraight = true;
      for (let i = 1; i < altValues.length; i++) {
        if (altValues[i] !== altValues[i - 1] + 1) {
          isStraight = false;
          break;
        }
      }
    }

    if (isStraight) {
      const sum = combo.reduce((acc, c) => acc + getCardValue(c.card.rank), 0);
      const bonus = -sum;
      if (bonus < bestBonus || bestStraight === null) {
        bestBonus = bonus;
        bestStraight = {
          positions: combo.map((c) => c.position),
          bonus,
        };
      }
    }
  }

  return bestStraight;
}

function calculateRoundScore(playerCards, cardCount, gameMode, currentRound, totalRounds) {
  let rawScore = 0;
  for (const pc of playerCards) {
    if (pc.card) rawScore += getCardValue(pc.card.rank);
  }

  const pairs = findPairs(playerCards);
  const pairedPositions = new Set();
  let pairSavings = 0;
  for (const pair of pairs) {
    pair.positions.forEach((p) => pairedPositions.add(p));
    pairSavings += pair.saved;
  }

  let score = rawScore - pairSavings;

  let straightBonus = null;
  if (gameMode === "advanced") {
    straightBonus = findStraight(playerCards);
    if (straightBonus) {
      score = straightBonus.bonus;
    }
  }

  let multiplier = 1;
  if (gameMode === "advanced") {
    if (currentRound === totalRounds) multiplier = 3;
    else if (currentRound === totalRounds - 1) multiplier = 2;
  }

  const finalScore = score * multiplier;

  return { rawScore, pairBonuses: pairs, straightBonus, multiplier, finalScore };
}

// ===== Room State Helpers =====

function sanitizeRoomForBroadcast(room) {
  return {
    roomCode: room.roomCode,
    players: room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatarIndex: p.avatarIndex,
      ready: p.ready,
      isHost: p.isHost,
      isBot: p.isBot || false,
      connected: p.connected,
      cards: p.cards.map((c) => ({
        faceUp: c.faceUp,
        card: c.faceUp ? c.card : null,
        position: c.position,
      })),
      allFaceUp: p.allFaceUp,
      roundScores: p.roundScores,
      totalScore: p.totalScore,
    })),
    phase: room.phase,
    roomOptions: room.roomOptions,
    currentRound: room.currentRound,
    currentTurnPlayerId: room.currentTurnPlayerId,
    turnPhase: room.turnPhase,
    dealerIndex: room.dealerIndex,
    drawPileCount: room.drawPile ? room.drawPile.length : 0,
    discardPileTop: room.discardPile && room.discardPile.length > 0
      ? room.discardPile[room.discardPile.length - 1]
      : null,
    discardPileCount: room.discardPile ? room.discardPile.length : 0,
    triggerPlayerId: room.triggerPlayerId,
    lastTurnPlayersLeft: room.lastTurnPlayersLeft || [],
    actionLog: (room.actionLog || []).slice(-20),
    timerEnd: room.timerEnd || null,
  };
}

function emitPersonalStates(room) {
  const broadcastState = sanitizeRoomForBroadcast(room);

  room.players.forEach((p) => {
    if (p.isBot) return; // Skip bots — no socket to emit to
    const personalState = {
      ...broadcastState,
      myId: p.id,
      myCards: p.cards.map((c) => ({
        card: c.card,
        faceUp: c.faceUp,
        position: c.position,
      })),
      myDrawnCard: p.drawnCard || null,
      myDrawSource: p.drawSource || null,
      myTurnPhase: p.id === room.currentTurnPlayerId ? room.turnPhase : "idle",
      peekingDone: p.peekingDone || false,
    };
    const sid = room.socketMap ? room.socketMap[p.id] : p.id;
    io.to(sid).emit("game_state", personalState);
  });
}

function broadcastRoomsToLobby() {
  const roomList = [];
  rooms.forEach((room) => {
    if (room.phase === "waiting" && !room.roomOptions.singlePlayerMode) {
      const host = room.players.find((p) => p.isHost);
      roomList.push({
        roomCode: room.roomCode,
        hostNickname: host ? host.nickname : "?",
        playerCount: room.players.length,
        maxPlayers: MAX_PLAYERS,
        gameMode: room.roomOptions.gameMode,
        cardCount: room.roomOptions.cardCount,
        totalRounds: room.roomOptions.totalRounds,
      });
    }
  });
  io.emit("rooms_updated", roomList);
}

function getRoomByPlayer(playerId) {
  for (const [, room] of rooms) {
    const player = room.players.find((p) => p.id === playerId);
    if (player) return room;
  }
  return null;
}

function getRoomBySocket(socketId) {
  for (const [, room] of rooms) {
    if (room.socketMap) {
      for (const [pid, sid] of Object.entries(room.socketMap)) {
        if (sid === socketId) return { room, playerId: pid };
      }
    }
  }
  return null;
}

// ===== Game Logic =====

function dealCards(room) {
  const cardCount = room.roomOptions.cardCount;
  const playerCount = room.players.length;
  const deckCount = playerCount <= 3 ? 1 : 2;
  room.drawPile = createDeck(deckCount);
  room.discardPile = [];

  room.players.forEach((p) => {
    p.cards = [];
    for (let i = 0; i < cardCount; i++) {
      const card = room.drawPile.shift();
      p.cards.push({
        card,
        faceUp: false,
        position: i,
      });
    }
    p.allFaceUp = false;
    p.drawnCard = null;
    p.drawSource = null;
    p.peekingDone = false;
  });

  const firstDiscard = room.drawPile.shift();
  room.discardPile.push(firstDiscard);
}

function getNextTurnPlayer(room, afterPlayerId) {
  const players = room.players;
  const currentIndex = players.findIndex((p) => p.id === afterPlayerId);
  const count = players.length;

  for (let i = 1; i <= count; i++) {
    const nextIndex = (currentIndex + i) % count;
    const nextPlayer = players[nextIndex];

    if (room.phase === "last_turn") {
      if (!room.lastTurnPlayersLeft.includes(nextPlayer.id)) continue;
    }

    if (nextPlayer.connected || nextPlayer.isBot) return nextPlayer;
  }
  return null;
}

function checkAllFaceUp(player) {
  return player.cards.every((c) => c.faceUp);
}

function endTurn(room) {
  clearTurnTimer(room);

  const currentPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  if (!currentPlayer) return;

  currentPlayer.drawnCard = null;
  currentPlayer.drawSource = null;

  currentPlayer.allFaceUp = checkAllFaceUp(currentPlayer);

  if (currentPlayer.allFaceUp && !room.triggerPlayerId) {
    room.triggerPlayerId = currentPlayer.id;
    room.phase = "last_turn";
    room.lastTurnPlayersLeft = room.players
      .filter((p) => p.id !== currentPlayer.id && (p.connected || p.isBot))
      .map((p) => p.id);

    room.actionLog.push({
      playerId: currentPlayer.id,
      playerName: currentPlayer.nickname,
      action: "all_face_up",
      details: {},
      timestamp: Date.now(),
    });
  }

  if (room.phase === "last_turn") {
    room.lastTurnPlayersLeft = room.lastTurnPlayersLeft.filter(
      (id) => id !== currentPlayer.id
    );

    if (room.lastTurnPlayersLeft.length === 0) {
      finishRound(room);
      return;
    }
  }

  const nextPlayer = getNextTurnPlayer(room, currentPlayer.id);
  if (nextPlayer) {
    room.currentTurnPlayerId = nextPlayer.id;
    room.turnPhase = "draw_choice";
  } else {
    finishRound(room);
    return;
  }

  startTurnTimer(room);
  emitPersonalStates(room);
  scheduleBotTurnIfNeeded(room);
}

function finishRound(room) {
  clearTurnTimer(room);
  room.players.forEach((p) => {
    p.cards.forEach((c) => {
      c.faceUp = true;
    });
    p.allFaceUp = true;
  });

  const playerScores = room.players.map((p) => {
    const result = calculateRoundScore(
      p.cards,
      room.roomOptions.cardCount,
      room.roomOptions.gameMode,
      room.currentRound,
      room.roomOptions.totalRounds
    );

    p.roundScores.push(result.finalScore);
    p.totalScore += result.finalScore;

    return {
      playerId: p.id,
      nickname: p.nickname,
      cards: p.cards.map((c) => ({ card: c.card, position: c.position })),
      rawScore: result.rawScore,
      pairBonuses: result.pairBonuses,
      straightBonus: result.straightBonus,
      multiplier: result.multiplier,
      finalScore: result.finalScore,
    };
  });

  const roundResult = {
    round: room.currentRound,
    playerScores,
    roundMultiplier: playerScores.length > 0 ? playerScores[0].multiplier : 1,
  };

  room.phase = "round_scoring";
  room.turnPhase = "idle";
  room.currentTurnPlayerId = null;
  room.triggerPlayerId = null;
  room.lastTurnPlayersLeft = [];

  io.to(room.roomCode).emit("round_result", roundResult);
  emitPersonalStates(room);
}

function refillDrawPile(room) {
  if (room.drawPile.length > 0) return;
  if (room.discardPile.length <= 1) return;

  const topCard = room.discardPile.pop();
  room.drawPile = shuffleArray(room.discardPile);
  room.discardPile = [topCard];
}

function startNextRound(room) {
  if (room.currentRound >= room.roomOptions.totalRounds) {
    room.phase = "game_over";
    emitPersonalStates(room);
    return;
  }

  room.currentRound += 1;
  room.actionLog = [];

  const sortedPlayers = [...room.players].sort((a, b) => {
    if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
    return Math.random() - 0.5;
  });
  const newDealer = sortedPlayers[0];
  room.dealerIndex = room.players.findIndex((p) => p.id === newDealer.id);

  dealCards(room);
  room.phase = "peeking";
  room.turnPhase = "idle";
  room.currentTurnPlayerId = null;
  room.triggerPlayerId = null;
  room.lastTurnPlayersLeft = [];

  // Bots auto-complete peeking
  room.players.forEach((p) => {
    if (p.isBot) p.peekingDone = true;
  });

  emitPersonalStates(room);
}

// ===== Internal Action Functions =====

function drawFromPileInternal(room, playerId) {
  if (room.currentTurnPlayerId !== playerId) return false;
  if (room.turnPhase !== "draw_choice") return false;

  refillDrawPile(room);
  if (room.drawPile.length === 0) return false;

  const player = room.players.find((p) => p.id === playerId);
  const card = room.drawPile.shift();
  player.drawnCard = card;
  player.drawSource = "pile";
  room.turnPhase = "drawn_card_action";

  if (!player.isBot) startTurnTimer(room); // Reset timer on action

  room.actionLog.push({
    playerId,
    playerName: player.nickname,
    action: "draw_from_pile",
    details: {},
    timestamp: Date.now(),
  });

  emitPersonalStates(room);
  return true;
}

function drawFromDiscardInternal(room, playerId) {
  if (room.currentTurnPlayerId !== playerId) return false;
  if (room.turnPhase !== "draw_choice") return false;
  if (room.discardPile.length === 0) return false;

  const player = room.players.find((p) => p.id === playerId);
  const card = room.discardPile.pop();
  player.drawnCard = card;
  player.drawSource = "discard";
  room.turnPhase = "thank_you";

  if (!player.isBot) startTurnTimer(room); // Reset timer on action

  room.actionLog.push({
    playerId,
    playerName: player.nickname,
    action: "draw_from_discard",
    details: { drawnCard: card },
    timestamp: Date.now(),
  });

  emitPersonalStates(room);
  return true;
}

function thankYouAckInternal(room, playerId) {
  if (room.currentTurnPlayerId !== playerId) return false;
  if (room.turnPhase !== "thank_you") return false;

  const player = room.players.find((p) => p.id === playerId);
  room.turnPhase = "select_own_card";
  if (player && !player.isBot) startTurnTimer(room); // Reset timer on action
  emitPersonalStates(room);
  return true;
}

function swapCardInternal(room, playerId, position) {
  if (room.currentTurnPlayerId !== playerId) return false;
  if (room.turnPhase !== "drawn_card_action" && room.turnPhase !== "select_own_card") return false;

  const player = room.players.find((p) => p.id === playerId);
  if (!player.drawnCard) return false;

  const targetSlot = player.cards.find((c) => c.position === position);
  if (!targetSlot) return false;

  const replacedCard = targetSlot.card;
  room.discardPile.push(replacedCard);
  targetSlot.card = player.drawnCard;
  targetSlot.faceUp = true;

  room.actionLog.push({
    playerId,
    playerName: player.nickname,
    action: "swap_card",
    details: {
      swappedPosition: position,
      discardedCard: replacedCard,
      revealedCard: player.drawnCard,
    },
    timestamp: Date.now(),
  });

  endTurn(room);
  return true;
}

function discardAndFlipInternal(room, playerId, flipPosition) {
  if (room.currentTurnPlayerId !== playerId) return false;
  if (room.turnPhase !== "drawn_card_action") return false;

  const player = room.players.find((p) => p.id === playerId);
  if (!player.drawnCard) return false;
  if (player.drawSource === "discard") return false;

  const targetSlot = player.cards.find((c) => c.position === flipPosition);
  if (!targetSlot || targetSlot.faceUp) return false;

  room.discardPile.push(player.drawnCard);
  targetSlot.faceUp = true;

  room.actionLog.push({
    playerId,
    playerName: player.nickname,
    action: "discard_and_flip",
    details: {
      discardedCard: player.drawnCard,
      flippedPosition: flipPosition,
      revealedCard: targetSlot.card,
    },
    timestamp: Date.now(),
  });

  endTurn(room);
  return true;
}

// ===== Turn Timer =====

function clearTurnTimer(room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  room.timerEnd = null;
}

function startTurnTimer(room) {
  clearTurnTimer(room);

  const currentPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  if (!currentPlayer || currentPlayer.isBot) return; // No timer for bots

  // Disconnected player: auto-play after 1 second instead of full timer
  if (!currentPlayer.connected) {
    room.timerEnd = Date.now() + 1000;
    room.turnTimer = setTimeout(() => {
      if (!rooms.has(room.roomCode)) return;
      if (room.currentTurnPlayerId !== currentPlayer.id) return;
      handleTimerExpired(room, currentPlayer);
    }, 1000);
    return;
  }

  room.timerEnd = Date.now() + TURN_TIMER_SECONDS * 1000;

  room.turnTimer = setTimeout(() => {
    if (!rooms.has(room.roomCode)) return;
    if (room.currentTurnPlayerId !== currentPlayer.id) return;
    handleTimerExpired(room, currentPlayer);
  }, TURN_TIMER_SECONDS * 1000);
}

function handleTimerExpired(room, player) {
  clearTurnTimer(room);
  const playerId = player.id;

  // Auto-play based on current turn phase
  if (room.turnPhase === "draw_choice") {
    // Auto draw from pile, then auto discard+flip
    drawFromPileInternal(room, playerId);
    const faceDown = player.cards.filter((c) => !c.faceUp);
    if (faceDown.length > 0) {
      const pick = faceDown[Math.floor(Math.random() * faceDown.length)];
      discardAndFlipInternal(room, playerId, pick.position);
    } else {
      const randomPos = Math.floor(Math.random() * player.cards.length);
      swapCardInternal(room, playerId, randomPos);
    }
  } else if (room.turnPhase === "thank_you") {
    thankYouAckInternal(room, playerId);
    // Then auto swap with random position
    const randomPos = Math.floor(Math.random() * player.cards.length);
    swapCardInternal(room, playerId, randomPos);
  } else if (room.turnPhase === "drawn_card_action") {
    // Has a drawn card, auto discard+flip or swap
    if (player.drawSource === "discard") {
      const randomPos = Math.floor(Math.random() * player.cards.length);
      swapCardInternal(room, playerId, randomPos);
    } else {
      const faceDown = player.cards.filter((c) => !c.faceUp);
      if (faceDown.length > 0) {
        const pick = faceDown[Math.floor(Math.random() * faceDown.length)];
        discardAndFlipInternal(room, playerId, pick.position);
      } else {
        const randomPos = Math.floor(Math.random() * player.cards.length);
        swapCardInternal(room, playerId, randomPos);
      }
    }
  } else if (room.turnPhase === "select_own_card") {
    const randomPos = Math.floor(Math.random() * player.cards.length);
    swapCardInternal(room, playerId, randomPos);
  }
}

// ===== Bot AI =====

function scheduleBotTurnIfNeeded(room) {
  if (!rooms.has(room.roomCode)) return;
  if (room.phase !== "playing" && room.phase !== "last_turn") return;

  const currentPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  if (!currentPlayer || !currentPlayer.isBot) return;

  const delay = 1000 + Math.random() * 1000;
  setTimeout(() => {
    if (!rooms.has(room.roomCode)) return;
    if (room.currentTurnPlayerId !== currentPlayer.id) return;
    executeBotTurn(room);
  }, delay);
}

function executeBotTurn(room) {
  const botPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  if (!botPlayer || !botPlayer.isBot) return;

  const difficulty = room.roomOptions.botDifficulty || "easy";
  if (difficulty === "medium") {
    botTurnMedium(room, botPlayer);
  } else {
    botTurnEasy(room, botPlayer);
  }
}

function botTurnEasy(room, botPlayer) {
  const playerId = botPlayer.id;
  const roomCode = room.roomCode;

  // 30% chance draw from discard, 70% from pile
  const drawFromDiscard = Math.random() < 0.3 && room.discardPile.length > 0;

  if (drawFromDiscard) {
    drawFromDiscardInternal(room, playerId);
    setTimeout(() => {
      if (!rooms.has(roomCode) || room.currentTurnPlayerId !== playerId) return;
      thankYouAckInternal(room, playerId);
      setTimeout(() => {
        if (!rooms.has(roomCode) || room.currentTurnPlayerId !== playerId) return;
        const randomPos = Math.floor(Math.random() * botPlayer.cards.length);
        swapCardInternal(room, playerId, randomPos);
      }, 600 + Math.random() * 400);
    }, 600 + Math.random() * 400);
  } else {
    drawFromPileInternal(room, playerId);
    setTimeout(() => {
      if (!rooms.has(roomCode) || room.currentTurnPlayerId !== playerId) return;
      const doSwap = Math.random() < 0.5;
      if (doSwap) {
        const randomPos = Math.floor(Math.random() * botPlayer.cards.length);
        swapCardInternal(room, playerId, randomPos);
      } else {
        const faceDownCards = botPlayer.cards.filter((c) => !c.faceUp);
        if (faceDownCards.length > 0) {
          const pick = faceDownCards[Math.floor(Math.random() * faceDownCards.length)];
          discardAndFlipInternal(room, playerId, pick.position);
        } else {
          const randomPos = Math.floor(Math.random() * botPlayer.cards.length);
          swapCardInternal(room, playerId, randomPos);
        }
      }
    }, 600 + Math.random() * 400);
  }
}

function botFindPairTarget(cards, rank) {
  // Find a known card with same rank to pair with
  return cards.find((c) => c.faceUp && c.card && c.card.rank === rank);
}

function botFindSwapTarget(cards, drawnRank, drawnValue) {
  // Priority 1: Pair — find a known card with same rank, swap its non-paired neighbor
  const pairMatch = botFindPairTarget(cards, drawnRank);
  if (pairMatch) {
    // Find the worst non-paired card to replace
    let worstPos = -1;
    let worstVal = -1;
    for (const c of cards) {
      if (c.position === pairMatch.position) continue; // Don't swap the pair partner
      const v = c.faceUp && c.card ? getCardValue(c.card.rank) : 6;
      if (v > worstVal) {
        worstVal = v;
        worstPos = c.position;
      }
    }
    return worstPos >= 0 ? worstPos : cards[0].position;
  }

  // Priority 2: Swap with the worst known card (if drawn is better)
  let worstPos = 0;
  let worstValue = -1;
  for (const c of cards) {
    const v = c.faceUp && c.card ? getCardValue(c.card.rank) : 6;
    if (v > worstValue) {
      worstValue = v;
      worstPos = c.position;
    }
  }
  return worstPos;
}

function botTurnMedium(room, botPlayer) {
  const playerId = botPlayer.id;
  const roomCode = room.roomCode;
  const cards = botPlayer.cards;

  const knownCards = cards.filter((c) => c.faceUp);
  const unknownCards = cards.filter((c) => !c.faceUp);

  const discardTop =
    room.discardPile.length > 0
      ? room.discardPile[room.discardPile.length - 1]
      : null;
  const discardValue = discardTop ? getCardValue(discardTop.rank) : 99;

  // Check if discard creates a pair
  let discardCreatesPair = false;
  if (discardTop) {
    discardCreatesPair = knownCards.some(
      (c) => c.card && c.card.rank === discardTop.rank
    );
  }

  // Check if discard is 10 or K (0 points — always great)
  const discardIsZero = discardTop && (discardTop.rank === "10" || discardTop.rank === "K");

  const takeDiscard =
    discardTop &&
    (discardCreatesPair || discardIsZero || discardValue <= 3) &&
    room.discardPile.length > 0;

  if (takeDiscard) {
    drawFromDiscardInternal(room, playerId);
    setTimeout(() => {
      if (!rooms.has(roomCode) || room.currentTurnPlayerId !== playerId) return;
      thankYouAckInternal(room, playerId);
      setTimeout(() => {
        if (!rooms.has(roomCode) || room.currentTurnPlayerId !== playerId) return;
        const targetPos = botFindSwapTarget(cards, discardTop.rank, discardValue);
        swapCardInternal(room, playerId, targetPos);
      }, 600 + Math.random() * 400);
    }, 600 + Math.random() * 400);
  } else {
    drawFromPileInternal(room, playerId);
    setTimeout(() => {
      if (!rooms.has(roomCode) || room.currentTurnPlayerId !== playerId) return;

      const drawnCard = botPlayer.drawnCard;
      if (!drawnCard) return;
      const drawnValue = getCardValue(drawnCard.rank);
      const drawnRank = drawnCard.rank;

      // Check if drawn card creates a pair
      const drawnCreatesPair = knownCards.some(
        (c) => c.card && c.card.rank === drawnRank
      );
      const drawnIsZero = drawnRank === "10" || drawnRank === "K";

      // Find worst card
      let worstPos = 0;
      let worstValue = -1;
      for (const c of cards) {
        const v = c.faceUp && c.card ? getCardValue(c.card.rank) : 6;
        if (v > worstValue) {
          worstValue = v;
          worstPos = c.position;
        }
      }

      if (drawnCreatesPair || drawnIsZero || (drawnValue <= 4 && worstValue > drawnValue)) {
        // Good card — swap smartly
        const targetPos = botFindSwapTarget(cards, drawnRank, drawnValue);
        swapCardInternal(room, playerId, targetPos);
      } else {
        // Bad card — discard and flip unknown
        if (unknownCards.length > 0) {
          const pick = unknownCards[Math.floor(Math.random() * unknownCards.length)];
          discardAndFlipInternal(room, playerId, pick.position);
        } else {
          if (drawnValue < worstValue) {
            swapCardInternal(room, playerId, worstPos);
          } else {
            // Discard not possible (all face up) — swap worst
            swapCardInternal(room, playerId, worstPos);
          }
        }
      }
    }, 600 + Math.random() * 400);
  }
}

// ===== Single Player =====

function autoStartSinglePlayer(room) {
  room.players.forEach((p) => {
    p.roundScores = [];
    p.totalScore = 0;
    p.ready = false;
  });

  room.currentRound = 1;
  room.dealerIndex = 0;
  room.actionLog = [];

  dealCards(room);
  room.phase = "peeking";
  room.turnPhase = "idle";
  room.currentTurnPlayerId = null;
  room.triggerPlayerId = null;
  room.lastTurnPlayersLeft = [];

  // Bots auto-complete peeking
  room.players.forEach((p) => {
    if (p.isBot) p.peekingDone = true;
  });

  emitPersonalStates(room);
}

// ===== Socket Handlers =====

io.on("connection", (socket) => {
  // --- Get room list ---
  socket.on("get_rooms", () => {
    const roomList = [];
    rooms.forEach((room) => {
      if (room.phase === "waiting" && !room.roomOptions.singlePlayerMode) {
        const host = room.players.find((p) => p.isHost);
        roomList.push({
          roomCode: room.roomCode,
          hostNickname: host ? host.nickname : "?",
          playerCount: room.players.length,
          maxPlayers: MAX_PLAYERS,
          gameMode: room.roomOptions.gameMode,
          cardCount: room.roomOptions.cardCount,
          totalRounds: room.roomOptions.totalRounds,
        });
      }
    });
    socket.emit("rooms_updated", roomList);
  });

  // --- Create room ---
  socket.on("create_room", ({ nickname, avatarIndex, options }) => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    const persistentId = uuidv4();
    const isSinglePlayer = !!(options && options.singlePlayerMode);

    const room = {
      roomCode,
      roomOptions: {
        gameMode: (options && options.gameMode) || "normal",
        cardCount: (options && options.cardCount) || 4,
        totalRounds: (options && options.totalRounds) || 2,
        singlePlayerMode: isSinglePlayer,
        botCount: (options && options.botCount) || 0,
        botDifficulty: (options && options.botDifficulty) || "easy",
      },
      players: [
        {
          id: persistentId,
          nickname,
          avatarIndex,
          ready: false,
          isHost: true,
          isBot: false,
          connected: true,
          cards: [],
          allFaceUp: false,
          roundScores: [],
          totalScore: 0,
          drawnCard: null,
          drawSource: null,
          peekingDone: false,
        },
      ],
      socketMap: { [persistentId]: socket.id },
      phase: "waiting",
      currentRound: 0,
      currentTurnPlayerId: null,
      turnPhase: "idle",
      dealerIndex: 0,
      drawPile: [],
      discardPile: [],
      triggerPlayerId: null,
      lastTurnPlayersLeft: [],
      actionLog: [],
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit("room_created", { persistentId, roomCode });

    // Add bots if requested (single player or multiplayer with bots)
    const botCount = room.roomOptions.botCount || 0;
    if (botCount > 0) {
      for (let i = 0; i < botCount; i++) {
        room.players.push({
          id: `bot_${uuidv4()}`,
          nickname: BOT_NAMES[i],
          avatarIndex: (avatarIndex + i + 1) % 12,
          ready: true,
          isHost: false,
          isBot: true,
          connected: true,
          cards: [],
          allFaceUp: false,
          roundScores: [],
          totalScore: 0,
          drawnCard: null,
          drawSource: null,
          peekingDone: false,
        });
      }
    }

    if (isSinglePlayer) {
      adjustRounds(room);
      autoStartSinglePlayer(room);
    } else {
      if (botCount > 0) adjustRounds(room);
      emitPersonalStates(room);
      broadcastRoomsToLobby();
    }
  });

  // --- Join room ---
  socket.on("join_room", ({ roomCode, nickname, avatarIndex }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("error_msg", { message: "방을 찾을 수 없습니다" });
      return;
    }
    if (room.phase !== "waiting") {
      socket.emit("error_msg", { message: "이미 게임이 진행중입니다" });
      return;
    }
    if (room.players.length >= MAX_PLAYERS) {
      socket.emit("error_msg", { message: "방이 가득 찼습니다" });
      return;
    }

    const persistentId = uuidv4();

    room.players.push({
      id: persistentId,
      nickname,
      avatarIndex,
      ready: false,
      isHost: false,
      isBot: false,
      connected: true,
      cards: [],
      allFaceUp: false,
      roundScores: [],
      totalScore: 0,
      drawnCard: null,
      drawSource: null,
      peekingDone: false,
    });

    room.socketMap[persistentId] = socket.id;
    socket.join(roomCode);

    adjustRounds(room);

    socket.emit("room_joined", { persistentId, roomCode });
    emitPersonalStates(room);
    broadcastRoomsToLobby();
  });

  // --- Rejoin room ---
  socket.on("rejoin_room", ({ roomCode, persistentId }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("error_msg", { message: "방을 찾을 수 없습니다" });
      return;
    }
    const player = room.players.find((p) => p.id === persistentId);
    if (!player) {
      socket.emit("error_msg", { message: "플레이어를 찾을 수 없습니다" });
      return;
    }

    player.connected = true;
    room.socketMap[persistentId] = socket.id;
    socket.join(roomCode);

    socket.emit("rejoin_success", { persistentId, roomCode });
    emitPersonalStates(room);
  });

  // --- Toggle ready ---
  socket.on("toggle_ready", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isHost) return;
    player.ready = !player.ready;
    emitPersonalStates(room);
  });

  // --- Set room options ---
  socket.on("set_room_options", (options) => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.isHost || room.phase !== "waiting") return;

    if (options.gameMode) room.roomOptions.gameMode = options.gameMode;
    if (options.cardCount) room.roomOptions.cardCount = options.cardCount;
    if (options.totalRounds) room.roomOptions.totalRounds = options.totalRounds;

    emitPersonalStates(room);
    broadcastRoomsToLobby();
  });

  // --- Start game ---
  socket.on("start_game", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.isHost) return;
    if (room.roomOptions.singlePlayerMode) return; // Single player auto-starts
    if (room.players.length < 2) return;

    const allReady = room.players.filter((p) => !p.isHost).every((p) => p.ready);
    if (!allReady) return;

    room.players.forEach((p) => {
      p.roundScores = [];
      p.totalScore = 0;
      p.ready = false;
    });

    room.currentRound = 1;
    room.dealerIndex = 0;
    room.actionLog = [];

    dealCards(room);
    room.phase = "peeking";
    room.turnPhase = "idle";
    room.currentTurnPlayerId = null;
    room.triggerPlayerId = null;
    room.lastTurnPlayersLeft = [];

    // Bots auto-complete peeking
    room.players.forEach((p) => {
      if (p.isBot) p.peekingDone = true;
    });

    io.to(room.roomCode).emit("game_started");
    emitPersonalStates(room);
    broadcastRoomsToLobby();
  });

  // --- Peek done ---
  socket.on("peek_done", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    if (room.phase !== "peeking") return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    player.peekingDone = true;

    const allDone = room.players.every((p) => p.peekingDone || !p.connected);
    if (allDone) {
      room.phase = "playing";
      const firstPlayer = getNextTurnPlayer(room, room.players[room.dealerIndex].id);
      if (firstPlayer) {
        room.currentTurnPlayerId = firstPlayer.id;
        room.turnPhase = "draw_choice";
        startTurnTimer(room);
      }
    }

    emitPersonalStates(room);

    if (allDone) {
      scheduleBotTurnIfNeeded(room);
    }
  });

  // --- Draw from pile ---
  socket.on("draw_from_pile", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    drawFromPileInternal(room, playerId);
  });

  // --- Draw from discard ---
  socket.on("draw_from_discard", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    drawFromDiscardInternal(room, playerId);
  });

  // --- Thank you ack ---
  socket.on("thank_you_ack", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    thankYouAckInternal(room, playerId);
  });

  // --- Swap card ---
  socket.on("swap_card", ({ position }) => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    swapCardInternal(room, playerId, position);
  });

  // --- Discard and flip ---
  socket.on("discard_and_flip", ({ flipPosition }) => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    discardAndFlipInternal(room, playerId, flipPosition);
  });

  // --- Next round ---
  socket.on("next_round", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.isHost) return;
    if (room.phase !== "round_scoring" && room.phase !== "round_result") return;

    startNextRound(room);
  });

  // --- Play again ---
  socket.on("play_again", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.isHost) return;
    if (room.phase !== "game_over") return;

    if (room.roomOptions.singlePlayerMode) {
      autoStartSinglePlayer(room);
    } else {
      room.players.forEach((p) => {
        p.roundScores = [];
        p.totalScore = 0;
        p.ready = false;
        p.cards = [];
        p.allFaceUp = false;
        if (p.isBot) p.ready = true; // Bots always ready
      });

      room.phase = "waiting";
      room.currentRound = 0;
      room.actionLog = [];

      emitPersonalStates(room);
      broadcastRoomsToLobby();
    }
  });

  // --- Leave room ---
  socket.on("leave_room", () => {
    handleLeave(socket);
  });

  // --- Chat ---
  socket.on("send_chat", ({ message }) => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    io.to(room.roomCode).emit("chat_message", {
      playerId,
      nickname: player.nickname,
      avatarIndex: player.avatarIndex,
      message: message.slice(0, 200),
      timestamp: Date.now(),
    });
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    const result = getRoomBySocket(socket.id);
    if (!result) return;
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.connected = false;

    // Single player: human disconnect = remove room
    if (room.roomOptions.singlePlayerMode) {
      clearTurnTimer(room);
      rooms.delete(room.roomCode);
      return;
    }

    if (room.phase === "waiting") {
      room.players = room.players.filter((p) => p.id !== playerId);
      delete room.socketMap[playerId];

      if (room.players.length === 0) {
        rooms.delete(room.roomCode);
      } else {
        if (!room.players.some((p) => p.isHost)) {
          room.players[0].isHost = true;
        }
        adjustRounds(room);
        emitPersonalStates(room);
      }
      broadcastRoomsToLobby();
      return;
    }

    // If it's the disconnected player's turn, auto-play immediately
    if (room.currentTurnPlayerId === playerId &&
        (room.phase === "playing" || room.phase === "last_turn")) {
      clearTurnTimer(room);
      setTimeout(() => {
        if (!rooms.has(room.roomCode)) return;
        if (room.currentTurnPlayerId !== playerId) return;
        handleTimerExpired(room, player);
      }, 1000); // 1 second delay for visual feedback
    }

    // If all human players in peeking phase have peeked or disconnected, proceed
    if (room.phase === "peeking") {
      const allHumansDone = room.players
        .filter((p) => !p.isBot)
        .every((p) => p.peekingDone || !p.connected);
      if (allHumansDone) {
        room.players.forEach((p) => { p.peekingDone = true; });
        const firstPlayer = getNextTurnPlayer(room, room.players[room.dealerIndex].id);
        if (firstPlayer) {
          room.phase = "playing";
          room.currentTurnPlayerId = firstPlayer.id;
          room.turnPhase = "draw_choice";
          startTurnTimer(room);
        }
        emitPersonalStates(room);
        scheduleBotTurnIfNeeded(room);
        return;
      }
    }

    emitPersonalStates(room);

    const allDisconnected = room.players.every((p) => !p.connected && !p.isBot);
    if (allDisconnected) {
      setTimeout(() => {
        const existingRoom = rooms.get(room.roomCode);
        if (existingRoom && existingRoom.players.every((p) => !p.connected && !p.isBot)) {
          clearTurnTimer(existingRoom);
          rooms.delete(room.roomCode);
          broadcastRoomsToLobby();
        }
      }, 60000);
    }
  });
});

function handleLeave(socket) {
  const result = getRoomBySocket(socket.id);
  if (!result) return;
  const { room, playerId } = result;

  socket.leave(room.roomCode);

  // Single player: human leaving = delete room
  if (room.roomOptions.singlePlayerMode) {
    clearTurnTimer(room);
    room.players = room.players.filter((p) => p.id !== playerId);
    delete room.socketMap[playerId];
    rooms.delete(room.roomCode);
    return;
  }

  room.players = room.players.filter((p) => p.id !== playerId);
  delete room.socketMap[playerId];

  if (room.players.length === 0) {
    rooms.delete(room.roomCode);
  } else {
    if (!room.players.some((p) => p.isHost)) {
      room.players[0].isHost = true;
    }
    if (room.phase === "waiting") {
      adjustRounds(room);
    }
    emitPersonalStates(room);
  }

  broadcastRoomsToLobby();
}

function adjustRounds(room) {
  if (room.phase !== "waiting") return;
  const count = room.players.length;
  if (count < 1) return;
  if (room.roomOptions.totalRounds % count !== 0) {
    const nearest = Math.round(room.roomOptions.totalRounds / count) * count;
    room.roomOptions.totalRounds = Math.max(count, Math.min(count * 5, nearest || count));
  }
}

// SPA fallback — serve index.html for all non-API/non-socket routes
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Golf Card Game server running on port ${PORT}`);
});
