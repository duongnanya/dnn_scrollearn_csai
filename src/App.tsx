import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Heart, Settings, LogOut, ChevronUp, ChevronDown,
  Flame, Target, User, PanelLeft, X, Menu
} from 'lucide-react';
import FeedScroller, { type FeedScrollerHandle } from './components/FeedScroller';
import FeedFilterBar from './components/FeedFilterBar';
import InputPanel from './components/InputPanel';
import AnalyzeIndicator, { type AnalyzeStatus, type AnalyzeSource } from './components/AnalyzeIndicator';
import PersonalizationModal from './components/PersonalizationModal';
import FeedOutlineModal from './components/FeedOutlineModal';
import {
  auth, db, isFirebaseConfigured,
  onAuthStateChanged, signInGoogle, signInGuest, signInEmail, signUpEmail, logout,
  subscribeFeed, saveFeedItem, updateFeedItem, subscribeSettings, saveSettings,
  type User as FirebaseUser,
} from './firebase';
import type { FeedItem, FeedFilter, AnalyzeResult, UserSettings } from './types';
import { DEFAULT_SETTINGS, isPieceType } from './types';
import { buildArticleFeedItems, buildMixedFeed, stampCreatedAt } from './utils/feedBuilder';
import { deriveInfographicFeedItems, extractInfographics } from './utils/infographicExtractor';
import { resolveInfographicData } from './utils/infographicNormalizer';

const WELCOME_ITEMS: FeedItem[] = [
  {
    id: 'welcome-p0',
    type: 'piece',
    articleId: 'welcome',
    pieceIndex: 0,
    pieceLabel: 'Bắt đầu',
    title: 'ScrollRecall',
    summary: 'Dán URL hoặc nội dung bài viết — AI sẽ chia thành các mảnh nhỏ dễ lướt.',
    createdAt: 4,
  },
  {
    id: 'welcome-p1',
    type: 'piece',
    articleId: 'welcome',
    pieceIndex: 1,
    pieceLabel: 'Cách hoạt động',
    title: 'ScrollRecall',
    summary: '- Mỗi lần scroll = 1 mảnh kiến thức ngắn\n- Quiz xen kẽ giúp ghi nhớ lâu hơn\n- Lưu yêu thích & đồng bộ đa thiết bị',
    createdAt: 3,
  },
  {
    id: 'welcome-q0',
    type: 'quiz',
    articleId: 'welcome',
    title: 'ScrollRecall',
    summary: '',
    quiz: {
      question: 'Active Recall là gì?',
      options: [
        { text: 'Đọc lại nhiều lần cho thuộc', isCorrect: false },
        { text: 'Tự nhớ lại kiến thức đã học (test bản thân)', isCorrect: true },
        { text: 'Ghi chép word-for-word', isCorrect: false },
        { text: 'Nghe podcast liên tục', isCorrect: false },
      ],
      explanation: 'Active Recall — tự kiểm tra trí nhớ — hiệu quả hơn đọc thụ động.',
    },
    createdAt: 2,
  },
  {
    id: 'welcome-p2',
    type: 'piece',
    articleId: 'welcome',
    pieceIndex: 2,
    pieceLabel: 'Mẹo',
    title: 'ScrollRecall',
    summary: 'URL không tải được? Copy bài viết → dán vào ô văn bản → Phân tích nội dung.',
    createdAt: 1,
  },
];

const LS_FEED = 'scrollrecall_feed';
const LS_SETTINGS = 'scrollrecall_settings';
const LS_SIDEBAR_LEFT = 'scrollrecall_sidebar_left';

function loadSidebarPref(key: string, defaultOpen = true) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultOpen;
    return v === 'true';
  } catch { return defaultOpen; }
}

function loadLocalFeed(): FeedItem[] {
  try { return JSON.parse(localStorage.getItem(LS_FEED) || '[]'); } catch { return []; }
}
function saveLocalFeed(items: FeedItem[]) {
  localStorage.setItem(LS_FEED, JSON.stringify(items));
}
function loadLocalSettings(): UserSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}') }; } catch { return DEFAULT_SETTINGS; }
}
function saveLocalSettings(s: UserSettings) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}

async function apiCall<T>(endpoint: string, body: object): Promise<T> {
  const base = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
  let res: Response;
  try {
    res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Không kết nối được server. Hãy chạy npm run dev và thử lại.');
  }
  let data: { error?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error('Phản hồi server không hợp lệ');
  }
  if (!res.ok) throw new Error(data.error || 'Lỗi server');
  return data as T;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [analyzeStatus, setAnalyzeStatus] = useState<AnalyzeStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [hasRealContent, setHasRealContent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const feedScrollerRef = useRef<FeedScrollerHandle>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideTotal, setSlideTotal] = useState(0);
  const [leftOpen, setLeftOpen] = useState(() => loadSidebarPref(LS_SIDEBAR_LEFT));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  useEffect(() => { localStorage.setItem(LS_SIDEBAR_LEFT, String(leftOpen)); }, [leftOpen]);

  // Auth listener
  useEffect(() => {
    if (!auth) {
      setFeed(loadLocalFeed());
      setSettings(loadLocalSettings());
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        try { await signInGuest(); } catch { /* guest fail ok */ }
      }
    });
  }, []);

  // Feed sync
  useEffect(() => {
    if (!user) return;
    if (isFirebaseConfigured && db) {
      const unsubFeed = subscribeFeed(user.uid, (items) => {
        setFeed(items);
        setHasRealContent(items.some(i => !i.id.startsWith('welcome')));
      });
      const unsubSettings = subscribeSettings(user.uid, setSettings);
      return () => { unsubFeed(); unsubSettings(); };
    }
    setFeed(loadLocalFeed());
    setSettings(loadLocalSettings());
  }, [user]);

  const persistItem = useCallback(async (item: FeedItem) => {
    if (user && isFirebaseConfigured) {
      await saveFeedItem(user.uid, item);
    } else {
      setFeed(prev => {
        const next = [item, ...prev.filter(i => i.id !== item.id)];
        saveLocalFeed(next);
        return next;
      });
    }
  }, [user]);

  const saveAnalyzeResult = useCallback(async (result: AnalyzeResult, sourceUrl?: string) => {
    setAnalyzeStatus(prev => prev ? { ...prev, label: 'Đang chia mảnh tin & tạo quiz...', step: 2 } : null);
    const articleId = `a-${Date.now()}`;
    const rawItems = buildArticleFeedItems(result, articleId, sourceUrl, settings.quizFrequency);
    const items = stampCreatedAt(rawItems);
    setAnalyzeStatus(prev => prev ? { ...prev, label: 'Đang lưu vào feed...', step: 3 } : null);
    for (const item of items) {
      await persistItem(item);
    }
    setHasRealContent(true);
    updateStreak();
  }, [persistItem, settings.quizFrequency]);

  const runAnalyze = useCallback(async (
    fetchResult: () => Promise<AnalyzeResult>,
    labels: { fetch: string; sourceUrl?: string; source?: AnalyzeSource },
  ) => {
    setAnalyzeStatus({ label: labels.fetch, step: 1, total: 3, source: labels.source });
    try {
      const result = await fetchResult();
      await saveAnalyzeResult(result, labels.sourceUrl);
    } finally {
      setAnalyzeStatus(null);
    }
  }, [saveAnalyzeResult]);

  const textPreview = (text: string, max = 140) => {
    const t = text.trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  };

  const updateStreak = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const newSettings = { ...settings };
    if (newSettings.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      newSettings.streakCount = newSettings.lastActiveDate === yesterday ? newSettings.streakCount + 1 : 1;
      newSettings.lastActiveDate = today;
      setSettings(newSettings);
      if (user && isFirebaseConfigured) await saveSettings(user.uid, newSettings);
      else saveLocalSettings(newSettings);
    }
  };

  const displayFeed = useMemo(() => {
    const base = hasRealContent ? feed : [...WELCOME_ITEMS, ...feed.filter(i => !i.id.startsWith('welcome'))];
    const sorted = [...base].sort((a, b) => b.createdAt - a.createdAt);

    switch (filter) {
      case 'summary': return sorted.filter(i => isPieceType(i.type));
      case 'infographic': {
        const stored = sorted.filter(i => i.type === 'infographic' && resolveInfographicData(i));
        if (stored.length) return stored;
        return sorted
          .filter(i => isPieceType(i.type) && !i.id.startsWith('welcome'))
          .flatMap(p => deriveInfographicFeedItems(p))
          .filter(i => resolveInfographicData(i));
      }
      case 'quiz': return sorted.filter(i => i.type === 'quiz');
      case 'favorites': return sorted.filter(i => i.isFavorite);
      default: {
        const stream = sorted.filter(i => i.type !== 'infographic');
        if (!hasRealContent) return stream;
        const hasLegacy = stream.some(i => !i.articleId && !i.id.startsWith('welcome'));
        return hasLegacy ? buildMixedFeed(stream, settings.quizFrequency) : stream;
      }
    }
  }, [feed, filter, hasRealContent, settings.quizFrequency]);

  const counts = useMemo(() => {
    const real = feed.filter(i => !i.id.startsWith('welcome'));
    const igStored = real.filter(i => i.type === 'infographic' && resolveInfographicData(i)).length;
    const igDerived = igStored || real
      .filter(i => isPieceType(i.type))
      .reduce((n, p) => n + extractInfographics(p.summary, p.pieceLabel || '').items.length, 0);
    return {
      all: real.filter(i => i.type !== 'infographic').length,
      summary: real.filter(i => isPieceType(i.type)).length,
      infographic: igDerived,
      quiz: real.filter(i => i.type === 'quiz').length,
      favorites: real.filter(i => i.isFavorite).length,
    };
  }, [feed]);

  const accuracy = settings.totalQuizzes > 0
    ? Math.round((settings.correctQuizzes / settings.totalQuizzes) * 100) : 0;

  const handleToggleFavorite = async (id: string) => {
    const item = feed.find(i => i.id === id);
    if (!item) return;
    const data = { isFavorite: !item.isFavorite };
    if (user && isFirebaseConfigured) await updateFeedItem(user.uid, id, data);
    else setFeed(prev => { const next = prev.map(i => i.id === id ? { ...i, ...data } : i); saveLocalFeed(next); return next; });
  };

  const handleAnswerQuiz = async (id: string, optionIndex: number, correct: boolean) => {
    const data = { quizAnswered: true, quizCorrect: correct, selectedOption: optionIndex };
    if (user && isFirebaseConfigured) await updateFeedItem(user.uid, id, data);
    else setFeed(prev => { const next = prev.map(i => i.id === id ? { ...i, ...data } : i); saveLocalFeed(next); return next; });
    const newSettings = {
      ...settings,
      totalQuizzes: settings.totalQuizzes + 1,
      correctQuizzes: settings.correctQuizzes + (correct ? 1 : 0),
    };
    setSettings(newSettings);
    if (user && isFirebaseConfigured) await saveSettings(user.uid, newSettings);
    else saveLocalSettings(newSettings);
  };

  const handleSlideChange = useCallback((index: number, total: number) => {
    setSlideIndex(index);
    setSlideTotal(total);
  }, []);

  const scrollToCard = (direction: 'up' | 'down') => {
    feedScrollerRef.current?.scrollTo(direction);
  };

  const atFirstSlide = slideTotal === 0 || slideIndex === 0;
  const atLastSlide = slideTotal === 0 || slideIndex >= slideTotal - 1;

  const currentArticleTitle = useMemo(() => {
    if (displayFeed.length === 0) return 'ScrollRecall';
    const item = displayFeed[slideIndex] ?? displayFeed[0];
    if (item.id.startsWith('welcome')) return 'ScrollRecall';
    return item.title || 'Bài viết';
  }, [displayFeed, slideIndex]);

  const statsContent = (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thống kê</p>
      <div className="p-3 rounded-xl bg-brand-50 border border-brand-100">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-brand-700">Độ chính xác</span>
        </div>
        <p className="text-2xl font-display font-bold text-brand-700">{accuracy}%</p>
        <p className="text-xs text-brand-600/70">{settings.correctQuizzes}/{settings.totalQuizzes} câu đúng</p>
      </div>
      <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-semibold text-orange-700">Streak</span>
        </div>
        <p className="text-2xl font-display font-bold text-orange-600">{settings.streakCount}</p>
        <p className="text-xs text-orange-600/70">ngày liên tiếp</p>
      </div>
      {settings.interests.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Chủ đề quan tâm</p>
          <div className="flex flex-wrap gap-1.5">
            {settings.interests.map(tag => (
              <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-600">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const navContent = (
    <>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
        {statsContent}
        <button
          onClick={() => { setFilter('favorites'); setMobileMenuOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${filter === 'favorites' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 border border-slate-100'}`}
        >
          <Heart className="w-4 h-4" />
          Yêu thích
          <span className="ml-auto text-xs bg-slate-100 px-2 py-0.5 rounded-full">{counts.favorites}</span>
        </button>
      </div>
      <div className="border-t border-slate-100 pt-4 space-y-2 shrink-0">
        <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
          <Settings className="w-4 h-4" /> Cài đặt
        </button>
        {user && !user.isAnonymous ? (
          <button onClick={() => logout()} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        ) : (
          <button onClick={() => setShowAuth(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-brand-600 hover:bg-brand-50">
            <User className="w-4 h-4" /> Đăng nhập
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar trái — desktop */}
      <motion.aside
        initial={false}
        animate={{ width: leftOpen ? 256 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="hidden md:flex flex-col shrink-0 border-r border-slate-200 bg-white overflow-hidden h-screen"
      >
        <div className="w-64 h-full flex flex-col p-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h1 className="font-display text-xl font-bold text-brand-700">ScrollRecall</h1>
              <p className="text-xs text-slate-500 mt-0.5">Đọc nhanh · Nhớ lâu</p>
            </div>
            <button
              onClick={() => setLeftOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Ẩn menu"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-5 flex flex-col flex-1 min-h-0">{navContent}</div>
        </div>
      </motion.aside>

      {/* Drawer trái — mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <motion.aside
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-display text-lg font-bold text-brand-700">ScrollRecall</h1>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex flex-col flex-1 min-h-0">{navContent}</div>
          </motion.aside>
        </div>
      )}

      {/* Feed chính */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden gap-3 relative">
        {/* Nút mở menu trái — desktop */}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            className="hidden md:flex fixed top-3 left-3 z-30 items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-md text-xs text-slate-700 hover:bg-slate-50"
            title="Mở menu"
          >
            <PanelLeft className="w-4 h-4" /> Menu
          </button>
        )}

        {/* Mobile header */}
        <div className="md:hidden shrink-0 px-3 pt-2 pb-2 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Mở menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="font-display text-base font-bold text-brand-700 flex-1">ScrollRecall</h1>
          </div>
        </div>

        <InputPanel
          articleTitle={currentArticleTitle}
          loading={!!analyzeStatus}
          onAnalyzeUrl={async (url) => runAnalyze(
            () => apiCall<AnalyzeResult>('/analyze-url', { url }),
            {
              fetch: 'Đang tải URL & phân tích AI...',
              sourceUrl: url,
              source: { kind: 'url', label: url },
            },
          )}
          onAnalyzeText={async (text) => runAnalyze(
            () => apiCall<AnalyzeResult>('/analyze-text', { text }),
            {
              fetch: 'AI đang đọc & chia mảnh nội dung...',
              source: { kind: 'text', label: textPreview(text) },
            },
          )}
          onAnalyzeImage={async (base64, mimeType) => runAnalyze(
            () => apiCall<AnalyzeResult>('/analyze-image', { base64, mimeType }),
            {
              fetch: 'Đang nhận diện chữ & phân tích ảnh...',
              source: { kind: 'image', label: 'Ảnh đã tải lên', imageUrl: `data:${mimeType};base64,${base64}` },
            },
          )}
        />

        {analyzeStatus && <AnalyzeIndicator status={analyzeStatus} />}

        <div className="feed-scroll-area">
          <FeedScroller
            ref={feedScrollerRef}
            items={displayFeed}
            onToggleFavorite={handleToggleFavorite}
            onAnswerQuiz={handleAnswerQuiz}
            onSlideChange={handleSlideChange}
          />
          <FeedFilterBar
            filter={filter === 'favorites' ? 'all' : filter}
            counts={{
              all: counts.all,
              summary: counts.summary,
              infographic: counts.infographic,
              quiz: counts.quiz,
            }}
            onChange={setFilter}
          />
        </div>
      </main>

      {/* Nút scroll + chỉ số slide */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 p-1 rounded-2xl bg-white/95 border border-slate-200 shadow-md backdrop-blur-sm">
        <button
          onClick={() => scrollToCard('up')}
          disabled={atFirstSlide}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed hover:enabled:bg-slate-50"
          aria-label="Thẻ trước"
        >
          <ChevronUp className="w-5 h-5 text-slate-600" />
        </button>
        <button
          onClick={() => setShowOutline(true)}
          disabled={slideTotal === 0}
          aria-label="Xem danh sách thẻ"
          className="group relative w-11 h-11 flex items-center justify-center text-[11px] font-semibold text-center select-none rounded-xl hover:enabled:bg-brand-50 transition-colors disabled:text-slate-400 disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <span className="tabular-nums text-slate-500 transition-opacity group-hover:opacity-0">
            {slideTotal > 0 ? `${slideIndex + 1}/${slideTotal}` : '—'}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
            Xem
          </span>
        </button>
        <button
          onClick={() => scrollToCard('down')}
          disabled={atLastSlide}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed hover:enabled:bg-slate-50"
          aria-label="Thẻ sau"
        >
          <ChevronDown className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <FeedOutlineModal
        open={showOutline}
        items={displayFeed}
        activeIndex={slideIndex}
        onSelect={(index) => feedScrollerRef.current?.scrollToIndex(index)}
        onClose={() => setShowOutline(false)}
      />

      {/* Modal cài đặt */}
      {showSettings && (
        <PersonalizationModal
          settings={settings}
          onSave={async (s) => {
            setSettings(s);
            if (user && isFirebaseConfigured) await saveSettings(user.uid, s);
            else saveLocalSettings(s);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Modal đăng nhập */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAuth(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold mb-4">Đăng nhập</h2>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm mb-2" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm mb-4" />
            <div className="space-y-2">
              <button onClick={async () => { await signInEmail(email, password); setShowAuth(false); }} className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium">Đăng nhập Email</button>
              <button onClick={async () => { await signUpEmail(email, password); setShowAuth(false); }} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm">Tạo tài khoản</button>
              <button onClick={async () => { await signInGoogle(); setShowAuth(false); }} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm">Google</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
