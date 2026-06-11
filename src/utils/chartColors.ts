/** Màu bar / gradient — có thể gần hue (cùng họ indigo) */
export const BAR_GRADIENT_COLORS = ['#6366f1', '#818cf8', '#14b8a6', '#0ea5e9', '#4f46e5'];

/**
 * Màu slice pie — PHẢI khác hue rõ (không 2 indigo liên tiếp).
 * Thứ tự: indigo → teal → cam → hồng → tím.
 */
export const PIE_SLICE_COLORS = ['#4f46e5', '#0d9488', '#ea580c', '#be185d', '#7c3aed'];

/** Cặp màu cấm đặt cạnh nhau trên pie (quá giống) */
export const PIE_FORBIDDEN_ADJACENT: [string, string][] = [
  ['#6366f1', '#818cf8'],
  ['#6366f1', '#4f46e5'],
  ['#818cf8', '#a5b4fc'],
];

export function getPieSliceColor(index: number): string {
  return PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length];
}
