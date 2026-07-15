/**
 * Luna Wallet v2 — usePriceChart hook
 * Fetches price history data for chart rendering
 */

import { useState, useEffect, useCallback } from 'react';
import { getHistory } from '../lib/coingecko';

export interface PricePoint {
  timestamp: number;
  price: number;
}

export function usePriceChart(coinId: string, days: number = 7) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [change, setChange] = useState(0);

  const fetch = useCallback(async () => {
    if (!coinId) return;
    setLoading(true);
    try {
      const result = await getHistory(coinId, days);
      if (result?.prices) {
        const points: PricePoint[] = result.prices.map((p: [number, number]) => ({
          timestamp: p[0],
          price: p[1],
        }));
        setData(points);
        if (points.length >= 2) {
          const first = points[0].price;
          const last = points[points.length - 1].price;
          setChange(first > 0 ? ((last - first) / first) * 100 : 0);
        }
      }
    } catch {}
    setLoading(false);
  }, [coinId, days]);

  useEffect(() => { fetch(); }, [fetch]);

  // Simple SVG chart path generator
  const chartPath = useCallback((width: number, height: number): string => {
    if (data.length < 2) return '';
    const minPrice = Math.min(...data.map(d => d.price));
    const maxPrice = Math.max(...data.map(d => d.price));
    const range = maxPrice - minPrice || 1;
    const stepX = width / (data.length - 1);
    
    return data.map((d, i) => {
      const x = i * stepX;
      const y = height - ((d.price - minPrice) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [data]);

  return { data, loading, change, chartPath, refresh: fetch };
}