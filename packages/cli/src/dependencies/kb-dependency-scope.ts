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

// implements REQ-kb-dependencies-git
import {
  type KbDependencyOptions,
  type ResolvedKbDependency,
  resolveKbDependency,
} from "./kb-dependencies.js";

/** Business input key that scopes a read operation to a KB dependency. */
export const KB_DEPENDENCY_ARGUMENT = "kb";

/**
 * Set while a process serves reads of a KB dependency, as `<name>@<commit>`,
 * so its read-only notice names the dependency instead of a detached HEAD.
 */
export const KB_DEPENDENCY_ENV = "KIBI_KB_DEPENDENCY";

/** JSON Schema of the `kb` input shared by every read operation that takes it. */
export const KB_DEPENDENCY_INPUT_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: 64,
  pattern: "^[a-z0-9][a-z0-9._-]{0,63}$",
  description:
    "Optional KB dependency to read instead of this project's own KB: a name declared in .kb/dependencies.json and pinned in .kb/dependencies.lock.json. The answer comes from that repository's own read-only KB at the pinned commit, kept apart from this project's KB. Omit it to read this project's KB.",
} as const;

/** The `kb` value of an operation input, or undefined when it names none. */
export function kbDependencyArgument(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const value = (input as Record<string, unknown>)[KB_DEPENDENCY_ARGUMENT];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** The input without its `kb` scope, for the dependency's own Kibi. */
export function withoutKbDependencyArgument<T>(input: T): T {
  if (typeof input !== "object" || input === null) return input;
  const { [KB_DEPENDENCY_ARGUMENT]: _scope, ...rest } = input as Record<
    string,
    unknown
  >;
  return rest as T;
}

/** The `<name>@<commit>` label a dependency read reports. */
export function kbDependencyLabel(dependency: ResolvedKbDependency): string {
  return `${dependency.name}@${dependency.commit}`;
}

/**
 * Point this CLI process at a KB dependency for the rest of its run: resolve
 * and fetch it, mark the process as serving it, and make its checkout the
 * working directory every read command resolves its workspace from. Only
 * read commands call this, and the checkout is a detached HEAD, so writes are
 * refused by the branch resolver as well.
 */
export function enterKbDependency(
  name: string,
  workspaceRoot: string = process.cwd(),
  options: KbDependencyOptions = {},
): ResolvedKbDependency {
  const dependency = resolveKbDependency(workspaceRoot, name, options);
  process.env[KB_DEPENDENCY_ENV] = kbDependencyLabel(dependency);
  // KIBI_BRANCH names a branch of this project; in the dependency's detached
  // checkout it would attach a branch store that does not exist there.
  Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  process.chdir(dependency.workspaceRoot);
  return dependency;
}
