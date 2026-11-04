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
import { InputError } from "../cli-errors.js";
import { KbDependencyError } from "./kb-dependencies.js";
import {
  KB_DEPENDENCY_ARGUMENT,
  enterKbDependency,
  kbDependencyArgument,
  withoutKbDependencyArgument,
} from "./kb-dependency-scope.js";

export const KB_OPTION_DESCRIPTION =
  "Read this KB dependency (a name from .kb/dependencies.json) instead of the project's own KB";

/**
 * Move this run to the KB dependency named by `--kb`, if any. Returns false
 * after printing the coded error when the dependency cannot be read, so the
 * command stops with a non-zero exit code.
 */
export function applyKbOption(options: { kb?: string }): boolean {
  if (options.kb === undefined) return true;
  try {
    enterKbDependencyOrThrow(options.kb);
    return true;
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    process.stderr.write(`Error [${error.code}]: ${error.detail}\n`);
    process.exitCode = error.exitCode;
    return false;
  }
}

/**
 * Scope a JSON route invocation to the KB dependency its input names, and
 * return the input without the scope. Operations whose schema has no `kb`
 * input are left alone, so their own validation reports the extra key.
 */
export function scopeJsonInputToKbDependency(
  input: unknown,
  businessInputSchema: unknown,
): unknown {
  const properties = (
    businessInputSchema as { properties?: Record<string, unknown> } | undefined
  )?.properties;
  if (properties === undefined || !(KB_DEPENDENCY_ARGUMENT in properties)) {
    return input;
  }
  const name = kbDependencyArgument(input);
  if (name === undefined) return withoutKbDependencyArgument(input);
  enterKbDependencyOrThrow(name);
  return withoutKbDependencyArgument(input);
}

function enterKbDependencyOrThrow(name: string): void {
  try {
    enterKbDependency(name);
  } catch (error) {
    if (error instanceof KbDependencyError) {
      throw new InputError(error.code, error.message);
    }
    throw error;
  }
}
