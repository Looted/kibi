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
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  type ProjectKibiConfig,
  REFERENCE_EXTRACTOR_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
} from "kibi-plugin-sdk";
import {
  PLUGIN_LANGUAGE_PACKS,
  PLUGIN_REFERENCE_LANGUAGES,
} from "../operations/proof/code-languages.js";
import { readProjectKibiConfig } from "./project-config.js";
import { REFERENCE_PLUGIN_PACKAGE } from "./proof-reference-extractors.js";

const NOT_PRODUCTION =
  /(?:^|\/)(?:node_modules|dist|build|target|bin|obj|vendor|coverage|tests?|__tests__|e2e|fixtures?)\/|(?:_test\.go|Tests?\.(?:java|cs)|\.(?:test|spec)\.[^/]+)$/i;

export type ReferenceLanguageSuggestion = Readonly<{
  package: string;
  /** Capabilities to activate, each in augment mode; empty when all are active. */
  capabilities: readonly string[];
  languages: readonly Readonly<{ name: string; files: number }>[];
  evidence: readonly string[];
  /** The project already lists the plugin, but not for proofs. */
  activeForSymbolsOnly: boolean;
  /** kibi-lang-* packs the tracked sources need that are not installed. */
  packs: readonly string[];
}>;

/** Whether a package resolves from the workspace root, and at which version. */
export type InstalledVersion = (packageName: string) => string | null;

/** The version of a package installed for the workspace, or null. */
export function workspaceInstalledVersion(
  workspaceRoot: string,
): InstalledVersion {
  const resolve = createRequire(join(workspaceRoot, "package.json")).resolve;
  return (packageName) => {
    try {
      const manifest = JSON.parse(
        readFileSync(resolve(`${packageName}/package.json`), "utf8"),
      ) as { version?: unknown };
      return typeof manifest.version === "string" ? manifest.version : null;
    } catch {
      return null;
    }
  };
}

/** The pack versions the installed kibi-plugin-treesitter pins. */
function pinnedPackVersions(
  workspaceRoot: string | undefined,
): ReadonlyMap<string, string> {
  if (workspaceRoot === undefined) return new Map();
  try {
    const catalogPath = createRequire(
      join(workspaceRoot, "package.json"),
    ).resolve(`${REFERENCE_PLUGIN_PACKAGE}/catalog.json`);
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
      languages?: { pack?: unknown; packVersion?: unknown }[];
    };
    return new Map(
      (catalog.languages ?? []).flatMap((language) =>
        typeof language.pack === "string" &&
        typeof language.packVersion === "string"
          ? [[language.pack, language.packVersion] as const]
          : [],
      ),
    );
  } catch {
    return new Map();
  }
}

/**
 * Whether the project has sources kibi-plugin-treesitter must read for it:
 * Go, Java, C# or Rust files whose references source proofs read only
 * through the plugin while it is not activated for that, or files of a
 * language whose kibi-lang-* pack is not installed (at the version the
 * installed plugin pins) while the plugin is listed or being suggested.
 * Reads file names and package manifests only; never imports a plugin.
 */
// implements REQ-kibi-tree-sitter-references, REQ-kibi-tree-sitter-language-packs
export function referenceLanguageSuggestion(
  files: readonly string[],
  config: ProjectKibiConfig,
  installedVersion: InstalledVersion = () => null,
  pinned: ReadonlyMap<string, string> = new Map(),
): ReferenceLanguageSuggestion | null {
  const production = files.filter((file) => !NOT_PRODUCTION.test(file));
  const references = PLUGIN_REFERENCE_LANGUAGES.map((language) => ({
    name: language.name,
    found: production.filter((file) => language.pattern.test(file)),
  })).filter((language) => language.found.length > 0);
  const entry = (config.plugins ?? []).find(
    (plugin) => plugin.package === REFERENCE_PLUGIN_PACKAGE,
  );
  if ((config.declinedPlugins ?? []).includes(REFERENCE_PLUGIN_PACKAGE))
    return null;
  const activate =
    references.length > 0 &&
    entry?.capabilities[REFERENCE_EXTRACTOR_CAPABILITY_ID] === undefined;
  if (entry === undefined && !activate) return null;
  const packLanguages = PLUGIN_LANGUAGE_PACKS.map((language) => ({
    ...language,
    found: production.filter((file) => language.pattern.test(file)),
  })).filter((language) => language.found.length > 0);
  const missing = packLanguages.filter((language) => {
    const installed = installedVersion(language.pack);
    const wanted = pinned.get(language.pack);
    return installed === null || (wanted !== undefined && installed !== wanted);
  });
  if (!activate && missing.length === 0) return null;
  const shown = activate ? references : missing;
  return {
    package: REFERENCE_PLUGIN_PACKAGE,
    capabilities: !activate
      ? []
      : entry === undefined
        ? [REFERENCE_EXTRACTOR_CAPABILITY_ID, SYMBOL_EXTRACTOR_V2_CAPABILITY_ID]
        : [REFERENCE_EXTRACTOR_CAPABILITY_ID],
    languages: shown.map((language) => ({
      name: language.name,
      files: language.found.length,
    })),
    evidence: shown.flatMap((language) => language.found).slice(0, 5),
    activeForSymbolsOnly: entry !== undefined,
    packs: missing.map((language) => {
      const version = pinned.get(language.pack);
      return version === undefined
        ? language.pack
        : `${language.pack}@${version}`;
    }),
  };
}

/** One line naming the languages and what to install or activate. */
export function describeReferenceLanguageSuggestion(
  suggestion: ReferenceLanguageSuggestion,
): string {
  const found = suggestion.languages
    .map((language) => `${language.files} ${language.name}`)
    .join(", ");
  const activation = suggestion.capabilities
    .map((capability) => `"${capability}": { "mode": "augment" }`)
    .join(", ");
  const packs =
    suggestion.packs.length === 0
      ? ""
      : ` and the grammar pack(s) ${suggestion.packs.join(", ")}`;
  if (suggestion.capabilities.length === 0)
    return `${found} source file(s); ${suggestion.package} reads them only with${packs.slice(4)} installed: npm install --save-dev ${suggestion.packs.join(" ")}`;
  return suggestion.activeForSymbolsOnly
    ? `${found} source file(s); ${suggestion.package} is active for symbols but not for source proofs: add ${activation} to its package.json kibi.plugins entry${packs === "" ? "" : `, and install${packs.slice(4)}`}`
    : `${found} source file(s); source proofs and symbols for them need ${suggestion.package}${packs}: add ${suggestion.packs.length === 0 ? "it" : "them"} to devDependencies and ${suggestion.package} to package.json kibi.plugins with ${activation}`;
}

/**
 * The suggestion for a workspace, from its tracked files, as one line for
 * `kibi init` and `kibi doctor`, or null when nothing is missing. A project
 * without a package.json gets one whose only job is Kibi's plugin list.
 */
// implements REQ-kibi-tree-sitter-references, REQ-kibi-tree-sitter-language-packs
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
  const suggestion = referenceLanguageSuggestion(
    files,
    config,
    workspaceInstalledVersion(workspaceRoot),
    pinnedPackVersions(workspaceRoot),
  );
  if (suggestion === null) return null;
  const noManifest = !existsSync(join(workspaceRoot, "package.json"));
  const install = [
    ...(suggestion.capabilities.length > 0 && !suggestion.activeForSymbolsOnly
      ? [suggestion.package]
      : []),
    ...suggestion.packs,
  ].join(" ");
  return `${describeReferenceLanguageSuggestion(suggestion)}.${
    noManifest
      ? ` This project has no package.json; create one that only holds Kibi's plugin list (npm init -y, then npm install -D ${install}).`
      : ""
  } Without ${suggestion.capabilities.length === 0 ? "them, those files are refused for symbols and proofs" : "it, references proofs on those files are refused"}.`;
}
