import { AnimatePresence, motion } from 'motion/react';
import { X, Brain, BarChart3, Layers } from 'lucide-react';
import type { FeedItem } from '../types';
import { isPieceType } from '../types';
import { getFeedItemBadgeLabel } from '../utils/feedItemLabel';

interface Props {
  open: boolean;
  items: FeedItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

function ItemIcon({ item }: { item: FeedItem }) {
  if (item.type === 'quiz') return <Brain className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
  if (item.type === 'infographic') return <BarChart3 className="w-3.5 h-3.5 text-teal-600 shrink-0" />;
  if (isPieceType(item.type)) return <Layers className="w-3.5 h-3.5 text-brand-600 shrink-0" />;
  return null;
}

export default function FeedOutlineModal({ open, items, activeIndex, onSelect, onClose }: Props) {
  const handleSelect = (index: number) => {
    onSelect(index);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
      <motion.div
        key="feed-outline-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[75vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Danh sách thẻ</h3>
              <p className="text-xs text-slate-400 mt-0.5">{items.length} mục</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <ul className="overflow-y-auto px-3 py-2">
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              const badge = getFeedItemBadgeLabel(item);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleSelect(index)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition-colors ${
                      isActive
                        ? 'bg-brand-50 border border-brand-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-semibold tabular-nums shrink-0 w-5 text-center ${isActive ? 'text-brand-600' : 'text-slate-400'}`}>
                        {index + 1}
                      </span>
                      <ItemIcon item={item} />
                      <span className={`text-xs font-semibold uppercase tracking-wide truncate ${isActive ? 'text-brand-700' : 'text-slate-700'}`}>
                        {badge}
                      </span>
                    </div>
                    {item.type === 'quiz' && item.quiz && (
                      <p className="text-[11px] text-slate-500 mt-1 ml-7 line-clamp-2 leading-snug">{item.quiz.question}</p>
                    )}
                    {item.title && item.type !== 'quiz' && (
                      <p className="text-[11px] text-slate-400 mt-0.5 ml-7 line-clamp-1">{item.title}</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
