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
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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
  /** Installed packs whose grammar bytes differ from the pinned SHA-256. */
  modified: readonly string[];
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
export function pinnedPackVersions(
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
 * The installed kibi-lang-* packs, at the version the installed plugin pins,
 * whose grammar file does not hash to the SHA-256 the plugin pins. Doctor
 * names them so a changed grammar is not shown as healthy.
 */
// implements REQ-kibi-tree-sitter-language-packs
export function modifiedPacks(
  workspaceRoot: string | undefined,
): ReadonlySet<string> {
  if (workspaceRoot === undefined) return new Set();
  const resolve = createRequire(join(workspaceRoot, "package.json")).resolve;
  let languages: {
    pack?: unknown;
    packVersion?: unknown;
    asset?: unknown;
    assetSha256?: unknown;
  }[];
  try {
    languages =
      (
        JSON.parse(
          readFileSync(
            resolve(`${REFERENCE_PLUGIN_PACKAGE}/catalog.json`),
            "utf8",
          ),
        ) as { languages?: typeof languages }
      ).languages ?? [];
  } catch {
    return new Set();
  }
  const modified = new Set<string>();
  for (const language of languages) {
    const { pack, packVersion, asset, assetSha256 } = language;
    if (
      typeof pack !== "string" ||
      typeof asset !== "string" ||
      typeof assetSha256 !== "string"
    )
      continue;
    let manifestPath: string;
    try {
      manifestPath = resolve(`${pack}/package.json`);
    } catch {
      continue;
    }
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        version?: unknown;
      };
      if (manifest.version !== packVersion) continue;
      const digest = createHash("sha256")
        .update(readFileSync(join(dirname(manifestPath), asset)))
        .digest("hex");
      if (digest !== assetSha256) modified.add(pack);
    } catch {
      modified.add(pack);
    }
  }
  return modified;
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
  modified: ReadonlySet<string> = new Set(),
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
  const packLanguages = PLUGIN_LANGUAGE_PACKS.map((language) => ({
    ...language,
    found: production.filter((file) => language.pattern.test(file)),
  })).filter((language) => language.found.length > 0);
  // Without the plugin, any language it reads is a reason to suggest it for
  // symbols. `.pl` alone is shared with Perl, so Prolog counts only with a
  // `.plt` file or a `pack.pl`.
  const symbolLanguages = packLanguages.filter(
    (language) =>
      language.pack !== "kibi-lang-prolog" ||
      language.found.some((file) => /(?:\.plt|(?:^|\/)pack\.pl)$/i.test(file)),
  );
  const suggestSymbols = entry === undefined && symbolLanguages.length > 0;
  if (entry === undefined && !activate && !suggestSymbols) return null;
  const missing = packLanguages.filter((language) => {
    const installed = installedVersion(language.pack);
    const wanted = pinned.get(language.pack);
    return (
      installed === null ||
      (wanted !== undefined && installed !== wanted) ||
      modified.has(language.pack)
    );
  });
  if (!activate && !suggestSymbols && missing.length === 0) return null;
  const shown = activate
    ? references
    : suggestSymbols
      ? symbolLanguages
      : missing;
  return {
    package: REFERENCE_PLUGIN_PACKAGE,
    capabilities: [
      ...(activate ? [REFERENCE_EXTRACTOR_CAPABILITY_ID] : []),
      ...(entry === undefined ? [SYMBOL_EXTRACTOR_V2_CAPABILITY_ID] : []),
    ],
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
    modified: missing
      .filter((language) => modified.has(language.pack))
      .map((language) => language.pack),
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
  if (suggestion.activeForSymbolsOnly)
    return `${found} source file(s); ${suggestion.package} is active for symbols but not for source proofs: add ${activation} to its package.json kibi.plugins entry${packs === "" ? "" : `, and install${packs.slice(4)}`}`;
  const what = suggestion.capabilities.includes(
    REFERENCE_EXTRACTOR_CAPABILITY_ID,
  )
    ? "source proofs and symbols"
    : "symbols";
  const entry = JSON.stringify({
    package: suggestion.package,
    capabilities: Object.fromEntries(
      suggestion.capabilities.map((capability) => [
        capability,
        { mode: "augment" },
      ]),
    ),
  });
  return `${found} source file(s); ${what} for them need ${suggestion.package}${packs}: add ${suggestion.packs.length === 0 ? "it" : "them"} to devDependencies and this entry to package.json "kibi": { "plugins": [ ${entry} ] }`;
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
    modifiedPacks(workspaceRoot),
  );
  if (suggestion === null) return null;
  const noManifest = !existsSync(join(workspaceRoot, "package.json"));
  const install = [
    ...(suggestion.capabilities.length > 0 && !suggestion.activeForSymbolsOnly
      ? [suggestion.package]
      : []),
    ...suggestion.packs,
  ].join(" ");
  const changed =
    suggestion.modified.length === 0
      ? ""
      : ` The installed grammar of ${suggestion.modified.join(", ")} does not match the SHA-256 ${suggestion.package} pins; reinstall it.`;
  return `${describeReferenceLanguageSuggestion(suggestion)}.${changed}${
    noManifest
      ? ` This project has no package.json; create one that only holds Kibi's plugin list (npm init -y, then npm install -D ${install}) and add node_modules/ to .gitignore.`
      : ""
  } Without ${suggestion.capabilities.length === 0 ? "them, those files are refused for symbols and proofs" : "it, references proofs on those files are refused"}.`;
}
