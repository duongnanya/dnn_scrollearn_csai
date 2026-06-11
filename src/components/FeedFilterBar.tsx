import { BookOpen, Brain, BarChart3, Layers, type LucideIcon } from 'lucide-react';
type BarFilter = 'all' | 'summary' | 'infographic' | 'quiz';

const FEED_FILTERS: { key: BarFilter; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: 'Hỗn hợp', icon: Layers },
  { key: 'summary', label: 'Mảnh tin', icon: BookOpen },
  { key: 'infographic', label: 'Số liệu', icon: BarChart3 },
  { key: 'quiz', label: 'Ôn tập', icon: Brain },
];

interface Props {
  filter: BarFilter;
  counts: Record<BarFilter, number>;
  onChange: (f: BarFilter) => void;
}

export default function FeedFilterBar({ filter, onChange, counts }: Props) {
  return (
    <div className="feed-filter-bar shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="flex justify-center items-stretch gap-1.5 sm:gap-2 px-3 py-2.5 max-w-lg mx-auto">
        {FEED_FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onChange(f.key)}
              className={`flex-1 max-w-[5.5rem] flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all ${active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}
            >
              <f.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
              <span className="text-[10px] font-medium leading-tight">{f.label}</span>
              <span className={`text-[9px] ${active ? 'text-brand-100' : 'text-slate-400'}`}>{counts[f.key]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
