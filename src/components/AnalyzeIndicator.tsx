import { Loader2, Sparkles, Link2, FileText, ImageIcon } from 'lucide-react';

export type AnalyzeSourceKind = 'url' | 'text' | 'image';

export interface AnalyzeSource {
  kind: AnalyzeSourceKind;
  label: string;
  imageUrl?: string;
}

export interface AnalyzeStatus {
  label: string;
  step: number;
  total: number;
  source?: AnalyzeSource;
}

interface Props {
  status: AnalyzeStatus;
}

const SOURCE_ICON = {
  url: Link2,
  text: FileText,
  image: ImageIcon,
} as const;

export default function AnalyzeIndicator({ status }: Props) {
  const pct = Math.round((status.step / status.total) * 100);
  const SourceIcon = status.source ? SOURCE_ICON[status.source.kind] : null;

  return (
    <div className="analyze-indicator shrink-0 w-full max-w-2xl mx-auto px-3 md:px-4">
      <div className="px-4 py-3 rounded-xl bg-brand-50 border border-brand-100 shadow-sm space-y-2.5">
        {status.source && (
          <div className="flex items-start gap-2.5 min-w-0 pb-2.5 border-b border-brand-100/80">
            {status.source.kind === 'image' && status.source.imageUrl ? (
              <img
                src={status.source.imageUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-brand-200 shrink-0"
              />
            ) : SourceIcon ? (
              <div className="w-10 h-10 rounded-lg bg-white border border-brand-200 flex items-center justify-center shrink-0">
                <SourceIcon className="w-4 h-4 text-brand-600" />
              </div>
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500 mb-0.5">
                {status.source.kind === 'url' ? 'URL' : status.source.kind === 'text' ? 'Văn bản' : 'Ảnh'}
              </p>
              <p className={`text-xs text-brand-800 ${status.source.kind === 'text' ? 'line-clamp-2 leading-relaxed' : 'truncate'}`}>
                {status.source.label}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
            <Sparkles className="w-3 h-3 text-brand-400 absolute -top-1 -right-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-800 truncate">{status.label}</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-brand-100 overflow-hidden">
              <div
                className="analyze-progress-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-brand-500 mt-1">Bước {status.step}/{status.total}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
