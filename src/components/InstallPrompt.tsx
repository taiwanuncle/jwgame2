import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './InstallPrompt.css';

const DISMISS_KEY = 'pwa_install_dismissed';
const KAKAO_DISMISS_KEY = 'kakao_warn_hide';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isHiddenToday(key: string): boolean {
  try {
    const hideUntil = localStorage.getItem(key);
    if (hideUntil) return new Date() < new Date(hideUntil);
  } catch { /* ignore */ }
  return false;
}

function hideUntilEndOfDay(key: string) {
  try {
    const eod = new Date();
    eod.setHours(23, 59, 59, 999);
    localStorage.setItem(key, eod.toISOString());
  } catch { /* ignore */ }
}

export default function InstallPrompt() {
  const { t } = useTranslation();

  // === KakaoTalk browser warning ===
  const [showKakao, setShowKakao] = useState(false);
  const [kakaoHideToday, setKakaoHideToday] = useState(false);

  // === PWA install prompt ===
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installHideToday, setInstallHideToday] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();

    // 1. KakaoTalk in-app browser detection (highest priority)
    const isKakao = ua.includes('kakaotalk') || ua.includes('kakao');
    if (isKakao) {
      if (!isHiddenToday(KAKAO_DISMISS_KEY)) {
        setShowKakao(true);
      }
      return; // Don't show install prompt in KakaoTalk
    }

    // 2. PWA install prompt
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as unknown as { standalone?: boolean }).standalone === true) return;
    if (isHiddenToday(DISMISS_KEY)) return;

    const isiOS = /iphone|ipad|ipod/i.test(ua);
    if (isiOS) {
      setIsIOS(true);
      const timer = setTimeout(() => setShowInstall(true), 3000);
      return () => clearTimeout(timer);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setTimeout(() => setShowInstall(true), 2000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  // KakaoTalk handlers
  const handleKakaoOpen = useCallback(() => {
    const url = window.location.href;
    const ua = navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(ua);

    if (isiOS) {
      // iOS KakaoTalk: use KakaoTalk's openExternal scheme
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    } else {
      // Android: use intent scheme to open in Chrome
      window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    }
  }, []);

  const handleKakaoClose = useCallback(() => {
    if (kakaoHideToday) hideUntilEndOfDay(KAKAO_DISMISS_KEY);
    setShowKakao(false);
  }, [kakaoHideToday]);

  // PWA install handlers
  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setShowInstall(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleInstallDismiss = useCallback(() => {
    if (installHideToday) hideUntilEndOfDay(DISMISS_KEY);
    setShowInstall(false);
  }, [installHideToday]);

  return (
    <AnimatePresence>
      {/* KakaoTalk warning popup */}
      {showKakao && (
        <motion.div
          className="install-prompt-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="install-prompt-banner kakao-banner"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="kakao-icon">⚠️</div>
            <h3 className="kakao-title">{t('pwa.kakaoTitle')}</h3>
            <p className="kakao-desc">
              {t('pwa.kakaoDesc1')}<br />
              {t('pwa.kakaoDesc2')}<br />
              <strong>{t('pwa.kakaoDesc3')}</strong>{t('pwa.kakaoDesc4')}
            </p>
            <button className="btn btn-primary kakao-open-btn" onClick={handleKakaoOpen}>
              {t('pwa.openBrowser')}
            </button>
            <div className="install-prompt-bottom">
              <label className="install-prompt-checkbox">
                <input type="checkbox" checked={kakaoHideToday} onChange={(e) => setKakaoHideToday(e.target.checked)} />
                <span>{t('pwa.hideToday')}</span>
              </label>
              <button className="btn btn-ghost install-prompt-close" onClick={handleKakaoClose}>{t('pwa.close')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* PWA install prompt */}
      {showInstall && (
        <motion.div
          className="install-prompt-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="install-prompt-banner"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="install-prompt-content">
              <div className="install-prompt-icon">📲</div>
              <div className="install-prompt-text">
                <p className="install-prompt-title">{t('pwa.installTitle')}</p>
                {isIOS ? (
                  <p className="install-prompt-desc">{t('pwa.iosDesc')}</p>
                ) : (
                  <p className="install-prompt-desc">{t('pwa.androidDesc')}</p>
                )}
              </div>
            </div>
            <div className="install-prompt-actions">
              {!isIOS && deferredPrompt && (
                <button className="btn btn-primary install-prompt-install-btn" onClick={handleInstall}>
                  {t('pwa.installBtn')}
                </button>
              )}
              <div className="install-prompt-bottom">
                <label className="install-prompt-checkbox">
                  <input type="checkbox" checked={installHideToday} onChange={(e) => setInstallHideToday(e.target.checked)} />
                  <span>{t('pwa.hideToday')}</span>
                </label>
                <button className="btn btn-ghost install-prompt-close" onClick={handleInstallDismiss}>{t('pwa.close')}</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
