import type { PlayerCard, CardCount, Suit, Rank } from '../types';
import PlayingCard from './PlayingCard';
import './CardGrid.css';

interface Props {
  cards: PlayerCard[];
  cardCount: CardCount;
  onCardClick?: (position: number) => void;
  selectablePositions?: number[];
  highlightedPositions?: number[];
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  isMe?: boolean;
  dealing?: boolean;
  knownCards?: Map<number, { suit: Suit; rank: Rank }>;
}

export default function CardGrid({
  cards,
  cardCount,
  onCardClick,
  selectablePositions = [],
  highlightedPositions = [],
  size = 'md',
  label,
  isMe = false,
  dealing = false,
  knownCards,
}: Props) {
  const cols = cardCount === 4 ? 2 : 3;

  // Split into rows: top row (back/hidden) and bottom row (front/peeked)
  const topRow = cards.filter((c) => c.position < cols);
  const bottomRow = cards.filter((c) => c.position >= cols);

  const renderCard = (pc: PlayerCard, _index: number) => {
    const isSelectable = selectablePositions.includes(pc.position);
    const isHighlighted = highlightedPositions.includes(pc.position);
    const known = !pc.faceUp ? knownCards?.get(pc.position) : undefined;

    return (
      <PlayingCard
        key={pc.position}
        suit={pc.card?.suit}
        rank={pc.card?.rank}
        faceUp={pc.faceUp}
        size={size}
        highlighted={isHighlighted}
        onClick={isSelectable && onCardClick ? () => onCardClick(pc.position) : undefined}
        disabled={!isSelectable}
        className={isSelectable ? 'selectable' : ''}
        dealDelay={dealing ? pc.position * 0.12 + 0.1 : undefined}
        knownCard={known}
      />
    );
  };

  return (
    <div className={`card-grid ${isMe ? 'my-grid' : 'other-grid'}`}>
      {label && <div className="grid-label">{label}</div>}
      <div className="grid-row top-row">
        {topRow.map((pc, i) => renderCard(pc, i))}
      </div>
      <div className="grid-row bottom-row">
        {bottomRow.map((pc, i) => renderCard(pc, i))}
      </div>
    </div>
  );
}
