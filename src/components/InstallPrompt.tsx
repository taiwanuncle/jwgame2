import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './InstallPrompt.css';

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as unknown as { standalone?: boolean }).standalone === true) return;

    // Check if dismissed
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < DISMISS_DURATION) return;
      }
    } catch { /* ignore */ }

    const ua = navigator.userAgent;
    const isiOS = /iphone|ipad|ipod/i.test(ua);

    if (isiOS) {
      setIsIOS(true);
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setTimeout(() => setShow(true), 2000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      } catch { /* ignore */ }
    }
    setShow(false);
  }, [dontShowAgain]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
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
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                  />
                  <span>다시 보지 않기</span>
                </label>
                <button className="btn btn-ghost install-prompt-close" onClick={handleDismiss}>
                  닫기
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
