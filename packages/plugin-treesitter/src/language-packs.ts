import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TreeSitterLanguage } from "./catalog.js";

/**
 * Grammars other than Python and SWI-Prolog ship in data-only language packs
 * (kibi-lang-go, kibi-lang-rust, ...), so a project installs only the
 * languages it uses. This release's catalog pins each pack's version and the
 * SHA-256 of every grammar file in it, so a pack is used only when its bytes
 * are the ones this release was qualified with. A missing or different pack
 * refuses the file and names the install line; it is never skipped.
 */

export const LANGUAGE_PACK_MISSING = "TREESITTER_LANGUAGE_PACK_MISSING";
export const LANGUAGE_PACK_MISMATCH = "TREESITTER_LANGUAGE_PACK_MISMATCH";

interface CatalogLanguage {
  readonly id: string;
  readonly asset: string;
  readonly assetBytes: number;
  readonly assetSha256: string;
  readonly pack?: string;
  readonly packVersion?: string;
}

interface Catalog {
  readonly pluginVersion: string;
  readonly languages: readonly CatalogLanguage[];
}

const LABELS: Readonly<Record<TreeSitterLanguage, string>> = {
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
  csharp: "C#",
  php: "PHP",
  c: "C",
  cpp: "C++",
  bash: "Bash",
  ruby: "Ruby",
  terraform: "Terraform",
  hcl: "HCL",
  prolog: "SWI-Prolog",
};

let catalog: Catalog | undefined;

function readCatalog(): Catalog {
  catalog ??= JSON.parse(
    readFileSync(new URL("../catalog.json", import.meta.url), "utf8"),
  ) as Catalog;
  return catalog;
}

function entryOf(language: TreeSitterLanguage): CatalogLanguage {
  const entry = readCatalog().languages.find((item) => item.id === language);
  if (entry === undefined)
    throw new Error(`catalog.json has no entry for ${language}`);
  return entry;
}

// implements REQ-kibi-tree-sitter-language-packs
export interface LanguagePack {
  readonly package: string;
  readonly version: string;
}

/** The pack a language's grammar ships in, or undefined when it is built in. */
// implements REQ-kibi-tree-sitter-language-packs
export function languagePackOf(
  language: TreeSitterLanguage,
): LanguagePack | undefined {
  const entry = entryOf(language);
  return entry.pack === undefined || entry.packVersion === undefined
    ? undefined
    : { package: entry.pack, version: entry.packVersion };
}

/** Every pack this release knows, with the languages each one carries. */
// implements REQ-kibi-tree-sitter-language-packs
export function languagePacks(): readonly (LanguagePack & {
  readonly languages: readonly string[];
})[] {
  const packs = new Map<string, LanguagePack & { languages: string[] }>();
  for (const entry of readCatalog().languages) {
    if (entry.pack === undefined || entry.packVersion === undefined) continue;
    const pack = packs.get(entry.pack) ?? {
      package: entry.pack,
      version: entry.packVersion,
      languages: [],
    };
    pack.languages.push(entry.id);
    packs.set(entry.pack, pack);
  }
  return [...packs.values()];
}

export class LanguagePackError extends Error {
  constructor(
    readonly code: typeof LANGUAGE_PACK_MISSING | typeof LANGUAGE_PACK_MISMATCH,
    message: string,
  ) {
    super(message);
    this.name = "LanguagePackError";
  }
}

function installLine(pack: LanguagePack): string {
  return `npm install --save-dev ${pack.package}@${pack.version}`;
}

const resolvedRoots = new Map<string, string>();

/** The installed root of a language's pack; throws a LanguagePackError. */
function packRoot(language: TreeSitterLanguage, pack: LanguagePack): string {
  const cached = resolvedRoots.get(pack.package);
  if (cached !== undefined) return cached;
  let manifestPath: string;
  try {
    manifestPath = createRequire(import.meta.url).resolve(
      `${pack.package}/package.json`,
    );
  } catch {
    throw new LanguagePackError(
      LANGUAGE_PACK_MISSING,
      `${LABELS[language]} files need ${pack.package} ${pack.version}, which is not installed. Run: ${installLine(pack)}`,
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    name?: unknown;
    version?: unknown;
  };
  if (manifest.name !== pack.package || manifest.version !== pack.version)
    throw new LanguagePackError(
      LANGUAGE_PACK_MISMATCH,
      `kibi-plugin-treesitter ${readCatalog().pluginVersion} reads ${LABELS[language]} with ${pack.package} ${pack.version}, but ${String(manifest.version)} is installed. Run: ${installLine(pack)}`,
    );
  const root = dirname(manifestPath);
  resolvedRoots.set(pack.package, root);
  return root;
}

/**
 * Why a language cannot be read here, or undefined when its grammar is built
 * in or its pack is installed at the pinned version. Bytes are checked when
 * the worker loads the grammar.
 */
// implements REQ-kibi-tree-sitter-language-packs
export function languagePackProblem(
  language: TreeSitterLanguage,
): { readonly code: string; readonly message: string } | undefined {
  const pack = languagePackOf(language);
  if (pack === undefined) return undefined;
  try {
    packRoot(language, pack);
    return undefined;
  } catch (error) {
    if (error instanceof LanguagePackError)
      return { code: error.code, message: error.message };
    throw error;
  }
}

/**
 * The grammar to load: the built-in asset's path, or a pack's bytes after
 * their SHA-256 matched the digest this release pins.
 */
// implements REQ-kibi-tree-sitter-language-packs
export function grammarSource(
  language: TreeSitterLanguage,
): string | Uint8Array {
  const entry = entryOf(language);
  const pack = languagePackOf(language);
  if (pack === undefined)
    return fileURLToPath(new URL(`../${entry.asset}`, import.meta.url));
  const bytes = readFileSync(join(packRoot(language, pack), entry.asset));
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== entry.assetBytes || digest !== entry.assetSha256)
    throw new LanguagePackError(
      LANGUAGE_PACK_MISMATCH,
      `${pack.package}/${entry.asset} is not the ${LABELS[language]} grammar kibi-plugin-treesitter ${readCatalog().pluginVersion} was qualified with (sha256 ${entry.assetSha256}). Reinstall it: ${installLine(pack)}`,
    );
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
