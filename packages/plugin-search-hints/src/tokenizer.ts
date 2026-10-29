/**
 * BERT WordPiece tokenizer, matching the Hugging Face `tokenizers`
 * BertNormalizer (clean text, CJK spacing, accent stripping, lowercase),
 * BertPreTokenizer and WordPiece model that potion-base-8M ships with.
 */

const MAX_INPUT_CHARS_PER_WORD = 100;
const CONTINUING_PREFIX = "##";
export const UNK_TOKEN = "[UNK]";
/** Added tokens matched verbatim before normalization, as tokenizer.json declares. */
const SPECIAL_TOKENS = ["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]"];
const SPECIAL_SPLIT = /(\[PAD\]|\[UNK\]|\[CLS\]|\[SEP\]|\[MASK\])/;

const CONTROL = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/u;
const CLEAN_WHITESPACE = /[\t\n\r\p{Zs}]/u;
const WHITESPACE = /\p{White_Space}/u;
const PUNCTUATION = /\p{P}/u;
const NONSPACING_MARK = /\p{Mn}/gu;

function isControl(char: string): boolean {
  if (char === "\t" || char === "\n" || char === "\r") return false;
  return CONTROL.test(char);
}

function isChineseChar(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0x2a700 && code <= 0x2b73f) ||
    (code >= 0x2b740 && code <= 0x2b81f) ||
    (code >= 0x2b820 && code <= 0x2ceaf) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x2f800 && code <= 0x2fa1f)
  );
}

function isPunctuation(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  if (
    (code >= 33 && code <= 47) ||
    (code >= 58 && code <= 64) ||
    (code >= 91 && code <= 96) ||
    (code >= 123 && code <= 126)
  )
    return true;
  return PUNCTUATION.test(char);
}

// implements REQ-kibi-plugin-search-hints
export function normalize(text: string): string {
  let cleaned = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0 || code === 0xfffd || isControl(char)) continue;
    if (CLEAN_WHITESPACE.test(char)) cleaned += " ";
    else if (isChineseChar(code)) cleaned += ` ${char} `;
    else cleaned += char;
  }
  return cleaned.normalize("NFD").replace(NONSPACING_MARK, "").toLowerCase();
}

// implements REQ-kibi-plugin-search-hints
export function preTokenize(normalized: string): string[] {
  const words: string[] = [];
  let current = "";
  for (const char of normalized) {
    if (WHITESPACE.test(char)) {
      if (current !== "") words.push(current);
      current = "";
    } else if (isPunctuation(char)) {
      if (current !== "") words.push(current);
      words.push(char);
      current = "";
    } else {
      current += char;
    }
  }
  if (current !== "") words.push(current);
  return words;
}

// implements REQ-kibi-plugin-search-hints
export class WordPieceTokenizer {
  private readonly ids: ReadonlyMap<string, number>;
  readonly unkId: number;

  constructor(vocabulary: readonly string[]) {
    this.ids = new Map(vocabulary.map((token, id) => [token, id]));
    const unk = this.ids.get(UNK_TOKEN);
    if (unk === undefined) throw new Error("vocabulary has no [UNK] token");
    this.unkId = unk;
  }

  private word(word: string, out: number[]): void {
    const chars = Array.from(word);
    if (chars.length > MAX_INPUT_CHARS_PER_WORD) {
      out.push(this.unkId);
      return;
    }
    const pieces: number[] = [];
    let start = 0;
    while (start < chars.length) {
      let end = chars.length;
      let found: number | undefined;
      while (start < end) {
        const piece = chars.slice(start, end).join("");
        found = this.ids.get(start > 0 ? CONTINUING_PREFIX + piece : piece);
        if (found !== undefined) break;
        end--;
      }
      if (found === undefined) {
        out.push(this.unkId);
        return;
      }
      pieces.push(found);
      start = end;
    }
    out.push(...pieces);
  }

  /** Token ids without special tokens, as `add_special_tokens: false`. */
  encode(text: string): number[] {
    const out: number[] = [];
    for (const part of text.split(SPECIAL_SPLIT)) {
      const special = SPECIAL_TOKENS.includes(part)
        ? this.ids.get(part)
        : undefined;
      if (special !== undefined) out.push(special);
      else
        for (const word of preTokenize(normalize(part))) this.word(word, out);
    }
    return out;
  }
}
