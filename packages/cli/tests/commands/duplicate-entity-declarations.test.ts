// executable_for TEST-kibi-duplicate-entity-declarations
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { spawnSync } from "../helpers/isolated-env.js";

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string, input?: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    ...(input === undefined ? {} : { input }),
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function vcs(cwd: string, ...args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}

function writeRequirement(root: string, id: string, title: string): void {
  writeFileSync(
    path.join(root, `.kb/requirements/${id}.md`),
    `---\nid: ${id}\ntitle: ${title}\ntype: req\nstatus: open\n---\n\nThe worker ${title.toLowerCase()}.\n`,
  );
}

type Finding = {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  evidence?: {
    direction?: string;
    declarations?: { source: string; title: string }[];
  };
};

function duplicateFindings(root: string): {
  status: number | null;
  findings: Finding[];
} {
  const check = runKibi(["check", "--format", "json"], root);
  const parsed = JSON.parse(check.stdout) as {
    violations?: Finding[];
    structuredContent?: { violations?: Finding[] };
  };
  const violations =
    parsed.violations ?? parsed.structuredContent?.violations ?? [];
  return {
    status: check.status,
    findings: violations.filter(
      (row) => row.evidence?.direction === "duplicate_entity",
    ),
  };
}

const SOURCE = [
  "export class Worker {",
  "  verifyQuote(): boolean {",
  "    return true;",
  "  }",
  "}",
  "",
].join("\n");

describe("duplicate entity declarations", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-duplicate-entity-")),
    );
    vcs(root, "init", "-b", "main");
    vcs(root, "config", "user.email", "test@example.com");
    vcs(root, "config", "user.name", "Kibi Test");
    vcs(root, "commit", "--allow-empty", "-m", "init");
    expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src/worker.ts"), SOURCE);
    writeRequirement(root, "REQ-quotes", "Verifies quotes");
    writeRequirement(root, "REQ-sessions", "Verifies sessions");
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test(
    "kibi check blocks a symbol declared twice in .kb/symbols.yaml and passes once one declaration remains",
    () => {
      // The shape a line-based merge of two branches leaves behind.
      writeFileSync(
        path.join(root, ".kb/symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-worker-verify-quote",
          "    title: verifyQuote",
          "    sourceFile: src/worker.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-quotes",
          "  - id: SYM-worker-verify-quote",
          "    title: Worker.verifyQuote",
          "    sourceFile: src/worker.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-sessions",
          "",
        ].join("\n"),
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "duplicate");
      const synced = runKibi(["sync"], root);
      expect(synced.status, `${synced.stdout}\n${synced.stderr}`).toBe(0);

      const blocked = duplicateFindings(root);
      expect(blocked.status).not.toBe(0);
      expect(blocked.findings).toHaveLength(1);
      const [finding] = blocked.findings;
      expect(finding?.rule).toBe("source-relationship-parity");
      expect(finding?.entityId).toBe("SYM-worker-verify-quote");
      expect(finding?.description).toContain(
        "SYM-worker-verify-quote is declared 2 times ('verifyQuote' in .kb/symbols.yaml; 'Worker.verifyQuote' in .kb/symbols.yaml)",
      );
      expect(finding?.evidence?.declarations?.map((row) => row.title)).toEqual([
        "verifyQuote",
        "Worker.verifyQuote",
      ]);
      expect(finding?.suggestion).toContain("kibi sync");

      writeFileSync(
        path.join(root, ".kb/symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-worker-verify-quote",
          "    title: Worker.verifyQuote",
          "    sourceFile: src/worker.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-quotes",
          "      - type: implements",
          "        target: REQ-sessions",
          "",
        ].join("\n"),
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "one declaration");
      expect(runKibi(["sync"], root).status).toBe(0);
      expect(duplicateFindings(root).findings).toEqual([]);
    },
    TIMEOUT_MS,
  );

  test(
    "a kb_upsert merges copies that differ only in their links into one record, as the finding suggests",
    () => {
      writeFileSync(
        path.join(root, ".kb/symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-worker-verify-quote",
          "    title: Worker.verifyQuote",
          "    sourceFile: src/worker.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-quotes",
          "  - id: SYM-worker-verify-quote",
          "    title: Worker.verifyQuote",
          "    sourceFile: src/worker.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-sessions",
          "",
        ].join("\n"),
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "duplicate");
      expect(runKibi(["sync"], root).status).toBe(0);
      expect(duplicateFindings(root).findings).toHaveLength(1);

      const upsert = runKibi(
        ["upsert", "--input", "-"],
        root,
        JSON.stringify({
          type: "symbol",
          id: "SYM-worker-verify-quote",
          properties: {
            title: "Worker.verifyQuote",
            status: "active",
            sourceFile: "src/worker.ts",
          },
        }),
      );
      expect(upsert.status, `${upsert.stdout}\n${upsert.stderr}`).toBe(0);
      const manifest = loadYaml(
        readFileSync(path.join(root, ".kb/symbols.yaml"), "utf8"),
      ) as {
        symbols: { id: string; relationships?: { target: string }[] }[];
      };
      const records = manifest.symbols.filter(
        (row) => row.id === "SYM-worker-verify-quote",
      );
      expect(records).toHaveLength(1);
      expect(records[0]?.relationships?.map((row) => row.target)).toEqual([
        "REQ-quotes",
        "REQ-sessions",
      ]);
      expect(duplicateFindings(root).findings).toEqual([]);
    },
    TIMEOUT_MS,
  );
});
