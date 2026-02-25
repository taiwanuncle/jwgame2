import { useSocket } from './hooks/useSocket';
import LobbyPage from './pages/LobbyPage';
import WaitingRoom from './pages/WaitingRoom';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';

function App() {
  const {
    gameState,
    roundResult,
    errorMsg,
    chatMessages,
    availableRooms,
    createRoom,
    joinRoom,
    toggleReady,
    setRoomOptions,
    startGame,
    peekDone,
    drawFromPile,
    drawFromDiscard,
    thankYouAck,
    swapCard,
    discardAndFlip,
    nextRound,
    playAgain,
    leaveRoom,
    sendChat,
  } = useSocket();

  const isLobby = !gameState || !gameState.roomCode;
  const isWaiting = gameState?.phase === 'waiting';

  if (isLobby) {
    return (
      <LobbyPage
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        errorMsg={errorMsg}
        availableRooms={availableRooms}
      />
    );
  }

  if (isWaiting) {
    // Single player auto-starts; show brief loading instead of WaitingRoom
    if (gameState.roomOptions?.singlePlayerMode) {
      return (
        <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}>
            게임 준비 중...
          </p>
        </div>
      );
    }
    return (
      <WaitingRoom
        gameState={gameState}
        onToggleReady={toggleReady}
        onSetRoomOptions={setRoomOptions}
        onStartGame={startGame}
        onLeave={leaveRoom}
        errorMsg={errorMsg}
      />
    );
  }

  if (gameState.phase === 'game_over') {
    return (
      <GameOverPage
        gameState={gameState}
        roundResult={roundResult}
        onPlayAgain={playAgain}
        onBackToLobby={leaveRoom}
      />
    );
  }

  return (
    <GamePage
      gameState={gameState}
      roundResult={roundResult}
      chatMessages={chatMessages}
      onPeekDone={peekDone}
      onDrawFromPile={drawFromPile}
      onDrawFromDiscard={drawFromDiscard}
      onThankYouAck={thankYouAck}
      onSwapCard={swapCard}
      onDiscardAndFlip={discardAndFlip}
      onNextRound={nextRound}
      onSendChat={sendChat}
    />
  );
}

export default App;
