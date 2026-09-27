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
// implements REQ-capability-plugin-builtin-parity-v1
import { createRequire } from "node:module";
import type * as TsMorph from "ts-morph";

let loaded: typeof TsMorph | undefined;

/**
 * ts-morph loads the full TypeScript compiler (~150 ms). Consumers import this
 * package for its predicate rules and plugin registry on every CLI command, so
 * the compiler is loaded on first use by a symbol extractor instead of at
 * import time. ts-morph is this package's own dependency, so resolving it from
 * here always finds the declared version.
 */
export function tsMorph(): typeof TsMorph {
  loaded ??= createRequire(import.meta.url)("ts-morph") as typeof TsMorph;
  return loaded;
}
