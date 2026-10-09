import React from 'react';

interface ProgressBarProps {
  percent: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percent }) => {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${clampedPercent}%` }}
      />
      <div className="progress-text">{clampedPercent.toFixed(1)}%</div>
    </div>
  );
};
