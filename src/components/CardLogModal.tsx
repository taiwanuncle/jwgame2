import { useTranslation } from 'react-i18next';
import type { ActionLogEntry, Suit } from '../types';
import './CardLogModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actionLog: ActionLogEntry[];
  myId?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '\u2660',
  heart: '\u2665',
  diamond: '\u2666',
  club: '\u2663',
};

export default function CardLogModal({ isOpen, onClose, actionLog, myId }: Props) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Collect all revealed/discarded cards from log
  const cardEvents: { card: string; isRed: boolean; action: string; player: string }[] = [];

  for (const entry of actionLog) {
    const name = entry.playerId === myId ? t('game.me') : entry.playerName;

    if (entry.details.drawnCard && entry.action === 'draw_from_discard') {
      const c = entry.details.drawnCard;
      cardEvents.push({
        card: `${c.rank}${SUIT_SYMBOLS[c.suit]}`,
        isRed: c.suit === 'heart' || c.suit === 'diamond',
        action: t('log.takenFromDiscard'),
        player: name,
      });
    }

    if (entry.details.discardedCard) {
      const c = entry.details.discardedCard;
      cardEvents.push({
        card: `${c.rank}${SUIT_SYMBOLS[c.suit]}`,
        isRed: c.suit === 'heart' || c.suit === 'diamond',
        action: t('log.discarded'),
        player: name,
      });
    }

    if (entry.details.revealedCard) {
      const c = entry.details.revealedCard;
      cardEvents.push({
        card: `${c.rank}${SUIT_SYMBOLS[c.suit]}`,
        isRed: c.suit === 'heart' || c.suit === 'diamond',
        action: t('log.revealed'),
        player: name,
      });
    }
  }

  return (
    <div className="advanced-popup-overlay" onClick={onClose}>
      <div className="card-log-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('log.title')}</h3>
        {cardEvents.length === 0 ? (
          <p className="log-empty">{t('log.empty')}</p>
        ) : (
          <div className="log-list">
            {cardEvents.map((ev, i) => (
              <div key={i} className={`log-entry${i === 0 ? ' log-first' : ''}${i === cardEvents.length - 1 ? ' log-last' : ''}`}>
                <span className="log-num">{i + 1}</span>
                <span className={`log-card ${ev.isRed ? 'log-red' : 'log-black'}`}>{ev.card}</span>
                <span className="log-detail">{ev.player} — {ev.action}</span>
                {i === 0 && <span className="log-tag log-tag-first">{t('log.first')}</span>}
                {i === cardEvents.length - 1 && <span className="log-tag log-tag-last">{t('log.latest')}</span>}
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-primary" onClick={onClose}>{t('log.close')}</button>
      </div>
    </div>
  );
}
