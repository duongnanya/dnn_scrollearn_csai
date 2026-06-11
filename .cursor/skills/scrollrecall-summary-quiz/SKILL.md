---
name: scrollrecall-summary-quiz
description: >-
  Tóm tắt và quiz Active Recall cho ScrollRecall. Dùng khi chỉnh SUMMARY_PROMPT,
  pieces, quizzes, ôn tập, câu hỏi trắc nghiệm, feedBuilder, hoặc yêu cầu quiz
  chỉ hỏi phần đã đọc — không hỏi toàn bài viết gốc.
---

# ScrollRecall Summary & Quiz Agent

Agent chuyên **chia mảnh tóm tắt** và **câu hỏi ôn tập** xen kẽ trong feed.

## Nguyên tắc quiz (quan trọng)

1. **Quiz = Active Recall trên phần ĐÃ đọc** — user scroll từ trên xuống, mỗi quiz chỉ kiểm tra các **mảnh tin (pieces) đã xuất hiện trước đó** trong feed.
2. **CẤM hỏi toàn bài gốc** — không hỏi chi tiết chỉ có ở cuối bài viết nguồn nếu chưa nằm trong các pieces đã covers.
3. **CẤM spoiler** — không hỏi nội dung từ mảnh phía dưới (chưa scroll tới).
4. Mỗi quiz phải có `coversPieceIndexes`: chỉ số piece (0-based) mà câu hỏi dựa vào.

## Luồng feed

```
Piece #0 → Piece #1 → Piece #2 → Quiz (covers [0,1,2])
→ Piece #3 → ... → Quiz (covers [3,4]) → ...
```

Quiz xuất hiện **sau mảnh** `max(coversPieceIndexes)` — do `feedBuilder` chèn khi duyệt tới piece đó.

## Bản đồ file

| File | Vai trò |
|------|---------|
| `server.ts` `SUMMARY_PROMPT` | Hướng dẫn AI sinh pieces + quizzes + infographics |
| `src/types.ts` | `ContentPiece`, `QuizData`, `AnalyzeResult` |
| `src/utils/feedBuilder.ts` | Xen kẽ piece / infographic / quiz theo `coversPieceIndexes` |
| `src/App.tsx` | `quizFrequency` → `QUIZ_INTERVAL` (tần suất fallback) |

## JSON quiz (bắt buộc)

```json
{
  "question": "Câu hỏi chỉ dựa trên mảnh đã covers",
  "coversPieceIndexes": [0, 1, 2],
  "options": [
    {"text": "...", "isCorrect": false},
    {"text": "...", "isCorrect": true}
  ],
  "explanation": "Giải thích — trích từ pieces đã covers"
}
```

## Quy tắc viết quiz

- Đáp án đúng phải suy ra được từ **nội dung pieces[coversPieceIndexes]**.
- Câu hỏi ngắn, 1 ý; 4 options; 1 đáp án đúng.
- `coversPieceIndexes` tăng dần giữa các quiz; không overlap lung tung.
- Số quiz ≈ `ceil(số_pieces / interval)` — mỗi cửa sổ 1–3 mảnh vừa đọc.

## Quy tắc viết pieces (tóm tắt)

- 5–8 mảnh, 25–55 từ/mảnh, một ý/mảnh.
- Thứ tự mảnh ≈ thứ tự bài gốc (user đọc từ trên xuống).
- Số liệu → `infographics[]`, không nhúng vào prose piece.

## Checklist

- [ ] Mỗi quiz có `coversPieceIndexes` hợp lệ
- [ ] Không câu nào cần đọc mảnh chưa covers
- [ ] `feedBuilder` chèn quiz sau `max(coversPieceIndexes)`
- [ ] Giải thích quiz trích từ mảnh đã đọc

## Anti-patterns

- Quiz về IPO khi user mới đọc mảnh hợp đồng đầu bài
- Hỏi số liệu chưa xuất hiện trong bất kỳ piece nào đã covers
- Gom toàn bài thành 1 quiz cuối về "nội dung chính bài viết"
