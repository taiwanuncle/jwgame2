import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { GameStateFromServer, RoundResult, ChatMessage } from '../types';
import GlobalChat from '../components/GlobalChat';
import MusicToggle from '../components/MusicToggle';
import { playGameOver } from '../utils/sfx';
import './GameOverPage.css';

const AVATARS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮'];

interface Props {
  gameState: GameStateFromServer;
  roundResult: RoundResult | null;
  chatMessages: ChatMessage[];
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  onSendChat: (message: string) => void;
}

export default function GameOverPage({ gameState, chatMessages, onPlayAgain, onBackToLobby, onSendChat }: Props) {
  const sortedPlayers = [...gameState.players].sort((a, b) => a.totalScore - b.totalScore);
  const winners = sortedPlayers.filter(p => p.totalScore === sortedPlayers[0]?.totalScore);
  const me = gameState.players.find(p => p.id === gameState.myId);
  const isHost = me?.isHost ?? false;

  // SFX: game over fanfare
  useEffect(() => {
    playGameOver();
  }, []);

  // Confetti effect — 3 waves
  useEffect(() => {
    const duration = 4000;
    const end = Date.now() + duration;
    let cancelled = false;
    let frameId = 0;

    // Wave 1: Side cannons
    const frame = () => {
      if (cancelled) return;
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FFD700'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FFD700'],
      });
      if (Date.now() < end && !cancelled) {
        frameId = requestAnimationFrame(frame);
      }
    };
    frameId = requestAnimationFrame(frame);

    // Wave 2: Center burst
    const burst1 = setTimeout(() => {
      if (cancelled) return;
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#7C4DFF'],
        startVelocity: 30,
      });
    }, 500);

    // Wave 3: Gold burst
    const burst2 = setTimeout(() => {
      if (cancelled) return;
      confetti({
        particleCount: 30,
        spread: 120,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#FFD700', '#FFF176', '#FFE082'],
        startVelocity: 25,
        shapes: ['circle'],
      });
    }, 1500);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      clearTimeout(burst1);
      clearTimeout(burst2);
      confetti.reset();
    };
  }, []);

  return (
    <div className="page gameover-page">
      <div className="floating-music-toggle">
        <MusicToggle />
      </div>
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span style={{ WebkitTextFillColor: 'initial', backgroundClip: 'initial', WebkitBackgroundClip: 'initial', background: 'none' }}>🏆</span> 게임 종료!
      </motion.h1>

      {/* Winner highlight — supports co-winners */}
      {winners.length > 0 && (
        <motion.div
          className={`gameover-winner ${winners.length > 1 ? 'co-winners' : ''}`}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
        >
          {winners.length === 1 ? (
            <>
              <span className="winner-avatar">{AVATARS[winners[0].avatarIndex] || '🎴'}</span>
              <div className="winner-info">
                <span className="winner-label">우승</span>
                <span className="winner-name">{winners[0].nickname}</span>
              </div>
              <span className="winner-score">{winners[0].totalScore}점</span>
            </>
          ) : (
            <div className="co-winner-list">
              <span className="winner-label">공동 우승!</span>
              <div className="co-winner-players">
                {winners.map((w) => (
                  <div key={w.id} className="co-winner-player">
                    <span className="winner-avatar">{AVATARS[w.avatarIndex] || '🎴'}</span>
                    <span className="winner-name">{w.nickname}</span>
                  </div>
                ))}
              </div>
              <span className="winner-score">{winners[0].totalScore}점</span>
            </div>
          )}
        </motion.div>
      )}

      <motion.div
        className="final-ranking surface"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h2>최종 순위</h2>
        <div className="ranking-list">
          {sortedPlayers.map((p, i) => {
            // Calculate actual rank (tied players share same rank)
            const rank = i === 0 ? 0 : (p.totalScore === sortedPlayers[i - 1].totalScore ? -1 : i);
            const displayRank = rank === -1
              ? (sortedPlayers.findIndex(s => s.totalScore === p.totalScore))
              : rank;
            const isWinner = p.totalScore === sortedPlayers[0].totalScore;
            return (
            <motion.div
              key={p.id}
              className={`rank-row ${isWinner ? 'winner' : ''} ${p.id === gameState.myId ? 'is-me' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
            >
              <span className="rank-num">
                {displayRank === 0 ? '🏆' : displayRank === 1 ? '🥈' : displayRank === 2 ? '🥉' : `${displayRank + 1}위`}
              </span>
              <span className="rank-name">{p.nickname}</span>
              <div className="rank-rounds">
                {p.roundScores.map((s, ri) => (
                  <span key={ri} className="rank-round-score">{s}</span>
                ))}
              </div>
              <span className="rank-score">{p.totalScore}점</span>
            </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="gameover-actions"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        {isHost && (
          <button className="btn btn-primary btn-large" onClick={onPlayAgain}>
            다시 하기
          </button>
        )}
        <button className="btn btn-outline btn-large" onClick={onBackToLobby}>
          로비로 돌아가기
        </button>
      </motion.div>

      <GlobalChat messages={chatMessages} onSend={onSendChat} myId={gameState.myId} />
    </div>
  );
}
