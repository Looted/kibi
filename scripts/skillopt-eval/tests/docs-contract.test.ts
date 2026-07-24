import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const docsPath = join(repoRoot, "docs/skillopt.md");
const packageJsonPath = join(repoRoot, "package.json");

function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `## ${heading}`);
  if (start === -1) {
    throw new Error(`missing section: ${heading}`);
  }
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
  if (rows.length < 2) {
    throw new Error(`missing table rows for ${heading}`);
  }

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
        Check: "Lock the isolated Python environment",
        Command: "`uv sync --project tools/skillopt --frozen`",
        Why: "Keeps the pinned SkillOpt toolchain fixed.",
      },
      {
        Check: "Verify the committed source lock",
        Command:
          "`uv run --project tools/skillopt python tools/skillopt/verify_pin.py`",
        Why: "Confirms the checked in commit, version, and receipt still match.",
      },
      {
        Check: "Run the isolated Python tests",
        Command:
          "`uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests`",
        Why: "Checks the embedded evaluator without touching the main workspace.",
      },
    ]);
  });

  test("documents the operator script surface as parsed table rows", () => {
    const docs = readFileSync(docsPath, "utf8");
    const scripts = parseTable(docs, "Package scripts");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(scripts).toEqual([
      {
        Script: "`skillopt:help`",
        Command: "`bun run scripts/skillopt-eval/cli.ts --help`",
        Notes: "Prints the supported command set and workflow flags.",
      },
      {
        Script: "`skillopt:prototype`",
        Command: "`bun run scripts/skillopt-eval/cli.ts`",
        Notes: "Legacy alias that still falls through to help.",
      },
      {
        Script: "`skillopt:preflight`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts preflight --run-id 00000000-0000-4000-8000-000000000091`",
        Notes: "Codex-only evidence gate with no paid model calls.",
      },
      {
        Script: "`skillopt:canary`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts smoke --run-id 00000000-0000-4000-8000-000000000091`",
        Notes:
          "Bounded two-model Codex capability canary; may incur paid model calls.",
      },
      {
        Script: "`skillopt:dry-run`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092`",
        Notes: "Writes the zero-cost dry-run artifact tree.",
      },
      {
        Script: "`skillopt:prepare`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092`",
        Notes: "Same dry-run shape, with the prepare command name.",
      },
      {
        Script: "`skillopt:optimize`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts optimize --skill all --allow-paid --run-id <uuid>`",
        Notes:
          "Runs the real Codex optimizer, applies automatic safety/surface gates, and adopts passing candidates; requires explicit paid-run acknowledgment.",
      },
      {
        Script: "`skillopt:fake:run`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093`",
        Notes: "Runs the offline workflow without paid calls.",
      },
      {
        Script: "`skillopt:fake:resume`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts resume --fake --run-id 00000000-0000-4000-8000-000000000093`",
        Notes: "Resumes the same offline workflow.",
      },
      {
        Script: "`skillopt:fake:status`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093 && bun run scripts/skillopt-eval/cli.ts status --run-id 00000000-0000-4000-8000-000000000093`",
        Notes: "Boots a fake run, then reads back its state.",
      },
    ]);

    expect(packageJson.scripts).toMatchObject({
      "skillopt:help": "bun run scripts/skillopt-eval/cli.ts --help",
      "skillopt:prototype": "bun run scripts/skillopt-eval/cli.ts",
      "skillopt:preflight":
        "bun run scripts/skillopt-eval/cli.ts preflight --run-id 00000000-0000-4000-8000-000000000091",
      "skillopt:canary":
        "bun run scripts/skillopt-eval/cli.ts smoke --run-id 00000000-0000-4000-8000-000000000091",
      "skillopt:dry-run":
        "bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092",
      "skillopt:prepare":
        "bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092",
      "skillopt:optimize": "bun run scripts/skillopt-eval/cli.ts optimize",
      "skillopt:fake:run":
        "bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093",
      "skillopt:fake:resume":
        "bun run scripts/skillopt-eval/cli.ts resume --fake --run-id 00000000-0000-4000-8000-000000000093",
      "skillopt:fake:status":
        "bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093 && bun run scripts/skillopt-eval/cli.ts status --run-id 00000000-0000-4000-8000-000000000093",
    });
  });

  test("documents the artifact layout as parsed table rows", () => {
    const docs = readFileSync(docsPath, "utf8");
    const artifacts = parseTable(docs, "Artifact layout");

    expect(artifacts.map((row) => row.Path)).toEqual([
      "`artifacts/skillopt/<run-id>/dry-run.json`",
      "`artifacts/skillopt/<run-id>/run.lock`",
      "`artifacts/skillopt/<run-id>/state.json`",
      "`artifacts/skillopt/<run-id>/ledger.jsonl`",
      "`artifacts/skillopt/<run-id>/skills/`",
      "`artifacts/skillopt/<run-id>/steps/`",
      "`artifacts/skillopt/<run-id>/best_skill.md`",
      "`artifacts/skillopt/<run-id>/runtime_state.json`",
      "`artifacts/skillopt/<run-id>/history.json`",
      "`artifacts/skillopt/<run-id>/optimization-review.json`",
    ]);
  });
});
