export type FeedItemType = 'piece' | 'summary' | 'quiz' | 'infographic' | 'welcome';

export type InfographicKind = 'chart' | 'table' | 'stat' | 'compare';

export interface InfographicData {
  kind: InfographicKind;
  label: string;
  chart?: { label: string; value: number; unit?: string }[];
  table?: { headers: string[]; rows: string[][] };
  stats?: { label: string; value: string; unit?: string }[];
  compare?: { label: string; valueA: string; valueB?: string }[];
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizData {
  question: string;
  options: QuizOption[];
  explanation: string;
  /** Chỉ số piece (0-based) mà câu hỏi dựa vào — chỉ nội dung đã đọc */
  coversPieceIndexes?: number[];
}

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  summary: string;
  sourceUrl?: string;
  articleId?: string;
  pieceIndex?: number;
  pieceLabel?: string;
  keyPoints?: string[];
  infographic?: InfographicData;
  quiz?: QuizData;
  isFavorite?: boolean;
  quizAnswered?: boolean;
  quizCorrect?: boolean;
  selectedOption?: number;
  createdAt: number;
}

export type FeedFilter = 'all' | 'summary' | 'infographic' | 'quiz' | 'favorites';

export type QuizFrequency = 'low' | 'medium' | 'high' | 'max';

export interface UserSettings {
  quizFrequency: QuizFrequency;
  interests: string[];
  streakCount: number;
  lastActiveDate: string;
  totalQuizzes: number;
  correctQuizzes: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  quizFrequency: 'medium',
  interests: [],
  streakCount: 0,
  lastActiveDate: '',
  totalQuizzes: 0,
  correctQuizzes: 0,
};

export const QUIZ_INTERVAL: Record<QuizFrequency, number> = {
  low: 5,
  medium: 3,
  high: 2,
  max: 1,
};

export interface ContentPiece {
  label: string;
  content: string;
}

export interface AnalyzeResult {
  title: string;
  pieces: ContentPiece[];
  quizzes: QuizData[];
  /** Infographic có cấu trúc từ AI — ưu tiên hơn parse text */
  infographics?: InfographicData[];
}

export function isPieceType(type: FeedItemType) {
  return type === 'piece' || type === 'summary';
}
