import { useEffect, useRef } from 'react';
import type { ActionLogEntry } from '../types';
import './ActionLog.css';

interface Props {
  entries: ActionLogEntry[];
  myId?: string;
}

function formatAction(entry: ActionLogEntry, myId?: string): string {
  const name = entry.playerId === myId ? '나' : entry.playerName;

  switch (entry.action) {
    case 'draw_from_pile':
      return `${name}(이)가 뽑기 더미에서 카드를 가져갔습니다`;
    case 'draw_from_discard': {
      const card = entry.details.drawnCard;
      const cardStr = card ? `${card.rank}` : '카드';
      return `${name}(이)가 버린 카드 더미에서 ${cardStr}을 가져갔습니다`;
    }
    case 'swap_card': {
      const disc = entry.details.discardedCard;
      const discStr = disc ? `${disc.rank}` : '카드';
      return `${name}(이)가 카드를 교환하고 ${discStr}을 버렸습니다`;
    }
    case 'discard_and_flip':
      return `${name}(이)가 카드를 버리고 카드 한 장을 뒤집었습니다`;
    case 'all_face_up':
      return `🔔 ${name}(이)가 모든 카드를 공개했습니다! 마지막 턴!`;
    case 'peek':
      return `${name}(이)가 카드를 확인했습니다`;
    default:
      return `${name}(이)가 행동했습니다`;
  }
}

export default function ActionLog({ entries, myId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="action-log">
      <div className="log-header">행동 로그</div>
      <div className="log-entries" ref={scrollRef}>
        {entries.length === 0 && (
          <div className="log-empty">아직 행동이 없습니다</div>
        )}
        {entries.map((entry, i) => (
          <div
            key={i}
            className={`log-entry ${entry.action === 'all_face_up' ? 'alert' : ''}`}
          >
            <span className="log-text">{formatAction(entry, myId)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
