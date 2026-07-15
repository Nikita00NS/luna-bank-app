import React from 'react';
import { usePriceChart } from '../hooks/usePriceChart';

interface Props {
  coinId: string;
  days?: number;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export default function PriceChart({ coinId, days = 7, width = 300, height = 100, showLabels = true }: Props) {
  const { data, loading, change, chartPath } = usePriceChart(coinId, days);

  if (loading && data.length === 0) {
    return <div className="skeleton rounded-xl" style={{ width, height }} />;
  }

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Нет данных</span>
      </div>
    );
  }

  const path = chartPath(width, height);
  const isUp = change >= 0;
  const color = isUp ? 'var(--green)' : 'var(--red)';
  const fillColor = isUp ? 'rgba(0,210,160,0.05)' : 'rgba(255,71,87,0.05)';

  // Create fill path (closed shape)
  const fillPath = path + ` L${width},${height} L0,${height} Z`;

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Gradient fill */}
        <defs>
          <linearGradient id={`grad-${coinId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path d={fillPath} fill={`url(#grad-${coinId})`} />
        
        {/* Line */}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* End dot */}
        {data.length > 0 && (() => {
          const last = data[data.length - 1];
          const minPrice = Math.min(...data.map(d => d.price));
          const maxPrice = Math.max(...data.map(d => d.price));
          const range = maxPrice - minPrice || 1;
          const y = height - ((last.price - minPrice) / range) * height;
          return <circle cx={width - 2} cy={y} r="3" fill={color} />;
        })()}
      </svg>
      
      {showLabels && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            ${data[0]?.price.toFixed(2) || ''}
          </span>
          <span className={`text-[10px] font-medium ${isUp ? 'price-up' : 'price-down'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            ${data[data.length - 1]?.price.toFixed(2) || ''}
          </span>
        </div>
      )}
    </div>
  );
}