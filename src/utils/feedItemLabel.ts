import type { FeedItem } from '../types';
import { isPieceType } from '../types';

/** Nhãn badge hiển thị trên FeedCard (vd: CHI TIẾT HỢP ĐỒNG · #2) */
export function getFeedItemBadgeLabel(item: FeedItem): string {
  if (item.type === 'quiz') return 'Ôn tập';
  if (item.type === 'infographic') {
    return item.pieceLabel || item.infographic?.label || 'Infographic';
  }
  if (isPieceType(item.type) && item.pieceLabel) {
    let label = item.pieceLabel;
    if (item.pieceIndex != null && item.articleId && !item.articleId.startsWith('welcome')) {
      label += ` · #${item.pieceIndex + 1}`;
    }
    return label;
  }
  return item.title || 'Nội dung';
}
