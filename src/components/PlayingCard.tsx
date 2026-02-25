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

// Number of suit symbols to show in the center based on rank
function getSuitLayout(rank: Rank): { rows: number[][]; large?: boolean; face?: string } {
  switch (rank) {
    case 'A': return { rows: [[1]], large: true };
    case '2': return { rows: [[1], [1]] };
    case '3': return { rows: [[1], [1], [1]] };
    case '4': return { rows: [[2], [2]] };
    case '5': return { rows: [[2], [1], [2]] };
    case '6': return { rows: [[2], [2], [2]] };
    case '7': return { rows: [[2], [1], [2], [2]] };
    case '8': return { rows: [[2], [2], [2], [2]] };
    case '9': return { rows: [[2], [1], [2], [2], [2]] };
    case '10': return { rows: [[2], [2], [2], [2], [2]] };
    case 'J': return { rows: [], face: 'J' };
    case 'Q': return { rows: [], face: 'Q' };
    case 'K': return { rows: [], face: 'K' };
    default: return { rows: [[1]] };
  }
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
  const suitSymbol = suit ? SUIT_SYMBOLS[suit] : '';

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

  const cardContent = (
    <>
      {faceUp && suit && rank ? (
        <div className="card-face">
          {/* Top-left corner */}
          <div className="card-corner top-left">
            <span className="corner-rank">{rank}</span>
            <span className="corner-suit">{suitSymbol}</span>
          </div>

          {/* Center content */}
          <div className="card-center">
            {getSuitLayout(rank).face ? (
              <div className="face-card">
                <span className="face-letter">{getSuitLayout(rank).face}</span>
                <span className="face-suit">{suitSymbol}</span>
              </div>
            ) : getSuitLayout(rank).large ? (
              <span className="center-suit large">{suitSymbol}</span>
            ) : (
              <div className="suit-grid">
                {getSuitLayout(rank).rows.map((row, ri) => (
                  <div key={ri} className="suit-row">
                    {Array.from({ length: row[0] }, (_, ci) => (
                      <span key={ci} className="grid-suit">{suitSymbol}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom-right corner */}
          <div className="card-corner bottom-right">
            <span className="corner-rank">{rank}</span>
            <span className="corner-suit">{suitSymbol}</span>
          </div>
        </div>
      ) : (
        <div className="card-back">
          <div className="back-pattern">
            <div className="back-inner">
              <span className="back-symbol">🃏</span>
            </div>
          </div>
          {knownCard && (
            <div className={`card-memo ${knownCard.suit === 'heart' || knownCard.suit === 'diamond' ? 'memo-red' : ''}`}>
              {knownCard.rank}{SUIT_SYMBOLS[knownCard.suit]}
            </div>
          )}
        </div>
      )}
    </>
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
