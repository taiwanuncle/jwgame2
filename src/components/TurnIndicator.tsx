import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './TurnIndicator.css';

interface Props {
  playerName: string;
  isMyTurn: boolean;
  isLastTurn: boolean;
}

export default function TurnIndicator({ playerName, isMyTurn, isLastTurn }: Props) {
  const { t } = useTranslation();
  const label = isMyTurn ? t('game.myTurn') : t('game.playerTurn', { name: playerName });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={label}
        className={`turn-indicator ${isMyTurn ? 'my-turn' : ''} ${isLastTurn ? 'last-turn' : ''}`}
        initial={{ opacity: 0, y: 16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      >
        {isLastTurn && <span className="turn-alert-icon">🔔</span>}
        <span className="turn-label">{label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
