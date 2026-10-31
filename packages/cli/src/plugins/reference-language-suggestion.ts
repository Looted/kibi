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

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  type ProjectKibiConfig,
  REFERENCE_EXTRACTOR_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
} from "kibi-plugin-sdk";
import { PLUGIN_REFERENCE_LANGUAGES } from "../operations/proof/code-languages.js";
import { readProjectKibiConfig } from "./project-config.js";
import { REFERENCE_PLUGIN_PACKAGE } from "./proof-reference-extractors.js";

const NOT_PRODUCTION =
  /(?:^|\/)(?:node_modules|dist|build|target|bin|obj|vendor|coverage|tests?|__tests__|e2e|fixtures?)\/|(?:_test\.go|Tests?\.(?:java|cs)|\.(?:test|spec)\.[^/]+)$/i;

export type ReferenceLanguageSuggestion = Readonly<{
  package: string;
  /** Capabilities to activate, each in augment mode. */
  capabilities: readonly string[];
  languages: readonly Readonly<{ name: string; files: number }>[];
  evidence: readonly string[];
  /** The project already lists the plugin, but not for proofs. */
  activeForSymbolsOnly: boolean;
}>;

/**
 * Whether the project has Go, Java, C# or Rust sources whose references
 * source proofs can read only through kibi-plugin-treesitter, and the plugin
 * is not yet activated for that. Reads file names only; never imports a
 * plugin.
 */
// implements REQ-kibi-tree-sitter-references
export function referenceLanguageSuggestion(
  files: readonly string[],
  config: ProjectKibiConfig,
): ReferenceLanguageSuggestion | null {
  const production = files.filter((file) => !NOT_PRODUCTION.test(file));
  const languages = PLUGIN_REFERENCE_LANGUAGES.map((language) => ({
    name: language.name,
    found: production.filter((file) => language.pattern.test(file)),
  })).filter((language) => language.found.length > 0);
  if (languages.length === 0) return null;
  const entry = (config.plugins ?? []).find(
    (plugin) => plugin.package === REFERENCE_PLUGIN_PACKAGE,
  );
  if (entry?.capabilities[REFERENCE_EXTRACTOR_CAPABILITY_ID] !== undefined)
    return null;
  if ((config.declinedPlugins ?? []).includes(REFERENCE_PLUGIN_PACKAGE))
    return null;
  return {
    package: REFERENCE_PLUGIN_PACKAGE,
    capabilities:
      entry === undefined
        ? [REFERENCE_EXTRACTOR_CAPABILITY_ID, SYMBOL_EXTRACTOR_V2_CAPABILITY_ID]
        : [REFERENCE_EXTRACTOR_CAPABILITY_ID],
    languages: languages.map((language) => ({
      name: language.name,
      files: language.found.length,
    })),
    evidence: languages.flatMap((language) => language.found).slice(0, 5),
    activeForSymbolsOnly: entry !== undefined,
  };
}

/** One line naming the languages and what to activate. */
export function describeReferenceLanguageSuggestion(
  suggestion: ReferenceLanguageSuggestion,
): string {
  const found = suggestion.languages
    .map((language) => `${language.files} ${language.name}`)
    .join(", ");
  const activation = suggestion.capabilities
    .map((capability) => `"${capability}": { "mode": "augment" }`)
    .join(", ");
  return suggestion.activeForSymbolsOnly
    ? `${found} source file(s); ${suggestion.package} is active for symbols but not for source proofs: add ${activation} to its package.json kibi.plugins entry`
    : `${found} source file(s); source proofs and symbols for them need ${suggestion.package}: add it to devDependencies and to package.json kibi.plugins with ${activation}`;
}

/**
 * The suggestion for a workspace, from its tracked files, as one line for
 * `kibi init` and `kibi doctor`, or null when nothing is missing. A project
 * without a package.json gets one whose only job is Kibi's plugin list.
 */
// implements REQ-kibi-tree-sitter-references
export function workspaceReferenceLanguageNote(
  workspaceRoot: string,
): string | null {
  let files: string[];
  let config: ProjectKibiConfig;
  try {
    files = execFileSync("git", ["ls-files", "-z"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\0")
      .filter((file) => file.length > 0);
    config = readProjectKibiConfig(workspaceRoot);
  } catch {
    return null;
  }
  const suggestion = referenceLanguageSuggestion(files, config);
  if (suggestion === null) return null;
  const noManifest = !existsSync(join(workspaceRoot, "package.json"));
  return `${describeReferenceLanguageSuggestion(suggestion)}.${
    noManifest
      ? " This project has no package.json; create one that only holds Kibi's plugin list (npm init -y, then npm install -D kibi-plugin-treesitter)."
      : ""
  } Without it, references proofs on those files are refused.`;
}
