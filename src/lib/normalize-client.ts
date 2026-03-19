/**
 * 顧客名を正規化（枝番・日付サフィックスを除去して統合）
 * "PM MTG 2026_03_19" → "PM MTG"
 * "○○社 田中さん"       → "○○社"
 */
export function normalizeClientName(name: string): string {
  let n = name.trim();
  // 末尾の日付パターンを除去: _2026_03_19, 2026_03_19, 2026/03/19, 2026-03-19
  n = n.replace(/[\s_]?\d{4}[\s_/\-]\d{1,2}[\s_/\-]\d{1,2}$/, "");
  // 末尾の「 人名」パターンを除去: 日本語名のみ（「○○社 田中」「○○社 Aさん」）
  // 「さん」「様」が付いている場合、または漢字/カナのみの場合に限定
  // アルファベット単体（MTGなど）は除去しない
  n = n.replace(/\s+[\p{Script=Katakana}\p{Script=Hiragana}\p{Script=Han}]{1,6}(さん|様)?$/u, "");
  n = n.replace(/\s+[A-Za-z]{1,6}(さん|様)$/u, "");
  return n.trim();
}
