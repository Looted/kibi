export type SourceClassification =
  | Readonly<{
      kind: "language";
      language: string;
      source: "extension" | "shebang" | "explicit";
    }>
  | Readonly<{
      kind: "file-level";
      language: string;
      source: "extension" | "shebang" | "explicit";
      reason: string;
    }>
  | Readonly<{
      kind: "ambiguous";
      language: string;
      candidates: readonly string[];
      reason: string;
    }>
  | Readonly<{
      kind: "conflict";
      language: "unknown";
      extensionLanguage?: string;
      shebangLanguage?: string;
      explicitLanguage?: string;
      reason: string;
    }>
  | Readonly<{
      kind: "unknown";
      language: "unknown";
      reason: string;
    }>;

type ShebangInterpreter = Readonly<{
  name: string;
  language?: string;
  family?: "shell";
}>;

type ExtensionSignal =
  | Readonly<{ kind: "language"; language: string }>
  | Readonly<{ kind: "file-level"; language: string; reason: string }>
  | Readonly<{
      kind: "ambiguous";
      language: string;
      candidates: readonly string[];
    }>;

const MAX_SHEBANG_LENGTH = 512;
const MAX_SHEBANG_TOKENS = 16;
const MAX_TOKEN_LENGTH = 128;

const EXTENSIONS: Readonly<Record<string, ExtensionSignal>> = {
  ".bash": { kind: "language", language: "bash" },
  ".c": { kind: "language", language: "c" },
  ".cc": { kind: "language", language: "cpp" },
  ".cjs": { kind: "language", language: "javascript" },
  ".cpp": { kind: "language", language: "cpp" },
  ".cs": { kind: "language", language: "csharp" },
  ".cts": { kind: "language", language: "typescript" },
  ".cxx": { kind: "language", language: "cpp" },
  ".go": { kind: "language", language: "go" },
  ".h": { kind: "ambiguous", language: "c-or-cpp", candidates: ["c", "cpp"] },
  ".hcl": { kind: "language", language: "hcl" },
  ".hh": { kind: "language", language: "cpp" },
  ".hpp": { kind: "language", language: "cpp" },
  ".hxx": { kind: "language", language: "cpp" },
  ".html": {
    kind: "file-level",
    language: "html",
    reason: "HTML is classified as a file-level document.",
  },
  ".java": { kind: "language", language: "java" },
  ".js": { kind: "language", language: "javascript" },
  ".jsx": { kind: "language", language: "javascript" },
  ".json": {
    kind: "file-level",
    language: "json",
    reason: "JSON is classified as a file-level document.",
  },
  ".kt": { kind: "language", language: "kotlin" },
  ".mjs": { kind: "language", language: "javascript" },
  ".mts": { kind: "language", language: "typescript" },
  ".php": { kind: "language", language: "php" },
  ".pl": {
    kind: "ambiguous",
    language: "perl-or-prolog",
    candidates: ["perl", "prolog"],
  },
  ".py": { kind: "language", language: "python" },
  ".pyi": { kind: "language", language: "python" },
  ".rb": { kind: "language", language: "ruby" },
  ".rs": { kind: "language", language: "rust" },
  ".sh": {
    kind: "file-level",
    language: "shell",
    reason: "A .sh extension does not identify a shell dialect.",
  },
  ".sql": {
    kind: "file-level",
    language: "sql",
    reason: "SQL is classified as a file-level document.",
  },
  ".swift": { kind: "language", language: "swift" },
  ".ts": { kind: "language", language: "typescript" },
  ".tsx": { kind: "language", language: "typescript" },
  ".tf": { kind: "language", language: "terraform" },
  ".yaml": {
    kind: "file-level",
    language: "yaml",
    reason: "YAML is classified as a file-level document.",
  },
  ".yml": {
    kind: "file-level",
    language: "yaml",
    reason: "YAML is classified as a file-level document.",
  },
  ".css": {
    kind: "file-level",
    language: "css",
    reason: "CSS is classified as a file-level document.",
  },
};

const FILE_LEVEL_LANGUAGES = new Set([
  "css",
  "html",
  "json",
  "perl",
  "prolog",
  "shell",
  "sql",
  "yaml",
]);

const SHELL_INTERPRETERS = new Set([
  "ash",
  "busybox",
  "csh",
  "dash",
  "fish",
  "ksh",
  "mksh",
  "pwsh",
  "sh",
  "tcsh",
  "yash",
  "zsh",
]);

function basename(value: string): string {
  return value.split(/[\\/]/).at(-1) ?? value;
}

function extensionOf(filePath: string): string {
  const name = basename(filePath);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

function canonicalLanguage(value: string): string | undefined {
  const language = value.trim().toLowerCase();
  if (language === "") return undefined;
  if (["py", "python", "python2", "python3"].includes(language))
    return "python";
  if (["bash", "bash5"].includes(language)) return "bash";
  if (["rb", "ruby"].includes(language) || /^ruby\d+(?:\.\d+)*$/.test(language))
    return "ruby";
  if (["js", "javascript", "node", "nodejs"].includes(language))
    return "javascript";
  if (["ts", "typescript"].includes(language)) return "typescript";
  if (["c++", "cpp", "cxx"].includes(language)) return "cpp";
  if (["c#", "c-sharp", "csharp", "cs"].includes(language)) return "csharp";
  if (["perl", "pl"].includes(language)) return "perl";
  if (["prolog", "swipl"].includes(language)) return "prolog";
  if (language === "tf") return "terraform";
  return language;
}

function tokenizeWords(value: string): string[] | undefined {
  const words: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaped = false;
  let started = false;
  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
      started = true;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      started = true;
      continue;
    }
    if (quote !== undefined) {
      if (character === quote) quote = undefined;
      else current += character;
      started = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      started = true;
      continue;
    }
    if (/\s/.test(character)) {
      if (started) {
        words.push(current);
        if (words.length > MAX_SHEBANG_TOKENS) return undefined;
        current = "";
        started = false;
      }
      continue;
    }
    current += character;
    started = true;
    if (current.length > MAX_TOKEN_LENGTH) return undefined;
  }
  if (escaped || quote !== undefined) return undefined;
  if (started) words.push(current);
  return words.length > MAX_SHEBANG_TOKENS ? undefined : words;
}

function envCommand(arguments_: readonly string[]): string | undefined {
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === undefined) return undefined;
    if (argument === "--") return arguments_[index + 1];
    if (argument === "-S" || argument === "--split-string") {
      const commandText = arguments_.slice(index + 1).join(" ");
      return commandInSplitString(commandText);
    }
    if (argument.startsWith("--split-string=")) {
      return commandInSplitString(argument.slice("--split-string=".length));
    }
    if (
      argument === "-u" ||
      argument === "--unset" ||
      argument === "-C" ||
      argument === "--chdir" ||
      argument === "-a" ||
      argument === "--argv0"
    ) {
      index += 1;
      continue;
    }
    if (
      argument === "-i" ||
      argument === "--ignore-environment" ||
      argument.startsWith("--unset=") ||
      argument.startsWith("--chdir=") ||
      argument.startsWith("--argv0=") ||
      /^[A-Za-z_][A-Za-z0-9_]*=/.test(argument)
    ) {
      continue;
    }
    if (argument.startsWith("-")) return undefined;
    return argument;
  }
  return undefined;
}

function commandInSplitString(value: string): string | undefined {
  const words = tokenizeWords(value);
  if (!words) return undefined;
  let index = 0;
  while (index < words.length) {
    const argument = words[index];
    if (argument === undefined) return undefined;
    if (argument === "--") return words[index + 1];
    if (argument === "-i" || argument === "--ignore-environment") {
      index += 1;
      continue;
    }
    if (argument === "-u" || argument === "--unset") {
      const name = words[index + 1];
      if (name === undefined || name === "") return undefined;
      index += 2;
      continue;
    }
    if (argument.startsWith("--unset=")) {
      if (argument.length === "--unset=".length) return undefined;
      index += 1;
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argument)) {
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) return undefined;
    return argument;
  }
  return undefined;
}

function interpreterFor(command: string): ShebangInterpreter {
  const name = basename(command).toLowerCase();
  const withoutExe = name.endsWith(".exe") ? name.slice(0, -4) : name;
  if (/^(?:python|python\d+(?:\.\d+)*)$/.test(withoutExe)) {
    return { name: withoutExe, language: "python" };
  }
  if (/^ruby(?:\d+(?:\.\d+)*)?$/.test(withoutExe)) {
    return { name: withoutExe, language: "ruby" };
  }
  if (["node", "nodejs"].includes(withoutExe)) {
    return { name: withoutExe, language: "javascript" };
  }
  if (withoutExe === "bash" || /^bash\d+$/.test(withoutExe)) {
    return { name: withoutExe, language: "bash" };
  }
  if (SHELL_INTERPRETERS.has(withoutExe)) {
    return { name: withoutExe, family: "shell" };
  }
  if (/^(?:perl|perl\d+(?:\.\d+)*)$/.test(withoutExe)) {
    return { name: withoutExe, language: "perl" };
  }
  if (["prolog", "swipl", "gprolog"].includes(withoutExe)) {
    return { name: withoutExe, language: "prolog" };
  }
  return { name: withoutExe || "unknown" };
}

function shebangFor(content: string): ShebangInterpreter | undefined {
  const bomOffset = content.charCodeAt(0) === 0xfeff ? 1 : 0;
  const prefix = content.slice(bomOffset, bomOffset + MAX_SHEBANG_LENGTH + 2);
  if (!prefix.startsWith("#!")) return undefined;
  const lineEnd = prefix.search(/[\r\n]/);
  if (lineEnd < 0 && content.length > bomOffset + MAX_SHEBANG_LENGTH + 2) {
    return { name: "overlong-shebang" };
  }
  const line = prefix.slice(2, lineEnd < 0 ? undefined : lineEnd).trim();
  const words = tokenizeWords(line);
  if (!words || words.length === 0 || words[0] === undefined) {
    return { name: "malformed-shebang" };
  }
  const executable = basename(words[0]).toLowerCase();
  if (executable === "env") {
    const command = envCommand(words.slice(1));
    return command === undefined
      ? { name: "malformed-env-shebang" }
      : interpreterFor(command);
  }
  return interpreterFor(words[0]);
}

function classificationForLanguage(
  language: string,
  source: "extension" | "shebang" | "explicit",
): SourceClassification {
  if (FILE_LEVEL_LANGUAGES.has(language)) {
    return {
      kind: "file-level",
      language,
      source,
      reason: `${language} is retained as a file-level classification; no syntax extractor is selected.`,
    };
  }
  return { kind: "language", language, source };
}

function isExtensionCompatibleWith(
  extension: ExtensionSignal,
  language: string,
): boolean {
  if (extension.kind === "ambiguous")
    return extension.candidates.includes(language);
  if (extension.kind === "file-level" && extension.language === "shell") {
    return language === "bash" || language === "shell";
  }
  return extension.language === language;
}

function conflict(
  reason: string,
  details: Pick<
    Extract<SourceClassification, { kind: "conflict" }>,
    "extensionLanguage" | "shebangLanguage" | "explicitLanguage"
  > = {},
): SourceClassification {
  return { kind: "conflict", language: "unknown", reason, ...details };
}

/** Classifies a path and bounded snapshot prefix without executing the source or its interpreter. */
export function classifySource(
  filePath: string,
  content: string,
  explicitLanguageHint?: string,
): SourceClassification {
  const extension = EXTENSIONS[extensionOf(filePath)];
  const explicitRaw = explicitLanguageHint?.trim();
  const explicit = explicitRaw ? canonicalLanguage(explicitRaw) : undefined;
  const shebang = shebangFor(content);
  const shebangLanguage = shebang?.language;

  if (explicitRaw && explicit === undefined) {
    return conflict(
      `The explicit language hint '${explicitRaw}' is not recognized.`,
    );
  }

  if (explicit !== undefined) {
    if (
      extension !== undefined &&
      !isExtensionCompatibleWith(extension, explicit)
    ) {
      return conflict(
        `The explicit language '${explicit}' conflicts with the file extension classification.`,
        {
          extensionLanguage: extension.language,
          explicitLanguage: explicit,
          ...(shebangLanguage === undefined ? {} : { shebangLanguage }),
        },
      );
    }
    if (shebang !== undefined) {
      const shebangMatches =
        shebang.language === explicit ||
        (shebang.family === "shell" && explicit === "shell");
      if (!shebangMatches) {
        return conflict(
          `The explicit language '${explicit}' conflicts with the snapshot shebang.`,
          {
            ...(extension === undefined
              ? {}
              : { extensionLanguage: extension.language }),
            ...(shebangLanguage === undefined ? {} : { shebangLanguage }),
            explicitLanguage: explicit,
          },
        );
      }
    }
    return classificationForLanguage(explicit, "explicit");
  }

  if (extension?.kind === "ambiguous") {
    if (shebang === undefined) {
      return {
        kind: "ambiguous",
        language: extension.language,
        candidates: extension.candidates,
        reason: `The '${extension.language === "c-or-cpp" ? ".h" : ".pl"}' extension does not select one language.`,
      };
    }
    const resolvedLanguage = shebang.language;
    if (
      resolvedLanguage !== undefined &&
      extension.candidates.includes(resolvedLanguage)
    ) {
      return classificationForLanguage(resolvedLanguage, "shebang");
    }
    return conflict(
      "The file extension is ambiguous and the shebang does not resolve it to a supported candidate.",
      {
        extensionLanguage: extension.language,
        ...(shebangLanguage === undefined ? {} : { shebangLanguage }),
      },
    );
  }

  const hasExtension = extensionOf(filePath) !== "";
  if (extension !== undefined) {
    if (shebang !== undefined) {
      if (shebang.family === "shell") {
        if (extension.language === "shell") {
          return {
            kind: "file-level",
            language: "shell",
            source: "shebang",
            reason: `The ${shebang.name} shell dialect is retained as file-level source.`,
          };
        }
        return conflict(
          `The ${shebang.name} shell shebang conflicts with the file extension language.`,
          {
            extensionLanguage: extension.language,
            shebangLanguage: "shell",
          },
        );
      }
      if (shebang.language !== undefined) {
        if (!isExtensionCompatibleWith(extension, shebang.language)) {
          return conflict(
            `The ${shebang.language} shebang conflicts with the file extension language.`,
            {
              extensionLanguage: extension.language,
              shebangLanguage: shebang.language,
            },
          );
        }
        return classificationForLanguage(shebang.language, "shebang");
      }
      return conflict(
        `The shebang interpreter '${shebang.name}' is not qualified for the file extension language.`,
        {
          extensionLanguage: extension.language,
          shebangLanguage: shebang.name,
        },
      );
    }
    if (extension.kind === "file-level") {
      return {
        kind: "file-level",
        language: extension.language,
        source: "extension",
        reason: extension.reason,
      };
    }
    return classificationForLanguage(extension.language, "extension");
  }

  if (hasExtension) {
    return {
      kind: "unknown",
      language: "unknown",
      reason:
        "The file extension is not present in the source language catalog.",
    };
  }

  if (shebang === undefined) {
    return {
      kind: "unknown",
      language: "unknown",
      reason: "No recognized source extension or shebang is present.",
    };
  }
  if (shebang.language !== undefined) {
    return classificationForLanguage(shebang.language, "shebang");
  }
  if (shebang.family === "shell") {
    return {
      kind: "file-level",
      language: "shell",
      source: "shebang",
      reason: `The ${shebang.name} shell dialect is retained as file-level source.`,
    };
  }
  return {
    kind: "unknown",
    language: "unknown",
    reason: `The '${shebang.name}' interpreter is not in the executable source catalog.`,
  };
}
