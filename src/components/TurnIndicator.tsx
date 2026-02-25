import './TurnIndicator.css';

interface Props {
  playerName: string;
  isMyTurn: boolean;
  isLastTurn: boolean;
}

export default function TurnIndicator({ playerName, isMyTurn, isLastTurn }: Props) {
  return (
    <div className={`turn-indicator ${isMyTurn ? 'my-turn' : ''} ${isLastTurn ? 'last-turn' : ''}`}>
      {isLastTurn && <span className="turn-alert-icon">🔔</span>}
      <span className="turn-label">
        {isMyTurn ? '내 차례!' : `${playerName}의 차례`}
      </span>
    </div>
  );
}
