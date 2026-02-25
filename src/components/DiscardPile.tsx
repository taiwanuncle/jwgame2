import type { Card } from '../types';
import PlayingCard from './PlayingCard';
import './Piles.css';

interface Props {
  topCard: Card | null;
  count: number;
  onClick?: () => void;
  highlighted?: boolean;
  disabled?: boolean;
}

export default function DiscardPile({ topCard, count, onClick, highlighted = false, disabled = false }: Props) {
  return (
    <div className="pile discard-pile">
      <div className="pile-stack">
        {count > 2 && <div className="stack-card stack-3 face-stack" />}
        {count > 1 && <div className="stack-card stack-2 face-stack" />}
        {topCard ? (
          <PlayingCard
            suit={topCard.suit}
            rank={topCard.rank}
            faceUp={true}
            size="lg"
            onClick={!disabled ? onClick : undefined}
            highlighted={highlighted}
            disabled={disabled || count === 0}
          />
        ) : (
          <div className="empty-pile">
            <span className="empty-text">비어있음</span>
          </div>
        )}
      </div>
      <span className="pile-count">{count}장</span>
      <span className="pile-label">버린 카드</span>
    </div>
  );
}
