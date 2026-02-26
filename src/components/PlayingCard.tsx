import { motion } from 'framer-motion';
import type { Suit, Rank } from '../types';
import './PlayingCard.css';

interface Props {
  suit?: Suit;
  rank?: Rank;
  faceUp: boolean;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dealDelay?: number;
  knownCard?: { suit: Suit; rank: Rank };
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '\u2660',
  heart: '\u2665',
  diamond: '\u2666',
  club: '\u2663',
};

function getCardImageUrl(suit: Suit, rank: Rank): string {
  return `/cards/${suit}_${rank}.png`;
}

export default function PlayingCard({
  suit,
  rank,
  faceUp,
  selected = false,
  highlighted = false,
  dimmed = false,
  onClick,
  disabled = false,
  size = 'md',
  className = '',
  dealDelay,
  knownCard,
}: Props) {
  const isRed = suit === 'heart' || suit === 'diamond';

  const cardClasses = [
    'playing-card',
    `card-${size}`,
    faceUp ? 'face-up' : 'face-down',
    isRed ? 'red' : 'black',
    selected ? 'selected' : '',
    highlighted ? 'highlighted' : '',
    dimmed ? 'dimmed' : '',
    disabled ? 'disabled' : '',
    onClick ? 'clickable' : '',
    className,
  ].filter(Boolean).join(' ');

  // Both faces are always rendered for 3D flip
  const cardContent = (
    <div className="card-flip-inner">
      {/* Front face (card image) — shown when face-up via rotateY(180deg) */}
      <div className="card-face-img">
        {suit && rank && (
          <img
            src={getCardImageUrl(suit, rank)}
            alt={`${rank}${SUIT_SYMBOLS[suit]}`}
            className="card-image"
            draggable={false}
          />
        )}
      </div>

      {/* Back face — shown by default */}
      <div className="card-back">
        <img
          src="/cards/back.png"
          alt="card back"
          className="back-image"
          draggable={false}
        />
        {knownCard && (
          <div className={`card-memo ${knownCard.suit === 'heart' || knownCard.suit === 'diamond' ? 'memo-red' : ''}`}>
            {knownCard.rank}{SUIT_SYMBOLS[knownCard.suit]}
          </div>
        )}
      </div>
    </div>
  );

  if (dealDelay !== undefined) {
    return (
      <motion.div
        className={cardClasses}
        onClick={!disabled ? onClick : undefined}
        initial={{ opacity: 0, y: 50, scale: 0.6, rotateZ: -5 + Math.random() * 10 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateZ: 0 }}
        transition={{
          duration: 0.4,
          delay: dealDelay,
          type: 'spring',
          stiffness: 220,
          damping: 22,
        }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses} onClick={!disabled ? onClick : undefined}>
      {cardContent}
    </div>
  );
}
