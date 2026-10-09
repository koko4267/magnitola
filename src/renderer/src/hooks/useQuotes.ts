import { useState, useEffect } from 'react';
import { useDownloadStore } from '../state/downloadStore';
import { useSettingsStore } from '../state/settingsStore';
import { LOCALES } from '../localization/locales';

export function useQuotes() {
  const { url, isDownloading } = useDownloadStore();
  const { language } = useSettingsStore();
  const quotes = LOCALES[language].quotes;

  const [quoteIndex, setQuoteIndex] = useState(0);

  const isVisible = url.trim().length > 0 || isDownloading;

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible, quotes.length]);

  return {
    isVisible,
    currentQuote: quotes[quoteIndex % quotes.length]
  };
}
