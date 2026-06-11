import { useState } from 'react';
import { X, Flame } from 'lucide-react';
import type { UserSettings, QuizFrequency } from '../types';

interface Props {
  settings: UserSettings;
  onSave: (s: UserSettings) => void;
  onClose: () => void;
}

const FREQ_OPTIONS: { value: QuizFrequency; label: string; desc: string }[] = [
  { value: 'low', label: 'Chậm', desc: '1 quiz / 5 bài' },
  { value: 'medium', label: 'Vừa', desc: '1 quiz / 3 bài' },
  { value: 'high', label: 'Nhanh', desc: '1 quiz / 2 bài' },
  { value: 'max', label: 'Tối đa', desc: '1 quiz / 1 bài' },
];

export default function PersonalizationModal({ settings, onSave, onClose }: Props) {
  const [local, setLocal] = useState(settings);
  const [interestInput, setInterestInput] = useState('');

  const addInterest = () => {
    const tag = interestInput.trim();
    if (!tag || local.interests.includes(tag)) return;
    setLocal({ ...local, interests: [...local.interests, tag] });
    setInterestInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold">Cá nhân hóa</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center gap-3 mb-5 p-3 bg-orange-50 rounded-xl">
          <Flame className="w-6 h-6 text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-orange-700">{local.streakCount} ngày liên tiếp</p>
            <p className="text-xs text-orange-600/80">Tiếp tục đọc mỗi ngày để duy trì streak</p>
          </div>
        </div>

        <label className="text-sm font-medium text-slate-700 mb-2 block">Tần suất ôn tập</label>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {FREQ_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setLocal({ ...local, quizFrequency: opt.value })}
              className={`p-3 rounded-xl border text-left text-sm transition-all ${local.quizFrequency === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="font-semibold block">{opt.label}</span>
              <span className="text-xs text-slate-500">{opt.desc}</span>
            </button>
          ))}
        </div>

        <label className="text-sm font-medium text-slate-700 mb-2 block">Chủ đề quan tâm</label>
        <div className="flex gap-2 mb-2">
          <input
            value={interestInput}
            onChange={e => setInterestInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addInterest()}
            placeholder="VD: AI, Kinh tế..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button onClick={addInterest} className="px-3 py-2 rounded-lg bg-slate-100 text-sm hover:bg-slate-200">Thêm</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {local.interests.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium flex items-center gap-1">
              {tag}
              <button onClick={() => setLocal({ ...local, interests: local.interests.filter(t => t !== tag) })} className="hover:text-red-500">×</button>
            </span>
          ))}
        </div>

        <button
          onClick={() => { onSave(local); onClose(); }}
          className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700"
        >
          Lưu cài đặt
        </button>
      </div>
    </div>
  );
}
