import React from 'react';
import { useQuotes } from '../../hooks/useQuotes';

export const QuoteBox: React.FC = () => {
  const { isVisible, currentQuote } = useQuotes();

  if (!isVisible) return null;

  return (
    <div className="quote-box">
      💬 «{currentQuote}»
    </div>
  );
};
