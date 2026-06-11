import type { AnalyzeResult, FeedItem, QuizData, QuizFrequency } from '../types';
import { QUIZ_INTERVAL } from '../types';

import { extractInfographics } from './infographicExtractor';

import { createInfographicFeedItem } from './infographicNormalizer';



/** Chia kết quả AI thành chuỗi piece + quiz xen kẽ + infographic */

export function buildArticleFeedItems(

  result: AnalyzeResult,

  articleId: string,

  sourceUrl: string | undefined,

  frequency: QuizFrequency,

): FeedItem[] {

  const items: FeedItem[] = [];

  const interval = QUIZ_INTERVAL[frequency];

  let quizIdx = 0;
  const usedQuiz = new Set<number>();

  const pieces = result.pieces?.length ? result.pieces : [{ label: 'Tóm tắt', content: '' }];
  const quizzes = result.quizzes?.length ? result.quizzes : [];

  const pickScopedQuiz = (pieceIndex: number): QuizData | null => {
    const idx = quizzes.findIndex((q, qi) => {
      if (usedQuiz.has(qi) || !q.coversPieceIndexes?.length) return false;
      return Math.max(...q.coversPieceIndexes) === pieceIndex;
    });
    if (idx < 0) return null;
    usedQuiz.add(idx);
    return quizzes[idx];
  };

  const pushQuiz = (quiz: QuizData, idSuffix: number) => {
    items.push({
      id: `${articleId}-q${idSuffix}`,
      type: 'quiz',
      articleId,
      title: result.title,
      summary: '',
      quiz,
      createdAt: 0,
    });
  };

  const structuredIg = result.infographics?.length ? result.infographics : [];

  const useStructured = structuredIg.length > 0;



  let igIdx = 0;



  pieces.forEach((piece, i) => {

    const { cleaned, items: igItems } = extractInfographics(piece.content, piece.label);

    const pieceSummary = cleaned || piece.content;



    if (pieceSummary.trim()) {

      items.push({

        id: `${articleId}-p${i}`,

        type: 'piece',

        articleId,

        pieceIndex: i,

        pieceLabel: piece.label,

        title: result.title,

        summary: pieceSummary,

        sourceUrl: i === pieces.length - 1 ? sourceUrl : undefined,

        createdAt: 0,

      });

    }



    if (!useStructured) {

      igItems.forEach((data) => {

        items.push(createInfographicFeedItem(articleId, result.title, data, igIdx++));

      });

    }



    const scopedQuiz = pickScopedQuiz(i);
    if (scopedQuiz) {
      pushQuiz(scopedQuiz, quizIdx++);
    } else if ((i + 1) % interval === 0 && quizIdx < quizzes.length && !usedQuiz.has(quizIdx)) {
      const legacy = quizzes[quizIdx];
      if (!legacy.coversPieceIndexes?.length) {
        pushQuiz(legacy, quizIdx);
        usedQuiz.add(quizIdx);
        quizIdx++;
      }
    }

  });



  if (useStructured) {

    structuredIg.forEach((data) => {

      items.push(createInfographicFeedItem(articleId, result.title, data, igIdx++));

    });

  }



  while (quizIdx < quizzes.length) {
    if (!usedQuiz.has(quizIdx)) pushQuiz(quizzes[quizIdx], quizIdx);
    quizIdx++;
  }



  return items;

}



/** Gán createdAt để thứ tự đọc đúng (desc = item đầu tiên hiện trên cùng) */

export function stampCreatedAt(items: FeedItem[], baseTime = Date.now()): FeedItem[] {

  return items.map((item, idx) => ({

    ...item,

    createdAt: baseTime + (items.length - idx),

  }));

}



/** Legacy: ghép piece/quiz rời rạc theo tần suất */

export function buildMixedFeed(items: FeedItem[], frequency: QuizFrequency): FeedItem[] {

  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);

  const pieces = sorted.filter(i => (i.type === 'piece' || i.type === 'summary') && !i.id.startsWith('welcome'));

  const quizzes = sorted.filter(i => i.type === 'quiz' && !i.id.startsWith('welcome'));

  const interval = QUIZ_INTERVAL[frequency];

  const result: FeedItem[] = [];

  let quizIdx = 0;



  pieces.forEach((p, i) => {

    result.push(p);

    if ((i + 1) % interval === 0 && quizIdx < quizzes.length) {

      result.push(quizzes[quizIdx++]);

    }

  });

  while (quizIdx < quizzes.length) result.push(quizzes[quizIdx++]);

  return result;

}


