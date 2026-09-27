// implements REQ-source-analysis-v2
export const TREE_SITTER_LANGUAGES = {
  python: { extensions: [".py", ".pyi"], aliases: ["python", "py"] },
  go: { extensions: [".go"], aliases: ["go", "golang"] },
  rust: { extensions: [".rs"], aliases: ["rust", "rs"] },
  java: { extensions: [".java"], aliases: ["java"] },
  csharp: {
    extensions: [".cs"],
    aliases: ["csharp", "c-sharp", "c#", "cs"],
  },
  php: { extensions: [".php"], aliases: ["php"] },
  c: {
    extensions: [".c"],
    explicitOnlyExtensions: [".h"],
    aliases: ["c"],
  },
  cpp: {
    extensions: [".cc", ".cpp", ".cxx", ".hh", ".hpp", ".hxx"],
    explicitOnlyExtensions: [".h"],
    aliases: ["cpp", "c++", "cxx"],
  },
  bash: { extensions: [".bash", ".sh"], aliases: ["bash"] },
  ruby: { extensions: [".rb"], aliases: ["ruby", "rb"] },
  terraform: { extensions: [".tf"], aliases: ["terraform", "tf"] },
  hcl: { extensions: [".hcl"], aliases: ["hcl"] },
} as const;

export type TreeSitterLanguage = keyof typeof TREE_SITTER_LANGUAGES;

const EXTENSION_LANGUAGE = new Map<string, TreeSitterLanguage>(
  Object.entries(TREE_SITTER_LANGUAGES).flatMap(([language, entry]) =>
    entry.extensions.map(
      (extension) => [extension, language as TreeSitterLanguage] as const,
    ),
  ),
);

const LANGUAGE_ALIASES: Readonly<Record<string, TreeSitterLanguage>> =
  Object.fromEntries(
    Object.entries(TREE_SITTER_LANGUAGES).flatMap(([language, entry]) =>
      entry.aliases.map((alias) => [alias, language as TreeSitterLanguage]),
    ),
  );

export function normalizeTreeSitterLanguage(
  value: string | undefined,
): TreeSitterLanguage | undefined {
  if (value === undefined) return undefined;
  const alias = value.trim().toLowerCase();
  return Object.hasOwn(LANGUAGE_ALIASES, alias)
    ? LANGUAGE_ALIASES[alias]
    : undefined;
}

export function treeSitterLanguageForPath(
  filePath: string,
): TreeSitterLanguage | undefined {
  const extension = filePath.match(/\.[^./\\]+$/)?.[0]?.toLowerCase();
  return extension === undefined
    ? undefined
    : EXTENSION_LANGUAGE.get(extension);
}
