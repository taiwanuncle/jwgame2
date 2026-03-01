import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { useSocket } from './hooks/useSocket';
import { audioManager } from './utils/audioManager';
import type { MusicCategory } from './utils/audioManager';
import LobbyPage from './pages/LobbyPage';
import WaitingRoom from './pages/WaitingRoom';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';

function App() {
  const { t } = useTranslation();
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

  // BGM: switch category based on game phase
  useEffect(() => {
    let category: MusicCategory;
    if (isLobby || isWaiting) {
      category = 'opening';
    } else if (gameState?.phase === 'game_over') {
      category = 'celebration';
    } else {
      // playing, peeking, round_scoring — keep "playing" category
      // (round_scoring is brief; switching music disrupts experience)
      category = 'playing';
    }
    audioManager.playCategory(category);
  }, [isLobby, isWaiting, gameState?.phase]);

  // Exit playlist mode when leaving lobby
  useEffect(() => {
    if (!isLobby) {
      audioManager.exitPlaylistMode();
    }
  }, [isLobby]);

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
            {t('app.preparing')}
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
        chatMessages={chatMessages}
        onPlayAgain={playAgain}
        onBackToLobby={leaveRoom}
        onSendChat={sendChat}
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
