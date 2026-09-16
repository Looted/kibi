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

function removeSyntacticTrailingCommas(content: string): string {
  let normalized = "";
  let quote: '"' | "'" | "`" | null = null;
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === undefined) continue;

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

    const nextCharacter = content[index + 1];
    if (isTrailingCommaBeforeCloser(character, nextCharacter)) {
      continue;
    }

    normalized += character;
  }

  return normalized;
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

  const normalizedRemovedContent =
    removeSyntacticTrailingCommas(removedContent);
  const normalizedAddedContent = removeSyntacticTrailingCommas(addedContent);

  if (
    normalizedRemovedContent.length === 0 &&
    normalizedAddedContent.length === 0
  ) {
    return false;
  }
  return normalizedRemovedContent !== normalizedAddedContent;
}

// implements REQ-cli-staged-impact-enforcement
export function hasMeaningfulSourceDiff(diffText: string): boolean {
  const hunkLines: string[] = [];

  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("@@")) {
      if (hasMeaningfulDiffHunk(hunkLines)) return true;
      hunkLines.length = 0;
      continue;
    }
    if (hunkLines.length > 0 || line.startsWith("+") || line.startsWith("-")) {
      hunkLines.push(line);
    }
  }

  return hasMeaningfulDiffHunk(hunkLines);
}
