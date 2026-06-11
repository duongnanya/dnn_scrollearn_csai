import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link2, ClipboardPaste, Upload, Loader2, FileText, Plus, X } from 'lucide-react';

interface Props {
  articleTitle: string;
  onAnalyzeUrl: (url: string) => Promise<void>;
  onAnalyzeText: (text: string) => Promise<void>;
  onAnalyzeImage: (base64: string, mimeType: string) => Promise<void>;
  loading: boolean;
}

export default function InputPanel({ articleTitle, onAnalyzeUrl, onAnalyzeText, onAnalyzeImage, loading }: Props) {
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const closeModal = () => {
    setModalOpen(false);
    setError('');
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    const value = url.trim();
    setError('');
    setUrl('');
    closeModal();
    try {
      await onAnalyzeUrl(value);
    } catch (e) {
      setUrl(value);
      setError(e instanceof Error ? e.message : 'Lỗi phân tích URL');
      setModalOpen(true);
    }
  };

  const handleAnalyzeText = async () => {
    if (!textContent.trim()) return;
    const value = textContent.trim();
    setError('');
    setTextContent('');
    closeModal();
    try {
      await onAnalyzeText(value);
    } catch (e) {
      setTextContent(value);
      setError(e instanceof Error ? e.message : 'Lỗi phân tích văn bản');
      setModalOpen(true);
    }
  };

  const handlePasteToTextarea = async () => {
    setError('');
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText.trim()) {
        setTextContent(prev => (prev ? `${prev}\n\n${clipText.trim()}` : clipText.trim()));
        textRef.current?.focus();
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const base64 = await blobToBase64(blob);
            closeModal();
            try {
              await onAnalyzeImage(base64, type);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Lỗi phân tích ảnh');
              setModalOpen(true);
            }
            return;
          }
        }
      }
      setError('Clipboard trống — hãy copy nội dung bài viết trước');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được clipboard — thử Ctrl+V trực tiếp');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        closeModal();
        try {
          await onAnalyzeImage(base64, file.type);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Lỗi phân tích ảnh');
          setModalOpen(true);
        }
      } else {
        const text = await file.text();
        setTextContent(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xử lý file');
    }
    e.target.value = '';
  };

  return (
    <>
      <div className="shrink-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-3 py-2.5 md:px-4 md:py-3 shadow-sm z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <h2 className="flex-1 min-w-0 font-display text-sm md:text-base font-bold text-slate-900 leading-snug line-clamp-2">
            {articleTitle}
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="whitespace-nowrap">Thêm nguồn</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="add-source-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 32 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-display text-base font-bold text-slate-900">Thêm nguồn</h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Từ URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUrl()}
                    placeholder="https://..."
                    autoFocus
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  />
                  <button
                    onClick={handleUrl}
                    disabled={loading || !url.trim()}
                    className="shrink-0 h-10 px-4 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Phân tích
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">hoặc</span></div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dán nội dung</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handlePasteToTextarea}
                      disabled={loading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ClipboardPaste className="w-3 h-3" /> Clipboard
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={loading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Upload className="w-3 h-3" /> File
                    </button>
                  </div>
                </div>
                <textarea
                  ref={textRef}
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Ctrl+V dán bài viết vào đây..."
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
                <button
                  onClick={handleAnalyzeText}
                  disabled={loading || !textContent.trim()}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Phân tích nội dung
                </button>
                <input ref={fileRef} type="file" accept=".txt,.md,image/*" className="hidden" onChange={handleFile} />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToBase64(file: File): Promise<string> {
  return blobToBase64(file);
}
