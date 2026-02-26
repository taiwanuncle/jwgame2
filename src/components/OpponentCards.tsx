import type { PlayerCard, CardCount, Suit } from '../types';
import './OpponentCards.css';

interface Props {
  cards: PlayerCard[];
  cardCount: CardCount;
  playerCount: number;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '\u2660',
  heart: '\u2665',
  diamond: '\u2666',
  club: '\u2663',
};

export default function OpponentCards({ cards, cardCount, playerCount }: Props) {
  const cols = cardCount === 4 ? 2 : 3;
  const topRow = cards.filter((c) => c.position < cols);
  const bottomRow = cards.filter((c) => c.position >= cols);

  // Responsive size class based on player count
  const sizeClass = playerCount >= 5 ? 'opc-xs' : playerCount >= 3 ? 'opc-sm' : 'opc-md';

  const renderSlot = (pc: PlayerCard) => {
    if (pc.faceUp && pc.card) {
      const isRed = pc.card.suit === 'heart' || pc.card.suit === 'diamond';
      return (
        <div key={pc.position} className={`opc-slot opc-face-up ${isRed ? 'opc-red' : 'opc-black'}`}>
          <span className="opc-rank">{pc.card.rank}</span>
          <span className="opc-suit">{SUIT_SYMBOLS[pc.card.suit]}</span>
        </div>
      );
    }
    return (
      <div key={pc.position} className="opc-slot opc-face-down">
        <span className="opc-hidden">?</span>
      </div>
    );
  };

  return (
    <div className={`opponent-cards ${sizeClass}`}>
      <div className="opc-row">
        {topRow.map(renderSlot)}
      </div>
      <div className="opc-row">
        {bottomRow.map(renderSlot)}
      </div>
    </div>
  );
}
