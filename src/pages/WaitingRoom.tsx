import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { GameStateFromServer, RoomOptions, GameMode, CardCount } from '../types';
import MusicToggle from '../components/MusicToggle';
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
  const { t } = useTranslation();
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
      <div className="floating-music-toggle">
        <MusicToggle />
      </div>
      <div className="waiting-header">
        <button className="btn btn-ghost" onClick={onLeave}>{t('waiting.leave')}</button>
        <h2>{t('waiting.title')}</h2>
        <div className="room-code-box" onClick={copyCode}>
          <span className="room-code">{gameState.roomCode}</span>
          <span className="copy-hint">{copied ? t('waiting.copied') : t('waiting.clickToCopy')}</span>
        </div>
      </div>

      {/* Room Options (host only) */}
      {isHost && (
        <div className="room-options surface">
          <h3>{t('waiting.gameSettings')}</h3>
          <div className="options-grid">
            <div className="option-group">
              <label>{t('waiting.gameMode')}</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${gameState.roomOptions.gameMode === 'normal' ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ gameMode: 'normal' as GameMode })}
                >
                  {t('waiting.normal')}
                </button>
                <button
                  className={`toggle-btn ${gameState.roomOptions.gameMode === 'advanced' ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ gameMode: 'advanced' as GameMode })}
                >
                  {t('waiting.advanced')}
                </button>
              </div>
            </div>

            <div className="option-group">
              <label>{t('waiting.cardCount')}</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${gameState.roomOptions.cardCount === 4 ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ cardCount: 4 as CardCount })}
                >
                  {t('waiting.cards4')}
                </button>
                <button
                  className={`toggle-btn ${gameState.roomOptions.cardCount === 6 ? 'active' : ''}`}
                  onClick={() => onSetRoomOptions({ cardCount: 6 as CardCount })}
                >
                  {t('waiting.cards6')}
                </button>
              </div>
            </div>

            <div className="option-group">
              <label>{t('waiting.roundCount')}</label>
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
              {gameState.roomOptions.gameMode === 'advanced' ? t('waiting.advanced') : t('waiting.normal')}
            </span>
            <span className="badge badge-warning">{gameState.roomOptions.cardCount}{t('lobby.cardsSuffix')}</span>
            <span className="badge badge-accent">{gameState.roomOptions.totalRounds}R</span>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="player-list surface">
        <h3>{t('waiting.players', { count: playerCount })}</h3>
        <div className="players">
          {gameState.players.map((p, i) => (
            <motion.div
              key={p.id}
              className={`player-row ${!p.connected ? 'disconnected' : ''}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <span className="player-avatar">{AVATARS[p.avatarIndex] || '🎴'}</span>
              <span className="player-name">
                {p.nickname}
                {p.isHost && <span className="host-badge">{t('waiting.host')}</span>}
              </span>
              <span className={`player-status ${p.isHost ? 'host' : p.ready ? 'ready' : ''}`}>
                {p.isHost ? '👑' : p.ready ? t('waiting.ready') : t('waiting.waitingStatus')}
              </span>
            </motion.div>
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
              ? t('waiting.needMin')
              : !allReady
              ? t('waiting.waitAllReady')
              : t('waiting.startGame')}
          </button>
        ) : (
          <button
            className={`btn btn-large ${me?.ready ? 'btn-danger' : 'btn-primary'}`}
            onClick={onToggleReady}
          >
            {me?.ready ? t('waiting.readyCancel') : t('waiting.readyComplete')}
          </button>
        )}
      </div>

      {errorMsg && <div className="error-toast">{errorMsg}</div>}
    </div>
  );
}
