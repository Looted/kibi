/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/** Opens a subject body that records that nobody has defined the subject. */
export const DEFINITION_NOT_STATED_PREFIX = "Definition not stated:";

/**
 * The body Kibi writes on a subject it generates (bootstrap, kb_model,
 * kb_compile_intent). Kibi never invents a definition, so the body records
 * where the subject is named and who could define it.
 */
export function notStatedDefinition(
  subjectKey: string,
  namedBy: string,
): string {
  return `${DEFINITION_NOT_STATED_PREFIX} the subject ${subjectKey} is named by ${namedBy}. The people who own that source can say what it is in the product and what it is not.\n`;
}

/** Whether a subject body records that nobody has defined the subject. */
export function isNotStatedDefinition(definition: string): boolean {
  return definition.trimStart().startsWith(DEFINITION_NOT_STATED_PREFIX);
}
