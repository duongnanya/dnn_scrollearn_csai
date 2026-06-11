import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import FeedCard from './FeedCard';
import type { FeedItem } from '../types';

export interface FeedScrollerHandle {
  scrollTo: (direction: 'up' | 'down') => void;
  scrollToIndex: (index: number) => void;
}

interface Props {
  items: FeedItem[];
  onToggleFavorite: (id: string) => void;
  onAnswerQuiz: (id: string, optionIndex: number, correct: boolean) => void;
  onSlideChange?: (index: number, total: number) => void;
}

const FeedScroller = forwardRef<FeedScrollerHandle, Props>(function FeedScroller(
  { items, onToggleFavorite, onAnswerQuiz, onSlideChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const metricsRef = useRef({ stride: 0, peek: 0 });

  const updateMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight;
    metricsRef.current = { stride: h * 0.7, peek: h * 0.15 };
  }, []);

  const syncActiveIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el || items.length === 0) return;
    const { stride } = metricsRef.current;
    if (!stride) return;
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / stride)));
    setActiveIndex(idx);
  }, [items.length]);

  useEffect(() => {
    updateMetrics();
    const el = containerRef.current;
    if (!el) return;
    const applyVars = () => {
      updateMetrics();
      const h = el.clientHeight;
      el.style.setProperty('--peek-h', `${h * 0.15}px`);
      el.style.setProperty('--slot-h', `${h * 0.7}px`);
      el.style.setProperty('--stride', `${h * 0.7}px`);
    };
    applyVars();
    const ro = new ResizeObserver(applyVars);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateMetrics]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => syncActiveIndex();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [syncActiveIndex]);

  useEffect(() => {
    slotRefs.current = slotRefs.current.slice(0, items.length);
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [items.length, items[0]?.id]);

  useEffect(() => {
    onSlideChange?.(activeIndex, items.length);
  }, [activeIndex, items.length, onSlideChange]);

  const scrollToIndex = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el || items.length === 0) return;
    const { stride } = metricsRef.current;
    const target = Math.max(0, Math.min(items.length - 1, index));
    el.scrollTo({ top: target * stride, behavior: 'smooth' });
  }, [items.length]);

  useImperativeHandle(ref, () => ({
    scrollTo: (direction: 'up' | 'down') => {
      scrollToIndex(activeIndex + (direction === 'up' ? -1 : 1));
    },
    scrollToIndex,
  }), [activeIndex, scrollToIndex]);

  const getSlotState = (index: number) => {
    const dist = Math.abs(index - activeIndex);
    if (dist === 0) return 'active';
    if (dist === 1) return 'adjacent';
    return 'distant';
  };

  if (items.length === 0) {
    return (
      <div className="feed-scroll-viewport flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chưa có nội dung. Hãy dán URL để bắt đầu!</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="feed-scroll-viewport">
      <div className="feed-track">
        {items.map((item, index) => (
          <div
            key={item.id}
            ref={el => { slotRefs.current[index] = el; }}
            className={`feed-slot feed-slot--${getSlotState(index)}`}
            data-index={index}
          >
            <div className="feed-card-shell">
              <FeedCard
                item={item}
                compact
                onToggleFavorite={onToggleFavorite}
                onAnswerQuiz={onAnswerQuiz}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default FeedScroller;
