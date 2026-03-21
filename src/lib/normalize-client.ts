/**
 * 顧客名を正規化（統合キーを生成）
 *
 * ルール:
 * 1. スペース・スラッシュで分割し、先頭トークンを統合キーとする
 *    "○○社 田中" → "○○社"
 *    "○○社/案件A" → "○○社"
 *    "PM MTG 2026_03_19" → "PM MTG"（"PM"だけにならないよう日付除去を先に）
 * 2. 末尾の日付パターンを除去してから分割判定
 *    "PM MTG 2026_03_19" → "PM MTG" → 分割しても"PM MTG"のまま
 * 3. アルファベット連続トークンは結合して保持（"PM MTG" → "PM MTG"）
 */
export function normalizeClientName(name: string): string {
  let n = name.trim();

  // ステップ1: 末尾の日付パターンを除去
  // _2026_03_19, 2026_03_19, 2026/03/19, 2026-03-19
  n = n.replace(/[\s_]?\d{4}[\s_/\-]\d{1,2}[\s_/\-]\d{1,2}$/, "").trim();

  // ステップ2: スラッシュで分割 → 先頭部分を取得
  const slashParts = n.split("/");
  n = slashParts[0].trim();

  // ステップ3: スペースで分割してトークン化
  const tokens = n.split(/\s+/);
  if (tokens.length <= 1) return n;

  // 先頭が日本語（社名等）→ 先頭トークンだけ返す
  // "○○社 田中" → "○○社"
  if (/[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}]/u.test(tokens[0]) &&
      !/^[A-Za-z0-9._\-]+$/.test(tokens[0])) {
    return tokens[0];
  }

  // 先頭が英数字 → 英数字トークンを連続結合、日本語が来ても名前の一部として結合
  // ただし「人名っぽいもの」（短い漢字+さん/様）は除去
  const result: string[] = [];
  for (const token of tokens) {
    // 人名パターン（1-6文字の漢字/カナ + さん/様）→ 除去して終了
    if (result.length > 0 && /^[\p{Script=Katakana}\p{Script=Hiragana}\p{Script=Han}]{1,6}(さん|様)$/u.test(token)) {
      break;
    }
    if (result.length > 0 && /^[A-Za-z]{1,6}(さん|様)$/u.test(token)) {
      break;
    }
    result.push(token);
  }

  return result.join(" ").trim();
}
