import { useState } from 'react';
import { Heart, ExternalLink, Brain, CheckCircle2, XCircle } from 'lucide-react';
import type { FeedItem } from '../types';
import { isPieceType } from '../types';
import { renderSummaryContent } from '../utils/summaryRenderer';
import { resolveInfographicData } from '../utils/infographicNormalizer';
import InfographicCard from './InfographicCard';

interface Props {
  item: FeedItem;
  compact?: boolean;
  onToggleFavorite: (id: string) => void;
  onAnswerQuiz: (id: string, optionIndex: number, correct: boolean) => void;
}

export default function FeedCard({ item, compact = false, onToggleFavorite, onAnswerQuiz }: Props) {
  const [selected, setSelected] = useState<number | null>(item.selectedOption ?? null);
  const answered = item.quizAnswered ?? selected !== null;

  const handleSelect = (idx: number) => {
    if (answered || !item.quiz) return;
    setSelected(idx);
    onAnswerQuiz(item.id, idx, item.quiz.options[idx]?.isCorrect ?? false);
  };

  const shellCls = compact
    ? 'feed-card rounded-2xl shadow-md border'
    : 'feed-card rounded-2xl border shadow-sm';

  if (item.type === 'infographic') {
    const data = resolveInfographicData(item);
    if (data) {
      return (
        <InfographicCard
          label={item.pieceLabel || data.label}
          data={data}
          compact={compact}
        />
      );
    }
  }

  if (item.type === 'quiz' && item.quiz) {
    const correctIdx = item.quiz.options.findIndex(o => o.isCorrect);
    const wasCorrect = answered && selected === correctIdx;

    const visibleIndices = answered
      ? wasCorrect
        ? [correctIdx]
        : [...new Set([selected!, correctIdx])].filter(i => i >= 0)
      : item.quiz.options.map((_, i) => i);

    return (
      <article className={`${shellCls} bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100`}>
        <div className="feed-card-body p-4 md:p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Ôn tập</span>
          </div>
          <h3 className="font-display text-base font-bold text-slate-800 mb-3 leading-snug">{item.quiz.question}</h3>
          <div className="space-y-1.5">
            {visibleIndices.map((i) => {
              const opt = item.quiz!.options[i];
              let cls = 'border-slate-200 bg-white hover:border-indigo-300';
              if (answered) {
                if (opt.isCorrect) cls = 'border-green-400 bg-green-50';
                else if (selected === i) cls = 'border-red-400 bg-red-50';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-xs md:text-sm ${cls}`}
                >
                  <span className="flex items-center gap-2">
                    {answered && opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                    {answered && selected === i && !opt.isCorrect && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>
          {answered && (
            <blockquote className="quiz-quote mt-4">
              <span className="quiz-quote-mark quiz-quote-mark--open" aria-hidden>"</span>
              <p className="quiz-quote-text">{item.quiz.explanation}</p>
              <span className="quiz-quote-mark quiz-quote-mark--close" aria-hidden>"</span>
            </blockquote>
          )}
        </div>
      </article>
    );
  }

  const isPiece = isPieceType(item.type);

  return (
    <article className={`${shellCls} bg-white border-slate-200/80`}>
      <div className="shrink-0 px-4 pt-4 pb-2 md:px-5 md:pt-4 border-b border-slate-100/80">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isPiece && item.pieceLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold uppercase tracking-wide">
                {item.pieceIndex != null && item.articleId && !item.articleId.startsWith('welcome') && (
                  <span className="text-brand-500">#{item.pieceIndex + 1}</span>
                )}
                {item.pieceLabel}
              </span>
            )}
          </div>
          <button
            onClick={() => onToggleFavorite(item.id)}
            className={`shrink-0 p-1.5 rounded-full transition-colors ${item.isFavorite ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-400 hover:bg-slate-50'}`}
          >
            <Heart className="w-4 h-4" fill={item.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="feed-card-body px-4 py-4 md:px-5 md:py-4 flex flex-col justify-center">
        <div className="summary-content text-slate-700">
          {renderSummaryContent(item.summary)}
        </div>

        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
          >
            <ExternalLink className="w-3 h-3" /> Xem bài gốc
          </a>
        )}
      </div>
    </article>
  );
}
