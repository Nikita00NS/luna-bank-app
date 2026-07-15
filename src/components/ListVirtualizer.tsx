/**
 * Luna Wallet v2 — Simple Virtual List
 * Renders only visible items for performance
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';

interface Props<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
}

function VirtualListInner<T>({ items, renderItem, itemHeight, overscan = 5, className, style }: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div ref={containerRef} onScroll={handleScroll} className={className} style={{ overflowY: 'auto', ...style }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIndex * itemHeight, left: 0, right: 0 }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Memoize the component
const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

export default VirtualList;