import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
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
            <h3 className="kakao-title">카카오톡 브라우저 안내</h3>
            <p className="kakao-desc">
              카카오톡 브라우저에서 접속하셨습니다.<br />
              카톡 알림이 오면 게임이 튕길 수 있어요!<br />
              <strong>다른 브라우저</strong>로 열면 안정적으로 즐길 수 있습니다.
            </p>
            <button className="btn btn-primary kakao-open-btn" onClick={handleKakaoOpen}>
              🌐 외부 브라우저로 열기
            </button>
            <div className="install-prompt-bottom">
              <label className="install-prompt-checkbox">
                <input type="checkbox" checked={kakaoHideToday} onChange={(e) => setKakaoHideToday(e.target.checked)} />
                <span>오늘 하루 보지 않기</span>
              </label>
              <button className="btn btn-ghost install-prompt-close" onClick={handleKakaoClose}>닫기</button>
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
                <p className="install-prompt-title">홈 화면에 추가하세요!</p>
                {isIOS ? (
                  <p className="install-prompt-desc">
                    Safari 하단 공유 버튼(□↑)을 누르고 &apos;홈 화면에 추가&apos;를 선택하면 앱처럼 사용할 수 있어요!
                  </p>
                ) : (
                  <p className="install-prompt-desc">
                    앱처럼 바로 실행할 수 있어요! 설치 버튼을 눌러보세요.
                  </p>
                )}
              </div>
            </div>
            <div className="install-prompt-actions">
              {!isIOS && deferredPrompt && (
                <button className="btn btn-primary install-prompt-install-btn" onClick={handleInstall}>
                  홈 화면에 추가
                </button>
              )}
              <div className="install-prompt-bottom">
                <label className="install-prompt-checkbox">
                  <input type="checkbox" checked={installHideToday} onChange={(e) => setInstallHideToday(e.target.checked)} />
                  <span>오늘 하루 보지 않기</span>
                </label>
                <button className="btn btn-ghost install-prompt-close" onClick={handleInstallDismiss}>닫기</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
