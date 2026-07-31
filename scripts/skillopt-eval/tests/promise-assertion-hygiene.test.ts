import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Node,
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  isAsExpression,
  isAwaitExpression,
  isCallExpression,
  isElementAccessExpression,
  isIdentifier,
  isNonNullExpression,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isStringLiteral,
  isTypeAssertionExpression,
} from "typescript";

type AssertionFinding = Readonly<{
  readonly line: number;
  readonly file: string;
  readonly snippet: string;
}>;

function skipTransparentWrapper(expression: Node): Node {
  let current = expression;

  while (true) {
    if (isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (isAsExpression(current)) {
      current = current.expression;
      continue;
    }
    if (isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }
    if (isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }

    return current;
  }
}

function isExpectChain(expression: Node): boolean {
  let current = skipTransparentWrapper(expression);
  while (true) {
    if (isPropertyAccessExpression(current)) {
      current = skipTransparentWrapper(current.expression);
      continue;
    }
    if (isElementAccessExpression(current)) {
      current = skipTransparentWrapper(current.expression);
      continue;
    }
    if (isCallExpression(current)) {
      const target = skipTransparentWrapper(current.expression);
      if (isIdentifier(target) && target.text === "expect") {
        return true;
      }
      current = skipTransparentWrapper(target);
      continue;
    }
    return false;
  }
}

function hasResolvesOrRejects(expression: Node): boolean {
  let current = skipTransparentWrapper(expression);
  while (true) {
    if (isPropertyAccessExpression(current)) {
      const access = current;
      if (access.name?.text === "resolves" || access.name?.text === "rejects") {
        return true;
      }
      current = skipTransparentWrapper(access.expression);
      continue;
    }
    if (isElementAccessExpression(current)) {
      const argument = current.argumentExpression;
      if (isStringLiteral(argument)) {
        if (argument.text === "resolves" || argument.text === "rejects") {
          return true;
        }
      }
      current = skipTransparentWrapper(current.expression);
      continue;
    }
    if (isCallExpression(current)) {
      current = skipTransparentWrapper(current.expression);
      continue;
    }
    if (
      isParenthesizedExpression(current) ||
      isAsExpression(current) ||
      isTypeAssertionExpression(current) ||
      isNonNullExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    return false;
  }
}

const fixtureRoots: string[] = [];

afterEach(async () => {
  for (const root of fixtureRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function isAwaited(node: Node): boolean {
  let current: Node | undefined = node.parent;
  while (current) {
    if (isAwaitExpression(current)) return true;
    current = current.parent;
  }
  return false;
}

function findUnawaitedPromiseAssertions(
  filePath: string,
  source: string,
): AssertionFinding[] {
  const sourceFile = createSourceFile(
    filePath,
    source,
    ScriptTarget.Latest,
    true,
    ScriptKind.TS,
  );
  const findings: AssertionFinding[] = [];
  const seenLines = new Set<number>();

  function visit(node: Node): void {
    if (hasResolvesOrRejects(node) && isExpectChain(node) && !isAwaited(node)) {
      const start = node.getStart();
      const { line } = sourceFile.getLineAndCharacterOfPosition(start);
      const lineNumber = line + 1;
      if (!seenLines.has(lineNumber)) {
        seenLines.add(lineNumber);
        findings.push({
          file: filePath,
          line: lineNumber,
          snippet: source.split("\n")[line]?.trim() ?? "",
        });
      }
    }

    for (const child of node.getChildren()) {
      visit(child);
    }
  }

  visit(sourceFile);
  return findings;
}

async function readAndFind(filePath: string): Promise<AssertionFinding[]> {
  const source = await readFile(filePath, "utf8");
  return findUnawaitedPromiseAssertions(filePath, source);
}

test("target skillopt-eval tests do not contain unawaited promise assertions", async () => {
  const testsRoot = fileURLToPath(new URL(".", import.meta.url));
  const entries = await readdir(testsRoot, { withFileTypes: true });
  const fixtures = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".test.ts") &&
        entry.name !== "promise-assertion-hygiene.test.ts",
    )
    .map((entry) => join(testsRoot, entry.name));

  const allFindings = (
    await Promise.all(fixtures.map((fixturePath) => readAndFind(fixturePath)))
  ).flat();

  expect(allFindings).toEqual([]);
});

test("AST fixture catches malformed promise assertions", async () => {
  const fixtureRoot = await mkdtemp(
    join(tmpdir(), "promise-assertion-hygiene-"),
  );
  fixtureRoots.push(fixtureRoot);
  const fixtureFile = join(fixtureRoot, "malformed-fixture.test.ts");

  try {
    await writeFile(
      fixtureFile,
      [
        `test("broken promise assertion: dot", async () => {\n  expect(Promise.resolve(1)).resolves.toBe(1);\n});\n`,
        `test("broken promise assertion: computed", async () => {\n  expect(Promise.resolve(1))["rejects"].toBe(1);\n});\n`,
        `test("broken promise assertion: wrapped", async () => {\n  (expect((Promise.resolve(1)) as Promise<number>).resolves).toBe(1);\n});\n`,
      ].join("\n"),
      "utf8",
    );

    const source = await readFile(fixtureFile, "utf8");
    const findings = findUnawaitedPromiseAssertions(fixtureFile, source);

    expect(findings).toHaveLength(3);
    expect(findings[0]).toMatchObject({
      line: 2,
      file: fixtureFile,
    });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
