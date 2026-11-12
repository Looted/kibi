export function isTrailingCommaBeforeCloser(
  character: string,
  nextCharacter: string | undefined,
): boolean {
  return (
    character === "," &&
    (nextCharacter === ")" || nextCharacter === "]" || nextCharacter === "}")
  );
}

function normalizeDiffContent(line: string): string {
  let normalized = "";
  let quote: '"' | "'" | "`" | null = null;
  let escaped = false;

  for (const character of line.slice(1)) {
    if (quote !== null) {
      normalized += character;

      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      normalized += character;
      continue;
    }

    if (!/\s/.test(character)) normalized += character;
  }

  return normalized;
}

function removeSyntacticTrailingCommas(content: string): string[] {
  let quote: '"' | "'" | "`" | null = null;
  let escaped = false;

  return [...content].filter((character, index, characters) => {
    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      return true;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      return true;
    }

    return !isTrailingCommaBeforeCloser(character, characters[index + 1]);
  });
}

function hasMeaningfulDiffHunk(diffLines: readonly string[]): boolean {
  let removedContent = "";
  let addedContent = "";

  for (const line of diffLines) {
    if (line.startsWith("-") && !line.startsWith("---")) {
      removedContent += normalizeDiffContent(line);
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      addedContent += normalizeDiffContent(line);
    }
  }

  // Two empty sides compare equal, so an empty hunk is not meaningful.
  return (
    JSON.stringify(removeSyntacticTrailingCommas(removedContent)) !==
    JSON.stringify(removeSyntacticTrailingCommas(addedContent))
  );
}

export function hasMeaningfulSourceDiff(diffText: string): boolean {
  // Every "@@" header line starts a new hunk; text before the first header
  // forms one more.
  return diffText
    .split(/^@@.*/m)
    .some((hunk) => hasMeaningfulDiffHunk(hunk.split(/\r?\n/)));
}
