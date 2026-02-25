import { useState } from 'react';
import type { GameStateFromServer, RoomOptions, GameMode, CardCount } from '../types';
import './WaitingRoom.css';

const AVATARS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮'];

interface Props {
  gameState: GameStateFromServer;
  onToggleReady: () => void;
  onSetRoomOptions: (options: Partial<RoomOptions>) => void;
  onStartGame: () => void;
  onLeave: () => void;
  errorMsg: string;
}

export default function WaitingRoom({
  gameState,
  onToggleReady,
  onSetRoomOptions,
  onStartGame,
  onLeave,
  errorMsg,
}: Props) {
  const [copied, setCopied] = useState(false);

  const me = gameState.players.find((p) => p.id === gameState.myId);
  const isHost = me?.isHost ?? false;
  const allReady = gameState.players
    .filter((p) => !p.isHost)
    .every((p) => p.ready);
  const canStart = isHost && gameState.players.length >= 2 && allReady;

  const copyCode = () => {
    navigator.clipboard.writeText(gameState.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const playerCount = gameState.players.length;
  const roundOptions = Array.from({ length: 5 }, (_, i) => playerCount * (i + 1));

  return (
    <div className="page waiting-page">
      <div className="waiting-header">
        <button className="btn btn-ghost" onClick={onLeave}>← 나가기</button>
        <h2>대기실</h2>
        <div className="room-code-box" onClick={copyCode}>
          <span className="room-code">{gameState.roomCode}</span>
          <span className="copy-hint">{copied ? '복사됨!' : '클릭하여 복사'}</span>
        </div>
      </div>

      {/* Room Options (host only) */}
      {isHost && (
        <div className="room-options surface">
          <h3>게임 설정</h3>
          <div className="options-grid">
            <div className="option-group">
              <label>게임 모드</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${gameState.roomOptions.gameMode === 'normal' ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ gameMode: 'normal' as GameMode })}
                >
                  일반
                </button>
                <button
                  className={`toggle-btn ${gameState.roomOptions.gameMode === 'advanced' ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ gameMode: 'advanced' as GameMode })}
                >
                  상급자
                </button>
              </div>
            </div>

            <div className="option-group">
              <label>카드 수</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${gameState.roomOptions.cardCount === 4 ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ cardCount: 4 as CardCount })}
                >
                  4장
                </button>
                <button
                  className={`toggle-btn ${gameState.roomOptions.cardCount === 6 ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ cardCount: 6 as CardCount })}
                >
                  6장
                </button>
              </div>
            </div>

            <div className="option-group">
              <label>라운드 수</label>
              <div className="toggle-group">
                {roundOptions.map((r) => (
                  <button
                    key={r}
                    className={`toggle-btn ${gameState.roomOptions.totalRounds === r ? 'active' : ''}`}
                    onClick={() => onSetRoomOptions({ totalRounds: r })}
                  >
                    {r}R
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-host option display */}
      {!isHost && (
        <div className="room-options-display surface">
          <div className="option-badges">
            <span className="badge badge-accent">
              {gameState.roomOptions.gameMode === 'advanced' ? '상급자' : '일반'}
            </span>
            <span className="badge badge-warning">{gameState.roomOptions.cardCount}장</span>
            <span className="badge badge-accent">{gameState.roomOptions.totalRounds}R</span>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="player-list surface">
        <h3>플레이어 ({playerCount}/10)</h3>
        <div className="players">
          {gameState.players.map((p) => (
            <div key={p.id} className={`player-row ${!p.connected ? 'disconnected' : ''}`}>
              <span className="player-avatar">{AVATARS[p.avatarIndex] || '🎴'}</span>
              <span className="player-name">
                {p.nickname}
                {p.isHost && <span className="host-badge">방장</span>}
              </span>
              <span className={`player-status ${p.isHost ? 'host' : p.ready ? 'ready' : ''}`}>
                {p.isHost ? '👑' : p.ready ? '✓ 준비' : '대기중'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="waiting-actions">
        {isHost ? (
          <button
            className="btn btn-primary btn-large"
            onClick={onStartGame}
            disabled={!canStart}
          >
            {gameState.players.length < 2
              ? '2명 이상 필요'
              : !allReady
              ? '모두 준비 대기중...'
              : '게임 시작!'}
          </button>
        ) : (
          <button
            className={`btn btn-large ${me?.ready ? 'btn-danger' : 'btn-primary'}`}
            onClick={onToggleReady}
          >
            {me?.ready ? '준비 취소' : '준비 완료'}
          </button>
        )}
      </div>

      {errorMsg && <div className="error-toast">{errorMsg}</div>}
    </div>
  );
}
