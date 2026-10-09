import React from 'react';
import { useSettingsStore } from '../../state/settingsStore';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useSettingsStore();

  const handleToggle = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <button
      className="single-lang-btn"
      onClick={handleToggle}
      title={language === 'ru' ? 'Switch language to English' : 'Переключить на русский'}
    >
      <svg className="flag-icon" viewBox="0 0 640 480">
        {language === 'ru' ? (
          <>
            <rect width="640" height="160" fill="#ffffff" />
            <rect y="160" width="640" height="160" fill="#0039a6" />
            <rect y="320" width="640" height="160" fill="#d52b1e" />
          </>
        ) : (
          <>
            <rect width="640" height="480" fill="#bf0a30" />
            <rect y="37" width="640" height="37" fill="#ffffff" />
            <rect y="111" width="640" height="37" fill="#ffffff" />
            <rect y="185" width="640" height="37" fill="#ffffff" />
            <rect y="259" width="640" height="37" fill="#ffffff" />
            <rect y="333" width="640" height="37" fill="#ffffff" />
            <rect y="407" width="640" height="37" fill="#ffffff" />
            <rect width="260" height="259" fill="#002868" />
          </>
        )}
      </svg>
      <span>{language === 'ru' ? 'RU' : 'EN'}</span>
    </button>
  );
};
