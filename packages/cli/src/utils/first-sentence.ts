/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/** Abbreviations whose dot does not end a sentence. */
const ABBREVIATION = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|cf|approx)\.$/i;

/** After a sentence end: whitespace, then an uppercase letter (maybe quoted). */
const NEXT_SENTENCE = /^\s+["'(“]?\p{Lu}/u;

// implements REQ-mcp-semantic-advisor-preflight
/**
 * The first sentence of prose, used to title a requirement. A sentence ends
 * at `.`, `!` or `?` followed by whitespace and an uppercase letter, or at
 * the end of the text, so the dot in a path (`src/match.c`), a dotted name
 * (`console.log`, `exec.Command`), a version (`v1.2`), an abbreviation or
 * backticks never cuts it. A closing dot is dropped.
 */
export function firstSentence(text: string): string {
  const value = text.trim();
  let quoted = false;
  for (const match of value.matchAll(/[`.!?]/g)) {
    const index = match.index;
    if (match[0] === "`") {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    // `value` is trimmed, so the rest is either empty or starts a word.
    const rest = value.slice(index + 1);
    if (rest !== "" && !NEXT_SENTENCE.test(rest)) continue;
    const sentence = value.slice(0, index + 1);
    // Only a sentence ending in `.` can match ABBREVIATION.
    if (ABBREVIATION.test(sentence)) continue;
    return sentence.replace(/\.+$/, "").trim();
  }
  return value;
}
