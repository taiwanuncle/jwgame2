import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import type { AvailableRoom, RoomOptions, GameMode, CardCount, BotDifficulty } from '../types';
import InfoModal from '../components/InfoModal';
import PlaylistModal from '../components/PlaylistModal';
import MusicToggle from '../components/MusicToggle';
import LanguageToggle from '../components/LanguageToggle';
import InstallPrompt from '../components/InstallPrompt';
import { generateRandomName } from '../utils/randomName';
import './LobbyPage.css';

interface Props {
  onCreateRoom: (nickname: string, avatarIndex: number, options: Partial<RoomOptions>) => void;
  onJoinRoom: (roomCode: string, nickname: string, avatarIndex: number) => void;
  errorMsg: string;
  availableRooms: AvailableRoom[];
}

const AVATARS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮'];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function LobbyPage({ onCreateRoom, onJoinRoom, errorMsg, availableRooms }: Props) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'single'>('menu');
  const [nickname, setNickname] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [cardCount, setCardCount] = useState<CardCount>(4);
  const [joinCode, setJoinCode] = useState('');
  const [botCount, setBotCount] = useState(3);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('easy');
  const [addBots, setAddBots] = useState(false);
  const [totalRounds, setTotalRounds] = useState(4);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Auto-adjust totalRounds when botCount changes (must be divisible by player count)
  useEffect(() => {
    const playerTotal = botCount + 1;
    if (totalRounds % playerTotal !== 0) {
      const nearest = Math.round(totalRounds / playerTotal) * playerTotal;
      setTotalRounds(Math.max(playerTotal, Math.min(playerTotal * 5, nearest || playerTotal)));
    }
  }, [botCount, totalRounds]);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    onCreateRoom(nickname.trim(), avatarIndex, {
      gameMode,
      cardCount,
      ...(addBots ? { botCount, botDifficulty } : {}),
    });
  };

  const handleStartSingle = () => {
    if (!nickname.trim()) return;
    onCreateRoom(nickname.trim(), avatarIndex, {
      gameMode,
      cardCount,
      totalRounds,
      singlePlayerMode: true,
      botCount,
      botDifficulty,
    });
  };

  const handleJoin = (roomCode: string) => {
    if (!nickname.trim()) return;
    onJoinRoom(roomCode, nickname.trim(), avatarIndex);
  };

  const handleRandom = () => {
    const result = generateRandomName(i18n.language);
    setAvatarIndex(result.avatarIndex);
    setNickname(result.nickname);
  };

  if (mode === 'menu') {
    return (
      <div className="page lobby-page">
        <InstallPrompt />
        <div className="floating-music-toggle">
          <MusicToggle />
          <LanguageToggle />
        </div>
        <motion.div
          className="lobby-title"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="lobby-icon"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            ⛳
          </motion.span>
          <h1>{t('app.title')}</h1>
          <p className="text-muted">{t('app.subtitle')}</p>
        </motion.div>
        <div className="lobby-buttons">
          {(['create', 'join', 'single'] as const).map((m, i) => (
            <motion.button
              key={m}
              className={`btn ${m === 'create' ? 'btn-primary' : 'btn-outline'} btn-large`}
              onClick={() => setMode(m)}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {m === 'create' ? t('lobby.createRoom') : m === 'join' ? t('lobby.joinRoom') : t('lobby.singlePlay')}
            </motion.button>
          ))}
        </div>
        <motion.div
          className="lobby-info-btns"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <button className="btn btn-ghost" onClick={() => setShowHowToPlay(true)}>
            {t('lobby.howToPlay')}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowPlaylist(true)}>
            {t('lobby.music')}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowAbout(true)}>
            {t('lobby.about')}
          </button>
        </motion.div>

        {/* Game Rules Modal */}
        <InfoModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} title={t('rules.title')}>
          <h3>{t('rules.overview')}</h3>
          <p>{t('rules.overviewDesc')}</p>
          <h3>{t('rules.progression')}</h3>
          <ol>
            <li><Trans i18nKey="rules.step1" components={{ hl: <span className="highlight" /> }} /></li>
            <li>{t('rules.step2')}</li>
            <li><Trans i18nKey="rules.step3" components={{ b: <strong /> }} /></li>
            <li><Trans i18nKey="rules.step4" components={{ hl: <span className="highlight" /> }} /></li>
            <li><Trans i18nKey="rules.step5" components={{ b: <strong /> }} /></li>
            <li>{t('rules.step6')}</li>
            <li><Trans i18nKey="rules.step7" components={{ hl: <span className="highlight" /> }} /></li>
            <li>{t('rules.step8')}</li>
            <li>{t('rules.step9')}</li>
          </ol>
          <h3>{t('rules.scoring')}</h3>
          <table className="score-table">
            <thead><tr><th>{t('rules.cardHeader')}</th><th>{t('rules.scoreHeader')}</th></tr></thead>
            <tbody>
              <tr><td>A</td><td>{t('rules.aceScore')}</td></tr>
              <tr><td>2~9</td><td>{t('rules.numScore')}</td></tr>
              <tr><td>10, K</td><td>{t('rules.tenKScore')}</td></tr>
              <tr><td>J</td><td>{t('rules.jackScore')}</td></tr>
              <tr><td>Q</td><td>{t('rules.queenScore')}</td></tr>
            </tbody>
          </table>
          <h3>{t('rules.bonus')}</h3>
          <ul>
            <li><strong>{t('rules.pairDesc')}</strong></li>
            <li><strong>{t('rules.straightDesc')}</strong></li>
            <li><strong>{t('rules.multiplierDesc')}</strong></li>
          </ul>
          <h3>{t('rules.otherRules')}</h3>
          <ul>
            <li>{t('rules.deckRule')}</li>
            <li>{t('rules.firstTurnRule')}</li>
            <li>{t('rules.winRule')}</li>
          </ul>
          <h3>{t('rules.tips')}</h3>
          <p>{t('rules.tipsDesc')}</p>
        </InfoModal>

        {/* Playlist Modal */}
        <PlaylistModal isOpen={showPlaylist} onClose={() => setShowPlaylist(false)} />

        {/* About Modal */}
        <InfoModal isOpen={showAbout} onClose={() => setShowAbout(false)} title={t('about.title')}>
          <h3>{t('about.story')}</h3>
          <p>{t('about.storyDesc')}</p>
          <h3>{t('about.contact')}</h3>
          <div className="contact-section">
            <div className="contact-row">
              <span className="contact-label">{t('about.email')}</span>
              <a href="mailto:atshane81@gmail.com" className="contact-value">atshane81@gmail.com</a>
            </div>
            <a
              href="https://pf.kakao.com/_exghAX"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-kakao-btn"
            >
              {t('about.kakaoChannel')}
            </a>
          </div>
          <h3>{t('about.donation')}</h3>
          <div className="donate-section">
            <p>{t('about.donationDesc')}</p>
            <a
              href="https://qr.kakaopay.com/FN0023EGr"
              target="_blank"
              rel="noopener noreferrer"
              className="donate-link donate-link--mobile"
            >
              {t('about.donateBtn')}
            </a>
            <div className="donate-qr-desktop">
              <p className="donate-qr-label">{t('about.qrLabel')}</p>
              <img
                className="donate-qr-img"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://qr.kakaopay.com/FN0023EGr")}`}
                alt={t('about.qrAlt')}
                width={180}
                height={180}
              />
            </div>
          </div>
        </InfoModal>
      </div>
    );
  }

  // Avatar + Nickname section
  const avatarNicknameSection = (
    <>
      <div className="avatar-picker">
        <div className="avatar-picker-header">
          <label>{t('lobby.avatarSelect')}</label>
          <motion.button
            className="btn-random"
            onClick={handleRandom}
            whileTap={{ scale: 0.9, rotate: 180 }}
            title={t('lobby.randomNickname')}
          >
            🎲
          </motion.button>
        </div>
        <div className="avatar-grid">
          {AVATARS.map((emoji, i) => (
            <motion.button
              key={i}
              className={`avatar-btn ${i === avatarIndex ? 'selected' : ''}`}
              onClick={() => setAvatarIndex(i)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label>{t('lobby.nickname')}</label>
        <input
          type="text"
          placeholder={t('lobby.nicknamePlaceholder')}
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 12))}
          maxLength={12}
          autoComplete="off"
        />
      </div>
    </>
  );

  // Game options section
  const gameOptionsSection = (
    <>
      <div className="option-group">
        <label>{t('lobby.gameMode')}</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${gameMode === 'normal' ? 'active' : ''}`} onClick={() => setGameMode('normal')}>{t('lobby.normal')}</button>
          <button className={`toggle-btn ${gameMode === 'advanced' ? 'active' : ''}`} onClick={() => setGameMode('advanced')}>{t('lobby.advanced')}</button>
        </div>
      </div>
      <div className="option-group">
        <label>{t('lobby.cardCount')}</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${cardCount === 4 ? 'active' : ''}`} onClick={() => setCardCount(4)}>{t('lobby.cards4')}</button>
          <button className={`toggle-btn ${cardCount === 6 ? 'active' : ''}`} onClick={() => setCardCount(6)}>{t('lobby.cards6')}</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="page lobby-page">
      <InstallPrompt />
      <div className="floating-music-toggle">
        <MusicToggle />
        <LanguageToggle />
      </div>
      <motion.button
        className="btn btn-ghost back-btn"
        onClick={() => setMode('menu')}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {t('lobby.back')}
      </motion.button>

      <motion.div
        className="lobby-form surface"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2>{mode === 'create' ? t('lobby.createRoomBtn') : mode === 'single' ? t('lobby.singlePlayTitle') : t('lobby.joinRoomTitle')}</h2>

        {avatarNicknameSection}

        {/* Create room options */}
        {mode === 'create' && (
          <div className="create-options">
            {gameOptionsSection}
            <div className="option-group">
              <label>{t('lobby.addBots')}</label>
              <div className="toggle-group">
                <button className={`toggle-btn ${!addBots ? 'active' : ''}`} onClick={() => setAddBots(false)}>{t('lobby.none')}</button>
                <button className={`toggle-btn ${addBots ? 'active' : ''}`} onClick={() => setAddBots(true)}>{t('lobby.add')}</button>
              </div>
            </div>
            <AnimatePresence>
              {addBots && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="bot-options-inner">
                    <div className="option-group">
                      <label>{t('lobby.botCount')}</label>
                      <div className="toggle-group bot-count-group">
                        {[1,2,3,4,5,6,7,8,9].map((n) => (
                          <button key={n} className={`toggle-btn ${botCount === n ? 'active' : ''}`} onClick={() => setBotCount(n)}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <div className="option-group">
                      <label>{t('lobby.botDifficulty')}</label>
                      <div className="toggle-group">
                        <button className={`toggle-btn ${botDifficulty === 'easy' ? 'active' : ''}`} onClick={() => setBotDifficulty('easy')}>{t('lobby.easy')}</button>
                        <button className={`toggle-btn ${botDifficulty === 'medium' ? 'active' : ''}`} onClick={() => setBotDifficulty('medium')}>{t('lobby.medium')}</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button className="btn btn-primary" onClick={handleCreate} disabled={!nickname.trim()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {t('lobby.createRoomBtn')}
            </motion.button>
          </div>
        )}

        {/* Single player options */}
        {mode === 'single' && (
          <div className="create-options">
            {gameOptionsSection}
            <div className="option-group">
              <label>{t('lobby.botCount')}</label>
              <div className="toggle-group bot-count-group">
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                  <button key={n} className={`toggle-btn ${botCount === n ? 'active' : ''}`} onClick={() => setBotCount(n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <label>{t('lobby.botDifficulty')}</label>
              <div className="toggle-group">
                <button className={`toggle-btn ${botDifficulty === 'easy' ? 'active' : ''}`} onClick={() => setBotDifficulty('easy')}>{t('lobby.easy')}</button>
                <button className={`toggle-btn ${botDifficulty === 'medium' ? 'active' : ''}`} onClick={() => setBotDifficulty('medium')}>{t('lobby.medium')}</button>
              </div>
            </div>
            <div className="option-group">
              <label>{t('lobby.roundCount')}</label>
              <div className="toggle-group">
                {(() => {
                  const playerTotal = botCount + 1;
                  return Array.from({ length: 5 }, (_, i) => playerTotal * (i + 1)).map((r) => (
                    <button key={r} className={`toggle-btn ${totalRounds === r ? 'active' : ''}`} onClick={() => setTotalRounds(r)}>{r}R</button>
                  ));
                })()}
              </div>
            </div>
            <motion.button className="btn btn-primary" onClick={handleStartSingle} disabled={!nickname.trim()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {t('lobby.startGame')}
            </motion.button>
          </div>
        )}

        {/* Join-specific */}
        {mode === 'join' && (
          <div className="join-options">
            <div className="form-field">
              <label>{t('lobby.enterRoomCode')}</label>
              <div className="code-input-row">
                <input type="text" placeholder={t('lobby.roomCodePlaceholder')} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))} maxLength={5} />
                <button className="btn btn-primary" onClick={() => handleJoin(joinCode)} disabled={!nickname.trim() || joinCode.length < 5}>{t('lobby.join')}</button>
              </div>
            </div>
            {availableRooms.length > 0 && (
              <div className="room-list">
                <label>{t('lobby.openRooms')}</label>
                {availableRooms.map((room, i) => (
                  <motion.div
                    key={room.roomCode}
                    className="room-item surface"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    <div className="room-info">
                      <span className="room-host">{room.hostNickname}</span>
                      <div className="room-badges">
                        <span className="badge badge-accent">{room.gameMode === 'advanced' ? t('lobby.advanced') : t('lobby.normal')}</span>
                        <span className="badge badge-warning">{room.cardCount}{t('lobby.cardsSuffix')}</span>
                        <span className="text-muted">{room.playerCount}/{room.maxPlayers}</span>
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => handleJoin(room.roomCode)} disabled={!nickname.trim()}>{t('lobby.join')}</button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {errorMsg && (
            <motion.div className="error-toast" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
