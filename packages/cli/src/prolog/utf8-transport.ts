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

import { StringDecoder } from "node:string_decoder";

// implements REQ-prolog-utf8-text
/**
 * Prolog goal that switches the child's standard streams and its default
 * file encoding to UTF-8. SWI-Prolog otherwise follows the process locale,
 * and under a POSIX locale every non-ASCII byte read from stdin becomes
 * U+FFFD, which the store then persists.
 */
export const PROLOG_UTF8_STREAMS_GOAL =
  "set_prolog_flag(encoding, utf8), set_stream(user_input, encoding(utf8)), set_stream(user_output, encoding(utf8)), set_stream(user_error, encoding(utf8))";

// implements REQ-prolog-utf8-text
/**
 * Encode a goal for an environment variable. SWI-Prolog decodes environment
 * values with the process locale, so non-ASCII goal text travels as base64
 * of its UTF-8 bytes.
 */
export function encodeGoalForEnv(goal: string): string {
  return Buffer.from(goal, "utf8").toString("base64");
}

// implements REQ-prolog-utf8-text
/** Prolog goal that binds `Atom` to the goal stored by `encodeGoalForEnv`. */
export function decodeGoalFromEnvGoal(variable: string, atom: string): string {
  return `getenv('${variable}', ${atom}Encoded), base64_encoded(${atom}, ${atom}Encoded, [encoding(utf8), as(atom)])`;
}

// implements REQ-prolog-utf8-text
/**
 * A UTF-8 decoder for one child stream that keeps a character split across
 * two chunks whole instead of decoding each half to U+FFFD.
 */
export function utf8ChunkDecoder(): (chunk: Buffer) => string {
  const decoder = new StringDecoder("utf8");
  return (chunk) => decoder.write(chunk);
}
