// implements REQ-source-analysis-v2
export const TREE_SITTER_LANGUAGES = {
  python: { extensions: [".py", ".pyi"] },
  go: { extensions: [".go"] },
  rust: { extensions: [".rs"] },
} as const;

export type TreeSitterLanguage = keyof typeof TREE_SITTER_LANGUAGES;

const EXTENSION_LANGUAGE = new Map<string, TreeSitterLanguage>(
  Object.entries(TREE_SITTER_LANGUAGES).flatMap(([language, entry]) =>
    entry.extensions.map(
      (extension) => [extension, language as TreeSitterLanguage] as const,
    ),
  ),
);

const LANGUAGE_ALIASES: Readonly<Record<string, TreeSitterLanguage>> = {
  py: "python",
  python: "python",
  go: "go",
  golang: "go",
  rs: "rust",
  rust: "rust",
};

export function normalizeTreeSitterLanguage(
  value: string | undefined,
): TreeSitterLanguage | undefined {
  if (value === undefined) return undefined;
  return LANGUAGE_ALIASES[value.trim().toLowerCase()];
}

export function treeSitterLanguageForPath(
  filePath: string,
): TreeSitterLanguage | undefined {
  const extension = filePath.match(/\.[^./\\]+$/)?.[0]?.toLowerCase();
  return extension === undefined
    ? undefined
    : EXTENSION_LANGUAGE.get(extension);
}
