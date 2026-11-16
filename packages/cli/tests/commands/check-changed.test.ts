import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync, spawnSync } from "../helpers/isolated-env.js";

/**
 * kibi check --changed and kb_check changed:true give the commit gate's
 * verdict on the working tree plus the index, before anything is staged,
 * and leave the real index as it was.
 */
const kibiBin = path.resolve(__dirname, "../../src/cli.ts");
let root: string;

function kibi(args: string[]) {
  const result = spawnSync("bun", [kibiBin, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
}

const git = (command: string) =>
  String(execSync(`git ${command}`, { cwd: root, stdio: "pipe" }));

function write(file: string, text: string): void {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
}

type Finding = { blocks?: string; id?: string; rule?: string };
type GateJson = {
  structuredContent: {
    violations: Finding[];
    qualityDiagnostics: Finding[];
  };
};

beforeAll(() => {
  root = mkdtempSync(path.join(os.tmpdir(), "kibi-check-changed-"));
  git("init -q -b main");
  git('config user.email "test@example.com"');
  git('config user.name "Test User"');
  execSync(`KB_PATH=.kb/branches/main bun ${kibiBin} init`, {
    cwd: root,
    stdio: "pipe",
  });
  write("README.md", "# Fixture\n");
  git("add -A");
  git("commit -q --no-verify -m initial");
  // An unowned new function, edited but not staged.
  write("src/greet.ts", 'export function greet() {\n  return "hi";\n}\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("kibi check --changed", () => {
  test("refuses what the commit gate would refuse before anything is staged", () => {
    // With nothing staged the gate itself has nothing to judge.
    expect(kibi(["check", "--staged"]).status).toBe(0);

    const changed = kibi(["check", "--changed", "--format", "json"]);
    expect(changed.status).toBe(1);
    const result = JSON.parse(changed.stdout) as GateJson;
    const violations = result.structuredContent.violations;
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((finding) => finding.blocks === "commit")).toBe(
      true,
    );
    const blocking = result.structuredContent.qualityDiagnostics
      .filter((finding) => finding.blocks === "commit")
      .map((finding) => finding.id);
    expect(blocking).toContain("kibi_impact_evidence_missing");

    // The real index is untouched and holds no scratch file.
    expect(git("diff --cached --name-only").trim()).toBe("");
    expect(git("status --porcelain --ignored -- .git").trim()).toBe("");
  }, 120_000);

  test("limits the judged change to the named files and .kb", () => {
    const other = kibi(["check", "--changed", "README.md"]);
    expect(other.status).toBe(0);
    const named = kibi(["check", "--changed", "src/greet.ts"]);
    expect(named.status).toBe(1);
    expect(`${named.stdout}${named.stderr}`).toContain("greet");
  }, 120_000);

  test("kb_check changed:true returns the same verdict with blocks on each finding", () => {
    const input = path.join(root, "..", `${path.basename(root)}-input.json`);
    writeFileSync(
      input,
      JSON.stringify({ changed: true, sourceFiles: ["src/greet.ts"] }),
    );
    try {
      const run = kibi(["check", "--input", input]);
      const result = JSON.parse(run.stdout) as {
        status: string;
        data: {
          changed: boolean;
          commitAllowed: boolean;
          violations: Finding[];
          qualityDiagnostics: Finding[];
        };
      };
      expect(result.status).toBe("success");
      expect(result.data.changed).toBe(true);
      expect(result.data.commitAllowed).toBe(false);
      expect(
        [...result.data.violations, ...result.data.qualityDiagnostics].every(
          (finding) => finding.blocks === "commit" || finding.blocks === "none",
        ),
      ).toBe(true);
      expect(git("diff --cached --name-only").trim()).toBe("");
    } finally {
      rmSync(input, { force: true });
    }
  }, 180_000);
});
