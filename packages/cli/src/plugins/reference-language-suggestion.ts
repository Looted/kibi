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
import {
  generatedSourceFiles,
  kbReferencedFiles,
} from "./generated-sources.js";
import { readProjectKibiConfig } from "./project-config.js";
import { REFERENCE_PLUGIN_PACKAGE } from "./proof-reference-extractors.js";

const NOT_PRODUCTION =
  /(?:^|\/)(?:node_modules|dist|build|target|bin|obj|vendor|coverage|tests?|__tests__|e2e|fixtures?)\/|^\.kb\/|(?:_test\.go|Tests?\.(?:java|cs)|\.(?:test|spec)\.[^/]+)$/i;

export type ReferenceLanguageSuggestion = Readonly<{
  package: string;
  /** Capabilities to activate, each in augment mode; empty when all are active. */
  capabilities: readonly string[];
  languages: readonly Readonly<{
    name: string;
    files: number;
    /** Every counted file is generated and counts because the KB uses it. */
    generatedUsedByKb?: boolean;
    /** Source proofs read this language through the plugin. */
    proofs?: boolean;
  }>[];
  evidence: readonly string[];
  /** The project already lists the plugin, but not for proofs. */
  activeForSymbolsOnly: boolean;
  /** The plugin package is declared in package.json and resolves. */
  pluginInstalled: boolean;
  /** kibi-lang-* packs the tracked sources need that are not installed. */
  packs: readonly string[];
  /** Installed packs whose grammar bytes differ from the pinned SHA-256. */
  modified: readonly string[];
}>;

/** Whether a package.json lists a package in any dependency field. */
export function manifestDeclares(
  manifest: unknown,
  packageName: string,
): boolean {
  if (typeof manifest !== "object" || manifest === null) return false;
  return ["dependencies", "devDependencies", "optionalDependencies"].some(
    (field) => {
      const dependencies = (manifest as Record<string, unknown>)[field];
      return (
        typeof dependencies === "object" &&
        dependencies !== null &&
        Object.hasOwn(dependencies, packageName)
      );
    },
  );
}

/** Whether a package resolves from the workspace root, and at which version. */
export type InstalledVersion = (packageName: string) => string | null;

/** The version of a package installed for the workspace, or null. */
export function workspaceInstalledVersion(
  workspaceRoot: string,
): InstalledVersion {
  const resolve = createRequire(join(workspaceRoot, "package.json")).resolve;
  return (packageName) => {
    // A package whose exports omit ./package.json (kibi-plugin-treesitter)
    // is found through the node_modules lookup directories instead.
    const manifests = [
      () => resolve(`${packageName}/package.json`),
      ...(resolve.paths(packageName) ?? []).map(
        (directory) => () => join(directory, packageName, "package.json"),
      ),
    ];
    for (const manifestPath of manifests) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath(), "utf8")) as {
          version?: unknown;
        };
        return typeof manifest.version === "string" ? manifest.version : null;
      } catch {
        // Try the next lookup directory.
      }
    }
    return null;
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
 * Which tracked files a tool generated and which of those the KB uses. A
 * generated file counts toward a pack only when the KB references it.
 */
export type PackRelevance = Readonly<{
  /** Files marked generated or vendored, or opening with a generator marker. */
  generated?: ReadonlySet<string>;
  /** Generated files a tracked KB file names (a symbol, a proof contract). */
  referenced?: ReadonlySet<string>;
}>;

/** The pack that reads `file`, if any. */
export function languagePackFor(file: string): string | null {
  return (
    PLUGIN_LANGUAGE_PACKS.find((language) => language.pattern.test(file))
      ?.pack ?? null
  );
}

/**
 * Whether the project has sources kibi-plugin-treesitter must read for it:
 * Go, Java, C# or Rust files whose references source proofs read only
 * through the plugin while it is not activated for that, or files of a
 * language whose kibi-lang-* pack is not installed (at the version the
 * installed plugin pins) while the plugin is listed or being suggested.
 * Generated files count only when the KB references them, and a pack listed
 * in kibi.declinedLanguagePacks is never asked for.
 * Reads file names and package manifests only; never imports a plugin.
 */
// implements REQ-kibi-tree-sitter-references, REQ-kibi-tree-sitter-language-packs
export function referenceLanguageSuggestion(
  files: readonly string[],
  config: ProjectKibiConfig,
  installedVersion: InstalledVersion = () => null,
  pinned: ReadonlyMap<string, string> = new Map(),
  modified: ReadonlySet<string> = new Set(),
  pluginDeclared = true,
  relevance: PackRelevance = {},
): ReferenceLanguageSuggestion | null {
  const generated = relevance.generated ?? new Set<string>();
  const referenced = relevance.referenced ?? new Set<string>();
  const declined = new Set(config.declinedLanguagePacks ?? []);
  const production = files.filter((file) => {
    if (NOT_PRODUCTION.test(file)) return false;
    const pack = languagePackFor(file);
    if (pack !== null && declined.has(pack)) return false;
    return !generated.has(file) || referenced.has(file);
  });
  const usedByKb = (found: readonly string[]): boolean =>
    found.length > 0 && found.every((file) => generated.has(file));
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
  const confirmed = packLanguages.filter(
    (language) =>
      language.pack !== "kibi-lang-prolog" ||
      language.found.some((file) => /(?:\.plt|(?:^|\/)pack\.pl)$/i.test(file)),
  );
  const symbolLanguages = confirmed;
  const suggestSymbols = entry === undefined && symbolLanguages.length > 0;
  if (entry === undefined && !activate && !suggestSymbols) return null;
  const missing = confirmed.filter((language) => {
    const installed = installedVersion(language.pack);
    const wanted = pinned.get(language.pack);
    return (
      installed === null ||
      (wanted !== undefined && installed !== wanted) ||
      modified.has(language.pack)
    );
  });
  if (!activate && !suggestSymbols && missing.length === 0) return null;
  // With proofs to activate, the reference languages lead and the other
  // languages the plugin would read (or whose packs are missing) follow, so
  // every pack named has its files named too.
  const rest = suggestSymbols ? symbolLanguages : missing;
  const shown = activate
    ? [
        ...references.map((language) => ({ ...language, proofs: true })),
        ...rest.filter(
          (language) =>
            !references.some((reference) => reference.name === language.name),
        ),
      ]
    : rest;
  return {
    package: REFERENCE_PLUGIN_PACKAGE,
    capabilities: [
      ...(activate ? [REFERENCE_EXTRACTOR_CAPABILITY_ID] : []),
      ...(entry === undefined ? [SYMBOL_EXTRACTOR_V2_CAPABILITY_ID] : []),
    ],
    languages: shown.map((language) => ({
      name: language.name,
      files: language.found.length,
      ...(usedByKb(language.found) ? { generatedUsedByKb: true } : {}),
      ...("proofs" in language ? { proofs: true } : {}),
    })),
    evidence: shown.flatMap((language) => language.found).slice(0, 5),
    activeForSymbolsOnly: entry !== undefined,
    pluginInstalled:
      pluginDeclared && installedVersion(REFERENCE_PLUGIN_PACKAGE) !== null,
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
  const name = (language: ReferenceLanguageSuggestion["languages"][number]) =>
    `${language.files} ${language.name}${language.generatedUsedByKb ? " (generated, used by the KB)" : ""}`;
  const proofLanguages = suggestion.languages.filter(
    (language) => language.proofs,
  );
  const symbolLanguages = suggestion.languages.filter(
    (language) => !language.proofs,
  );
  // Say which languages are for proofs and which only for symbols when both
  // are named, so a pack is never presented as enabling proofs it cannot.
  const mixed = proofLanguages.length > 0 && symbolLanguages.length > 0;
  const found = mixed
    ? `${proofLanguages.map(name).join(", ")} source file(s) for source proofs and symbols, and ${symbolLanguages.map(name).join(", ")} for symbols only`
    : `${suggestion.languages.map(name).join(", ")} source file(s)`;
  const activation = suggestion.capabilities
    .map((capability) => `"${capability}": { "mode": "augment" }`)
    .join(", ");
  const packs =
    suggestion.packs.length === 0
      ? ""
      : ` and the grammar pack(s) ${suggestion.packs.join(", ")}`;
  if (suggestion.capabilities.length === 0)
    return `${found}; ${suggestion.package} reads them only with${packs.slice(4)} installed: npm install --save-dev ${suggestion.packs.join(" ")}`;
  if (suggestion.activeForSymbolsOnly)
    return `${found}; ${suggestion.package} is active for symbols but not for source proofs: add ${activation} to its package.json kibi.plugins entry${packs === "" ? "" : `, and install${packs.slice(4)}`}`;
  const what = mixed
    ? "they"
    : suggestion.capabilities.includes(REFERENCE_EXTRACTOR_CAPABILITY_ID)
      ? "source proofs and symbols for them"
      : "symbols for them";
  const entry = JSON.stringify({
    package: suggestion.package,
    capabilities: Object.fromEntries(
      suggestion.capabilities.map((capability) => [
        capability,
        { mode: "augment" },
      ]),
    ),
  });
  const activate = `add this entry to package.json "kibi": { "plugins": [ ${entry} ] }`;
  // An installed plugin only lacks its kibi.plugins entry.
  const install = [
    ...(suggestion.pluginInstalled ? [] : [suggestion.package]),
    ...suggestion.packs,
  ];
  const needs = suggestion.pluginInstalled
    ? `${suggestion.package}, which is installed but not activated${packs === "" ? "" : `,${packs}`}`
    : `${suggestion.package}${packs}`;
  return install.length === 0
    ? `${found}; ${what} need ${needs}: ${activate}`
    : `${found}; ${what} need ${needs}: npm install --save-dev ${install.join(" ")}, then ${activate}`;
}

/**
 * The generated files among the tracked sources a pack would read, and the
 * ones the tracked KB names. Reads `.gitattributes` through git, the first
 * lines of those sources and the tracked `.kb/` text.
 */
// implements REQ-kibi-tree-sitter-language-packs
export function workspacePackRelevance(
  workspaceRoot: string,
  files: readonly string[],
  config: ProjectKibiConfig = {},
): Required<PackRelevance> {
  const candidates = files.filter(
    (file) => !NOT_PRODUCTION.test(file) && languagePackFor(file) !== null,
  );
  const generated = generatedSourceFiles(workspaceRoot, candidates, {
    ...(config.generatedPaths ? { patterns: config.generatedPaths } : {}),
  });
  return {
    generated,
    referenced: kbReferencedFiles(
      workspaceRoot,
      files.filter((file) => file.startsWith(".kb/")),
      [...generated],
    ),
  };
}

function readManifestOrNull(workspaceRoot: string): unknown {
  try {
    return JSON.parse(
      readFileSync(join(workspaceRoot, "package.json"), "utf8"),
    );
  } catch {
    return null;
  }
}

/**
 * The suggestion for a workspace, from its tracked files, as one line for
 * `kibi init` and `kibi doctor`, or null when nothing is missing. A project
 * without a package.json is told to create a minimal one first.
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
  const relevance = workspacePackRelevance(workspaceRoot, files, config);
  const suggestion = referenceLanguageSuggestion(
    files,
    config,
    workspaceInstalledVersion(workspaceRoot),
    pinnedPackVersions(workspaceRoot),
    modifiedPacks(workspaceRoot),
    manifestDeclares(
      readManifestOrNull(workspaceRoot),
      REFERENCE_PLUGIN_PACKAGE,
    ),
    relevance,
  );
  if (suggestion === null) return null;
  const skipped = [...relevance.generated].filter(
    (file) => !relevance.referenced.has(file),
  ).length;
  const noManifest = !existsSync(join(workspaceRoot, "package.json"));
  const changed =
    suggestion.modified.length === 0
      ? ""
      : ` The installed grammar of ${suggestion.modified.join(", ")} does not match the SHA-256 ${suggestion.package} pins; reinstall it.`;
  const generatedNote =
    skipped === 0
      ? ""
      : ` ${skipped} generated file(s) are not counted (kibi.generatedPaths, linguist-generated or a generator header) unless the KB references them.`;
  const declineNote =
    suggestion.packs.length === 0
      ? ""
      : ` To skip a pack the project does not need, list it in package.json kibi.declinedLanguagePacks (for example "declinedLanguagePacks": ["${(suggestion.packs[0] as string).replace(/@[^@]*$/, "")}"]); staged changes to files in that language then get a whole-file review instead of blocking.`;
  return `${describeReferenceLanguageSuggestion(suggestion)}.${changed}${generatedNote}${
    noManifest
      ? " This project has no package.json: run npm init -y first to create a minimal one (Kibi reads only its devDependencies and kibi.plugins), then run the install and add the kibi.plugins entry above, and add node_modules/ to .gitignore."
      : ""
  } ${
    suggestion.capabilities.includes(REFERENCE_EXTRACTOR_CAPABILITY_ID)
      ? "Without it, references proofs on those files are refused."
      : "Until then, symbols in those files are placed by text match and are approximate."
  }${declineNote}`;
}
