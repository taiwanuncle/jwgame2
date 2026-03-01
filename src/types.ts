// === Card Types ===
export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "spade_A", "spade_A_2" for second deck
}

export interface PlayerCard {
  card: Card | null;
  faceUp: boolean;
  position: number;
}

// === Player ===
export interface Player {
  id: string;
  nickname: string;
  avatarIndex: number;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
  cards: PlayerCard[];
  allFaceUp: boolean;
  roundScores: number[];
  totalScore: number;
  isBot?: boolean;
}

// === Room Options ===
export type GameMode = 'normal' | 'advanced';
export type CardCount = 4 | 6;
export type BotDifficulty = 'easy' | 'medium';

export interface RoomOptions {
  gameMode: GameMode;
  cardCount: CardCount;
  totalRounds: number;
  singlePlayerMode?: boolean;
  botCount?: number;
  botDifficulty?: BotDifficulty;
}

// === Game Phase ===
export type GamePhase =
  | 'lobby'
  | 'waiting'
  | 'peeking'
  | 'playing'
  | 'last_turn'
  | 'round_scoring'
  | 'round_result'
  | 'game_over';

// === Turn Phase ===
export type TurnPhase =
  | 'idle'
  | 'draw_choice'
  | 'thank_you'
  | 'drawn_card_action'
  | 'select_own_card'
  | 'turn_complete';

// === Action Log ===
export type ActionType =
  | 'draw_from_pile'
  | 'draw_from_discard'
  | 'swap_card'
  | 'discard_and_flip'
  | 'peek'
  | 'all_face_up';

export interface ActionLogEntry {
  playerId: string;
  playerName: string;
  action: ActionType;
  details: {
    drawnCard?: Card;
    discardedCard?: Card;
    swappedPosition?: number;
    flippedPosition?: number;
    revealedCard?: Card;
    fromPlayerId?: string | null;
    fromPlayerName?: string | null;
  };
  timestamp: number;
}

// === Source of drawn card ===
export type DrawSource = 'pile' | 'discard';

// === Game State from Server ===
export interface GameStateFromServer {
  roomCode: string;
  players: Player[];
  phase: GamePhase;
  roomOptions: RoomOptions;
  currentRound: number;
  currentTurnPlayerId: string | null;
  turnPhase: TurnPhase;
  dealerIndex: number;
  drawPileCount: number;
  discardPileTop: Card | null;
  discardPileCount: number;
  triggerPlayerId: string | null;
  lastTurnPlayersLeft: string[];
  actionLog: ActionLogEntry[];
  timerEnd: number | null;
  // Personalized fields
  myId?: string;
  myCards?: PlayerCard[];
  myDrawnCard?: Card | null;
  myDrawSource?: DrawSource | null;
  myTurnPhase?: TurnPhase;
  peekingDone?: boolean;
}

// === Round Result ===
export interface PairBonus {
  positions: [number, number];
  rank: Rank;
  saved: number;
}

export interface StraightBonus {
  positions: number[];
  bonus: number;
}

export interface PlayerRoundScore {
  playerId: string;
  nickname: string;
  cards: { card: Card; position: number }[];
  rawScore: number;
  pairBonuses: PairBonus[];
  straightBonus: StraightBonus | null;
  multiplier: number;
  finalScore: number;
}

export interface RoundResult {
  round: number;
  playerScores: PlayerRoundScore[];
  roundMultiplier: number;
}

// === Chat ===
export interface ChatMessage {
  playerId: string;
  nickname: string;
  avatarIndex: number;
  message: string;
  timestamp: number;
}

// === Available Room for Lobby ===
export interface AvailableRoom {
  roomCode: string;
  hostNickname: string;
  playerCount: number;
  maxPlayers: number;
  gameMode: GameMode;
  cardCount: CardCount;
  totalRounds: number;
}
