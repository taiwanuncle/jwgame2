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
  if (!isOpen) return null;

  // Collect all revealed/discarded cards from log
  const cardEvents: { card: string; isRed: boolean; action: string; player: string }[] = [];

  for (const entry of actionLog) {
    const name = entry.playerId === myId ? '나' : entry.playerName;

    if (entry.details.drawnCard && entry.action === 'draw_from_discard') {
      const c = entry.details.drawnCard;
      cardEvents.push({
        card: `${c.rank}${SUIT_SYMBOLS[c.suit]}`,
        isRed: c.suit === 'heart' || c.suit === 'diamond',
        action: '버림더미에서 가져감',
        player: name,
      });
    }

    if (entry.details.discardedCard) {
      const c = entry.details.discardedCard;
      cardEvents.push({
        card: `${c.rank}${SUIT_SYMBOLS[c.suit]}`,
        isRed: c.suit === 'heart' || c.suit === 'diamond',
        action: '버림',
        player: name,
      });
    }

    if (entry.details.revealedCard) {
      const c = entry.details.revealedCard;
      cardEvents.push({
        card: `${c.rank}${SUIT_SYMBOLS[c.suit]}`,
        isRed: c.suit === 'heart' || c.suit === 'diamond',
        action: '공개',
        player: name,
      });
    }
  }

  return (
    <div className="advanced-popup-overlay" onClick={onClose}>
      <div className="card-log-modal" onClick={(e) => e.stopPropagation()}>
        <h3>카드 로그</h3>
        {cardEvents.length === 0 ? (
          <p className="log-empty">아직 공개된 카드가 없습니다.</p>
        ) : (
          <div className="log-list">
            {cardEvents.map((ev, i) => (
              <div key={i} className="log-entry">
                <span className={`log-card ${ev.isRed ? 'log-red' : 'log-black'}`}>{ev.card}</span>
                <span className="log-detail">{ev.player} — {ev.action}</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-primary" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
