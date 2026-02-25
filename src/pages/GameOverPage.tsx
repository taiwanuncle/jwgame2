import type { GameStateFromServer, RoundResult } from '../types';
import './GameOverPage.css';

interface Props {
  gameState: GameStateFromServer;
  roundResult: RoundResult | null;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export default function GameOverPage({ gameState, onPlayAgain, onBackToLobby }: Props) {
  const sortedPlayers = [...gameState.players].sort((a, b) => a.totalScore - b.totalScore);
  const me = gameState.players.find(p => p.id === gameState.myId);
  const isHost = me?.isHost ?? false;

  return (
    <div className="page gameover-page">
      <h1>게임 종료!</h1>

      <div className="final-ranking surface">
        <h2>최종 순위</h2>
        <div className="ranking-list">
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className={`rank-row ${i === 0 ? 'winner' : ''}`}>
              <span className="rank-num">
                {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`}
              </span>
              <span className="rank-name">{p.nickname}</span>
              <span className="rank-score">{p.totalScore}점</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gameover-actions">
        {isHost && (
          <button className="btn btn-primary btn-large" onClick={onPlayAgain}>
            다시 하기
          </button>
        )}
        <button className="btn btn-outline btn-large" onClick={onBackToLobby}>
          로비로 돌아가기
        </button>
      </div>
    </div>
  );
}
