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

import { Scope, ScriptKind, SyntaxKind } from "ts-morph";

// implements REQ-capability-plugin-builtin-parity-v1
export const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

// implements REQ-capability-plugin-builtin-parity-v1
export function chooseScriptKind(filePath: string): ScriptKind {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsx")) return ScriptKind.TSX;
  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".mts") ||
    lower.endsWith(".cts")
  ) {
    return ScriptKind.TS;
  }
  if (lower.endsWith(".jsx")) return ScriptKind.JSX;
  return ScriptKind.JS;
}

// implements REQ-capability-plugin-builtin-parity-v1
export function formatMethodSymbolName(
  className: string | undefined,
  methodName: string,
): string {
  return className ? `${className}.${methodName}` : methodName;
}

/**
 * Duck-typed private-member check used by ts-morph AST walks and CLI tests.
 * Accepts either `hasModifier(PrivateKeyword)` or `getScope() === "Private"`.
 */
// implements REQ-capability-plugin-builtin-parity-v1
export function isPrivateClassMember(member: {
  getName?: () => string;
  hasModifier?(kind: SyntaxKind): boolean;
  getScope?: () => Scope | string | number;
}): boolean {
  const name = typeof member.getName === "function" ? member.getName() : "";
  if (name.startsWith("#")) {
    return true;
  }
  if (typeof member.hasModifier === "function") {
    return member.hasModifier(SyntaxKind.PrivateKeyword);
  }
  if (typeof member.getScope === "function") {
    return member.getScope() === Scope.Private;
  }
  return false;
}

// implements REQ-capability-plugin-builtin-parity-v1
export function onlyCandidate<T>(candidates: readonly T[]): T | undefined {
  if (candidates.length !== 1) return undefined;
  return candidates[0];
}
