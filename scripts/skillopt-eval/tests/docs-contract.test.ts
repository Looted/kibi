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
        Check: "Lock the isolated Python environment",
        Command: "`uv sync --project tools/skillopt --frozen`",
        Why: "Keeps the pinned SkillOpt toolchain fixed.",
      },
      {
        Check: "Verify the pinned SkillOpt revision",
        Command:
          "`uv run --project tools/skillopt python tools/skillopt/verify_pin.py`",
        Why: "Confirms the checked in commit still matches the recorded receipt.",
      },
      {
        Check: "Confirm the existing Codex login",
        Command: "`codex login status`",
        Why: "Must report `Logged in using ChatGPT` before a real optimize run.",
      },
      {
        Check: "Run the isolated Python tests",
        Command:
          "`uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests`",
        Why: "Checks the embedded evaluator without touching the main workspace.",
      },
    ]);
  });

  test("distinguishes Codex authentication from the externally provisioned F3 trust plane", () => {
    const docs = readFileSync(docsPath, "utf8");

    expect(docs).toContain("prepareExistingLogin");
    expect(docs).toContain("runCodexSkillOptStep");
    expect(docs).toContain("runCodexCell");
    expect(docs).toContain("blinded held out aggregate gate");
    expect(docs).toContain("Local review is non-mutating");
    expect(docs).toContain("external-verdict-required");
    expect(docs).toContain("planning-only");
    expect(docs).toContain("codex login status");
    expect(docs).toContain("--allow-paid");
    expect(docs).toContain("--fake");
    expect(docs).toContain("existing authenticated Codex CLI login");
    expect(docs).toContain("does not need a root or provider-key service");
    expect(docs).toContain("F1 free/local QA");
    expect(docs).toContain(
      "F3 independent production verification/adoption evidence",
    );
    expect(docs).toContain("operator-provisioned external trust bundle");
    expect(docs).toContain(
      "does not install, sign, or substitute that external trust bundle",
    );
    expect(docs).toContain(
      "sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1",
    );

    expect(docs).not.toMatch(
      /Root Authority|ProviderSupervisor|EvaluatorAuthority/,
    );
    expect(docs).not.toMatch(/UID 6110|veth|nft/);
    expect(docs).not.toContain(
      "does not need root owned launchers, private service directories, root owned UIDs, socket activated services, provider API keys, or any external trust plane service",
    );
    expect(docs).not.toContain("<id|all>");
    expect(docs).not.toContain("--fixture-root");
    expect(docs).not.toContain("--evaluator-manifest");
    expect(docs).not.toContain("adopt exactly once");
    expect(docs).not.toContain("zero cost");
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
        Notes: "Codex only evidence gate with no paid model calls.",
      },
      {
        Script: "`skillopt:canary`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts smoke --allow-paid --run-id 00000000-0000-4000-8000-000000000091`",
        Notes:
          "Bounded two model Codex capability canary, may incur paid model calls.",
      },
      {
        Script: "`skillopt:dry-run`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092`",
        Notes: "Writes a non-mutating local review artifact tree.",
      },
      {
        Script: "`skillopt:prepare`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092`",
        Notes: "Writes the same non-mutating local review artifact shape.",
      },
      {
        Script: "`skillopt:optimize`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts optimize --fake --run-id 00000000-0000-4000-8000-000000000092`",
        Notes:
          "Runs non-mutating local optimization review without adopting a candidate.",
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
      {
        Script: "`skillopt:fake:adopt`",
        Command:
          "`bun run scripts/skillopt-eval/cli.ts adopt --fake --run-id 00000000-0000-4000-8000-000000000093`",
        Notes:
          "Emits a planning-only adoption plan and never changes the canonical skill.",
      },
    ]);

    expect(packageJson.scripts).toMatchObject({
      "skillopt:help": "bun run scripts/skillopt-eval/cli.ts --help",
      "skillopt:prototype": "bun run scripts/skillopt-eval/cli.ts",
      "skillopt:preflight":
        "bun run scripts/skillopt-eval/cli.ts preflight --run-id 00000000-0000-4000-8000-000000000091",
      "skillopt:canary":
        "bun run scripts/skillopt-eval/cli.ts smoke --allow-paid --run-id 00000000-0000-4000-8000-000000000091",
      "skillopt:dry-run":
        "bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092",
      "skillopt:prepare":
        "bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092",
      "skillopt:optimize":
        "bun run scripts/skillopt-eval/cli.ts optimize --fake --run-id 00000000-0000-4000-8000-000000000092",
      "skillopt:fake:run":
        "bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093",
      "skillopt:fake:resume":
        "bun run scripts/skillopt-eval/cli.ts resume --fake --run-id 00000000-0000-4000-8000-000000000093",
      "skillopt:fake:status":
        "bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093 && bun run scripts/skillopt-eval/cli.ts status --run-id 00000000-0000-4000-8000-000000000093",
      "skillopt:fake:adopt":
        "bun run scripts/skillopt-eval/cli.ts adopt --fake --run-id 00000000-0000-4000-8000-000000000093",
    });
    expect(
      packageJson.scripts["skillopt:canary"].match(/--allow-paid/g),
    ).toHaveLength(1);
    expect(docs).toContain(
      "optimize --skill kibi-usage --allow-paid --run-id <uuid> --fixture-run-root <path>",
    );
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
      "`artifacts/skillopt/<run-id>/episodes/<episode-id>/`",
    ]);
    expect(docs).toContain("episode-receipt.json");
    expect(docs).toContain("final-state.json");
    expect(docs).toContain("broker-trace.jsonl");
  });
});
