import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const docsPath = join(repoRoot, "docs/skillopt.md");
const packageJsonPath = join(repoRoot, "package.json");

function section(markdown: string, heading: string): string {
  const normalize = (line: string): string =>
    line.replace(/^#[A-Z0-9]{2}\|/, "");
  const lines = markdown.split(/\r?\n/).map(normalize);
  const start = lines.findIndex((line) => line === `## ${heading}`);
  if (start === -1) throw new Error(`missing section: ${heading}`);
  const collected: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line?.startsWith("## ")) break;
    collected.push(line ?? "");
  }
  return collected.join("\n");
}

function splitRow(row: string): string[] {
  return row
    .replace(/^#[A-Z0-9]{2}\|/, "")
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function parseTable(
  markdown: string,
  heading: string,
): Array<Record<string, string>> {
  const rows = section(markdown, heading)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|"));
  if (rows.length < 2) throw new Error(`missing table rows for ${heading}`);

  const headers = splitRow(rows[0] ?? "");
  return rows
    .slice(2)
    .map(splitRow)
    .filter((cells) => cells.length === headers.length)
    .map((cells) =>
      Object.fromEntries(
        headers.map((header, index) => [header, cells[index] ?? ""]),
      ),
    );
}

describe("SkillOpt documentation contract", () => {
  test("documents the prerequisite commands as parsed table rows", () => {
    const docs = readFileSync(docsPath, "utf8");
    const prerequisites = parseTable(docs, "Prerequisites");

    expect(prerequisites).toEqual([
      {
        Check: "`uv` on PATH",
        Command: "`uv --version`",
        Why: "Operator scripts sync and verify the pinned SkillOpt Python toolchain.",
      },
      {
        Check: "Authenticated Codex CLI",
        Command: "`codex login status`",
        Why: "Must report `Logged in using ChatGPT` before paid smoke or optimize.",
      },
      {
        Check: "Bubblewrap",
        Command: "`bwrap --version`",
        Why: "Required for the isolated Codex capability canary and cell sandboxes.",
      },
      {
        Check: "Clean source worktree",
        Command: "`git status --porcelain` must be empty",
        Why: "Paid optimize preflight rejects dirty trees (`source_not_clean`).",
      },
    ]);
  });

  test("keeps Codex SkillOpt as the primary paid path without privileged trust prerequisites", () => {
    const docs = readFileSync(docsPath, "utf8");

    expect(docs).toContain("prepareExistingLogin");
    expect(docs).toContain("existing authenticated Codex CLI login");
    expect(docs).toContain("codex login status");
    expect(docs).toContain("external-verdict-required");
    expect(docs).toContain("skillopt:smoke");
    expect(docs).toContain("skillopt:optimize");
    expect(docs).toContain("kibi-skillopt-trust-v1");
    expect(docs).toContain("not** a prerequisite for Codex SkillOpt");

    expect(docs).not.toMatch(
      /Root Authority|ProviderSupervisor|EvaluatorAuthority/,
    );
    expect(docs).not.toMatch(/UID 6110|veth|nft/);
    expect(docs).not.toContain("<id|all>");
    expect(docs).not.toContain("--fixture-root");
    expect(docs).not.toContain("--evaluator-manifest");
    expect(docs).not.toContain("adopt exactly once");
    expect(docs).not.toContain("zero cost");
    expect(docs).not.toContain("skillopt:fake:");
    expect(docs).not.toContain("skillopt:canary");
    expect(docs).not.toContain("skillopt:preflight");
  });

  test("documents the operator script surface as parsed table rows", () => {
    const docs = readFileSync(docsPath, "utf8");
    const scripts = parseTable(docs, "Package scripts");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };
    const skilloptScripts = Object.keys(packageJson.scripts)
      .filter((name) => name.startsWith("skillopt"))
      .sort();

    expect(scripts).toEqual([
      {
        Script: "`skillopt:smoke`",
        Command: "`bun run scripts/skillopt-eval/operator.ts smoke`",
        Notes:
          "Verifies the SkillOpt pin and Codex login, then runs the paid two-model capability canary.",
      },
      {
        Script: "`skillopt:optimize`",
        Command: "`bun run scripts/skillopt-eval/operator.ts optimize`",
        Notes:
          "Verifies pin and login, materializes fixtures, allocates artifact roots, then runs paid `kibi-usage` optimize (preflight, smoke, Codex rewrite, public development gate, held-out gates). Writes non-mutating review evidence only. Defaults to `--max-steps 1`; pass `--max-steps 1..4` for that many complete proposal rounds.",
      },
    ]);

    expect(skilloptScripts).toEqual(["skillopt:optimize", "skillopt:smoke"]);
    expect(packageJson.scripts).toMatchObject({
      "skillopt:smoke": "bun run scripts/skillopt-eval/operator.ts smoke",
      "skillopt:optimize": "bun run scripts/skillopt-eval/operator.ts optimize",
    });
    expect(docs).toContain("bun run skillopt:smoke");
    expect(docs).toContain("bun run skillopt:optimize");
    expect(docs).toContain(
      "bun run scripts/skillopt-eval/operator.ts optimize --max-steps 4",
    );
    expect(docs).toContain("max-steps");
  });

  test("documents the artifact layout as parsed table rows", () => {
    const docs = readFileSync(docsPath, "utf8");
    const artifacts = parseTable(docs, "Artifact layout");

    expect(artifacts.map((row) => row.Path)).toEqual([
      "`$OPERATOR_BASE/optimize/<run-id>/skills/`",
      "`$OPERATOR_BASE/optimize/<run-id>/skills/kibi-usage/**/accepted-output/`",
      "`$OPERATOR_BASE/optimize/<run-id>/steps/`",
      "`$OPERATOR_BASE/optimize/<run-id>/best_skill.md`",
      "`$OPERATOR_BASE/optimize/<run-id>/runtime_state.json`",
      "`$OPERATOR_BASE/optimize/<run-id>/history.json`",
      "`$OPERATOR_BASE/optimize/<run-id>/optimization-review.json`",
      "`$OPERATOR_BASE/optimize/<run-id>/episodes/<episode-id>/`",
      "`$OPERATOR_BASE/fixtures/<run-id>/`",
    ]);
    expect(docs).toContain("$XDG_RUNTIME_DIR/kibi-skillopt/operator");
  });
});
