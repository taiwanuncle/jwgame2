import PlayingCard from './PlayingCard';
import './Piles.css';

interface Props {
  count: number;
  onClick?: () => void;
  highlighted?: boolean;
  disabled?: boolean;
}

export default function DrawPile({ count, onClick, highlighted = false, disabled = false }: Props) {
  return (
    <div className="pile draw-pile">
      <div className="pile-stack">
        {/* Stack effect: multiple cards behind */}
        {count > 2 && <div className="stack-card stack-3" />}
        {count > 1 && <div className="stack-card stack-2" />}
        <PlayingCard
          faceUp={false}
          size="lg"
          onClick={!disabled ? onClick : undefined}
          highlighted={highlighted}
          disabled={disabled || count === 0}
        />
      </div>
      <span className="pile-count">{count}장</span>
      <span className="pile-label">뽑기 더미</span>
    </div>
  );
}
