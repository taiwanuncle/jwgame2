import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'zh-TW', label: '繁體中文' },
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem('app_lang', code); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="language-toggle" ref={ref}>
      <button
        className="btn btn-ghost language-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        title="Language"
      >
        🌐
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="language-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
                onClick={() => handleSelect(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
