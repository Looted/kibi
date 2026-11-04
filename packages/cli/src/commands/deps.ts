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
  KB_DEPENDENCIES_LOCK_PATH,
  KB_DEPENDENCIES_PATH,
  KbDependencyError,
  type KbDependencyOptions,
  kbDependencyStatus,
  lockKbDependencies,
  resolveKbDependency,
} from "../dependencies/kb-dependencies.js";

export interface DepsCommandOptions {
  readonly format?: string;
  readonly workspaceRoot?: string;
  readonly dependencyOptions?: KbDependencyOptions;
}

function short(commit: string | null): string {
  return commit === null ? "-" : commit.slice(0, 12);
}

function fail(error: unknown): { exitCode: number } {
  if (!(error instanceof KbDependencyError)) throw error;
  console.error(`Error [${error.code}]: ${error.message}`);
  return { exitCode: 1 };
}

/** `kibi deps lock [names...]`: pin declared dependencies to commits. */
export async function depsLockCommand(
  names: readonly string[],
  options: DepsCommandOptions & { readonly update?: boolean } = {},
): Promise<{ exitCode: number }> {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const update = names.length > 0 ? names : options.update === true;
  let outcomes: ReturnType<typeof lockKbDependencies>;
  try {
    outcomes = lockKbDependencies(workspaceRoot, {
      ...options.dependencyOptions,
      update,
    });
  } catch (error) {
    return fail(error);
  }
  if (options.format === "json") {
    console.log(JSON.stringify({ dependencies: outcomes }, null, 2));
    return { exitCode: 0 };
  }
  if (outcomes.length === 0) {
    console.log(
      `No KB dependencies declared in ${KB_DEPENDENCIES_PATH}; wrote an empty ${KB_DEPENDENCIES_LOCK_PATH}.`,
    );
    return { exitCode: 0 };
  }
  for (const outcome of outcomes) {
    const moved =
      outcome.previousCommit !== undefined
        ? ` (was ${short(outcome.previousCommit)})`
        : "";
    console.log(
      `${outcome.status.padEnd(7)} ${outcome.name} @ ${short(outcome.commit)}${moved}, KB schema ${outcome.kbSchema}`,
    );
  }
  console.log(
    `Wrote ${KB_DEPENDENCIES_LOCK_PATH}; commit it with ${KB_DEPENDENCIES_PATH}.`,
  );
  return { exitCode: 0 };
}

/** `kibi deps fetch`: download every pinned dependency into the cache. */
export async function depsFetchCommand(
  options: DepsCommandOptions = {},
): Promise<{ exitCode: number }> {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  let fetched: ReturnType<typeof resolveKbDependency>[];
  try {
    fetched = kbDependencyStatus(workspaceRoot, options.dependencyOptions).map(
      (status) =>
        resolveKbDependency(
          workspaceRoot,
          status.name,
          options.dependencyOptions,
        ),
    );
  } catch (error) {
    return fail(error);
  }
  if (options.format === "json") {
    console.log(JSON.stringify({ dependencies: fetched }, null, 2));
    return { exitCode: 0 };
  }
  if (fetched.length === 0) {
    console.log(`No KB dependencies declared in ${KB_DEPENDENCIES_PATH}.`);
  }
  for (const dependency of fetched) {
    console.log(
      `fetched ${dependency.name} @ ${short(dependency.commit)} -> ${dependency.workspaceRoot}`,
    );
  }
  return { exitCode: 0 };
}

/** `kibi deps status`: list declared dependencies, their pins and cache state. */
export async function depsStatusCommand(
  options: DepsCommandOptions = {},
): Promise<{ exitCode: number }> {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  let statuses: ReturnType<typeof kbDependencyStatus>;
  try {
    statuses = kbDependencyStatus(workspaceRoot, options.dependencyOptions);
  } catch (error) {
    return fail(error);
  }
  if (options.format === "json") {
    console.log(JSON.stringify({ dependencies: statuses }, null, 2));
  } else if (statuses.length === 0) {
    console.log(`No KB dependencies declared in ${KB_DEPENDENCIES_PATH}.`);
  } else {
    for (const status of statuses) {
      const pin = status.ref !== undefined ? ` (${status.ref})` : "";
      const schema =
        status.kbSchema === null ? "" : `, KB schema ${status.kbSchema}`;
      console.log(
        `${status.name}: ${status.git}${pin} @ ${short(status.commit)}, ${status.state.replaceAll("_", " ")}${schema}`,
      );
    }
  }
  // A dependency that cannot be read as declared needs 'kibi deps lock'.
  const unpinned = statuses.filter(
    (status) => status.state === "not_locked" || status.state === "lock_stale",
  );
  if (unpinned.length > 0 && options.format !== "json") {
    console.log(
      `Run 'kibi deps lock' to pin: ${unpinned.map((status) => status.name).join(", ")}.`,
    );
  }
  return { exitCode: unpinned.length > 0 ? 1 : 0 };
}
