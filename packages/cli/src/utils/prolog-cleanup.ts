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

/**
 * Best-effort Prolog process cleanup.
 * Detaches the KB and terminates the process, swallowing any errors.
 * Safe to call in finally blocks where the process may already be dead.
 */
export async function safeCleanupProlog(
  prolog:
    | { query: (q: string) => Promise<unknown>; terminate: () => Promise<void> }
    | null
    | undefined,
): Promise<void> {
  // implements REQ-003
  if (!prolog) return;
  try {
    await prolog.query("kb_detach");
  } catch {
    // best-effort: process may already be dead or KB was never attached
  }
  try {
    await prolog.terminate();
  } catch {
    // best-effort: process may already be dead
  }
}
