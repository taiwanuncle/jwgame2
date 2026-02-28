import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { audioManager, ALL_TRACKS, type Track, type MusicCategory } from '../utils/audioManager';
import './PlaylistModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<MusicCategory, string> = {
  opening: '🎬',
  playing: '🎮',
  celebration: '🎉',
};

export default function PlaylistModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    return audioManager.subscribe(() => setTick((t) => t + 1));
  }, []);

  const currentTrack = audioManager.currentTrack;
  const isPlaying = audioManager.playing;
  const volume = audioManager.volume;
  const isMuted = audioManager.muted;

  const categoryLabels: Record<MusicCategory, string> = {
    opening: t('music.catOpening'),
    playing: t('music.catPlaying'),
    celebration: t('music.catCelebration'),
  };

  const handleTrackClick = useCallback((track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      audioManager.pause();
    } else if (currentTrack?.id === track.id && !isPlaying) {
      audioManager.resume();
    } else {
      audioManager.playFromPlaylist(track);
    }
  }, [currentTrack, isPlaying]);

  const handleNext = useCallback(() => {
    audioManager.next();
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    audioManager.setVolume(Number(e.target.value));
  }, []);

  const handleToggleMute = useCallback(() => {
    audioManager.toggleMute();
  }, []);

  const handleTogglePlay = useCallback(() => {
    audioManager.togglePlay();
  }, []);

  const handleShuffle = useCallback(() => {
    // Pick a random track and play
    const randomTrack = ALL_TRACKS[Math.floor(Math.random() * ALL_TRACKS.length)];
    audioManager.playFromPlaylist(randomTrack);
  }, []);

  const categories: MusicCategory[] = ['opening', 'playing', 'celebration'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="info-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="info-modal surface playlist-modal"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="info-modal-header">
              <h2>{t('music.playlist')}</h2>
              <button className="info-modal-close" onClick={onClose}>✕</button>
            </div>

            {/* Player Controls */}
            <div className="playlist-player">
              <div className="player-now-playing">
                {currentTrack ? (
                  <span className="now-playing-text">
                    {CATEGORY_ICONS[currentTrack.category]} {currentTrack.name}
                  </span>
                ) : (
                  <span className="now-playing-text now-playing-empty">{t('music.noTrack')}</span>
                )}
              </div>
              <div className="player-controls">
                <button className="player-btn" onClick={handleTogglePlay} title={isPlaying ? t('music.pause') : t('music.play')}>
                  {isPlaying ? '⏸' : '▶️'}
                </button>
                <button className="player-btn" onClick={handleNext} title={t('music.next')}>
                  ⏭
                </button>
                <button className="player-btn" onClick={handleShuffle} title={t('music.shuffle')}>
                  🔀
                </button>
                <button className={`player-btn ${isMuted ? 'muted' : ''}`} onClick={handleToggleMute} title={isMuted ? t('music.unmute') : t('music.mute')}>
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>
              <div className="player-volume">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>
            </div>

            {/* Track List */}
            <div className="playlist-tracks">
              {categories.map((cat) => {
                const tracks = ALL_TRACKS.filter((t) => t.category === cat);
                return (
                  <div key={cat} className="playlist-category">
                    <div className="category-header">
                      <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                      <span className="category-label">{categoryLabels[cat]}</span>
                    </div>
                    {tracks.map((track) => {
                      const isCurrent = currentTrack?.id === track.id;
                      const isTrackPlaying = isCurrent && isPlaying;
                      return (
                        <button
                          key={track.id}
                          className={`track-item ${isCurrent ? 'current' : ''} ${isTrackPlaying ? 'playing' : ''}`}
                          onClick={() => handleTrackClick(track)}
                        >
                          <span className="track-indicator">
                            {isTrackPlaying ? '🔊' : isCurrent ? '⏸' : '♪'}
                          </span>
                          <span className="track-name">{track.name}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
