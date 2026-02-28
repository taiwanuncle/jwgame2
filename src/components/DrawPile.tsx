import { useTranslation } from 'react-i18next';
import PlayingCard from './PlayingCard';
import './Piles.css';

interface Props {
  count: number;
  onClick?: () => void;
  highlighted?: boolean;
  disabled?: boolean;
}

export default function DrawPile({ count, onClick, highlighted = false, disabled = false }: Props) {
  const { t } = useTranslation();

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
      <span className="pile-count">{count}{t('lobby.cardsSuffix')}</span>
      <span className="pile-label">{t('game.drawPileLabel')}</span>
    </div>
  );
}
