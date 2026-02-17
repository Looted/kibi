import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi doctor", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-doctor-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("passes all checks in valid environment", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(output).toContain("✓");
    expect(output).not.toContain("✗");
  });

  test("detects SWI-Prolog installation", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(output).toContain("SWI-Prolog");
  });

  test("checks .kb/ directory exists", () => {
    execSync("git init", { cwd: tmpDir });

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      expect(error.status).toBe(1);
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output).toContain("✗");
      expect(output).toContain(".kb");
    }
  });

  test("validates config.json is valid JSON", () => {
    execSync("git init", { cwd: tmpDir });
    mkdirSync(path.join(tmpDir, ".kb"));
    writeFileSync(path.join(tmpDir, ".kb/config.json"), "{invalid json");

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      expect(error.status).toBe(1);
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output).toContain("✗");
    }
  });

  test("checks git repository exists", () => {
    mkdirSync(path.join(tmpDir, ".kb"));
    writeFileSync(
      path.join(tmpDir, ".kb/config.json"),
      JSON.stringify({ paths: {} }),
    );

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      expect(error.status).toBe(1);
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output).toContain("✗");
      expect(output.toLowerCase()).toContain("git");
    }
  });

  test("provides remediation suggestions for missing .kb/", () => {
    execSync("git init", { cwd: tmpDir });

    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as {
        status: number;
        stderr?: { toString(): string };
        stdout?: { toString(): string };
      };
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      expect(output.toLowerCase()).toContain("kibi init");
    }
  });

  test("checks git hooks if --hooks was used", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init --hooks`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(output).toContain("hooks");
  });

  test("exits with code 0 if all checks pass", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const result = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(result).toBeDefined();
  });

  test("exits with code 1 if any check fails", () => {
    try {
      execSync(`bun ${kibiBin} doctor`, {
        cwd: tmpDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      throw new Error("Should have failed");
    } catch (err) {
      const error = err as { status: number };
      expect(error.status).toBe(1);
    }
  });

  test("reports checks in order", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const output = execSync(`bun ${kibiBin} doctor`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    const lines = output.split("\n");
    const checkOrder = ["SWI-Prolog", ".kb", "config.json", "repository"];

    let lastIndex = -1;
    for (const check of checkOrder) {
      const index = lines.findIndex((line: string) => line.includes(check));
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});
