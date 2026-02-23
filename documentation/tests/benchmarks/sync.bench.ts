import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { bench, run } from "mitata";

const BENCH_DIR = path.join("/tmp", ".kibi-bench-tmp");
const KIBI_BIN = "/home/looted/projects/kibi/packages/cli/src/cli.ts";

// Generate test markdown file with frontmatter
function generateTestFile(id: number): string {
  return `---
id: req-bench-${id}
title: Benchmark Requirement ${id}
status: approved
priority: high
tags: [benchmark, performance, test-${id % 10}]
---

# Benchmark Requirement ${id}

This is a test requirement for benchmarking kibi sync performance.

## Description

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
tempor incididunt ut labore et dolore magna aliqua.

## Acceptance Criteria

- [ ] System shall process data correctly
- [ ] Performance must meet SLA targets
- [ ] Security requirements must be satisfied

## Related

- Links to other requirements
- Test cases
- Implementation notes
`;
}

// Setup a test workspace with N requirements files
function setupWorkspace(tmpDir: string, fileCount: number): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  mkdirSync(tmpDir, { recursive: true });

  // Initialize git repo
  execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  execSync('git config user.email "bench@test.com"', {
    cwd: tmpDir,
    stdio: "pipe",
  });
  execSync('git config user.name "Bench Test"', { cwd: tmpDir, stdio: "pipe" });

  // Create requirements directory
  const reqDir = path.join(tmpDir, "requirements");
  mkdirSync(reqDir, { recursive: true });

  // Generate test files
  for (let i = 0; i < fileCount; i++) {
    const filePath = path.join(reqDir, `req-${i}.md`);
    writeFileSync(filePath, generateTestFile(i));
  }

  // Initial commit
  execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir, stdio: "pipe" });

  // Ensure we're on develop branch
  try {
    const branch = execSync("git branch --show-current", {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    if (branch === "master" || branch === "main") {
      execSync(`git branch -m ${branch} develop`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
    }
  } catch {
    // ignore
  }

  // Initialize kibi
  execSync(`bun ${KIBI_BIN} init`, { cwd: tmpDir, stdio: "pipe" });
}

// Cleanup test workspace
function cleanup(tmpDir: string): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Benchmark: Sync 10 files
bench("kibi sync - 10 files", async () => {
  const tmpDir = path.join(BENCH_DIR, "sync-10");
  setupWorkspace(tmpDir, 10);
  execSync(`bun ${KIBI_BIN} sync`, { cwd: tmpDir, stdio: "pipe" });
  cleanup(tmpDir);
});

bench("kibi sync - 100 files", async () => {
  const tmpDir = path.join(BENCH_DIR, "sync-100");
  setupWorkspace(tmpDir, 100);
  execSync(`bun ${KIBI_BIN} sync`, { cwd: tmpDir, stdio: "pipe" });
  cleanup(tmpDir);
});

bench("kibi sync - incremental (1/100 changed)", async () => {
  const tmpDir = path.join(BENCH_DIR, "sync-incr");
  setupWorkspace(tmpDir, 100);

  execSync(`bun ${KIBI_BIN} sync`, { cwd: tmpDir, stdio: "pipe" });

  const reqDir = path.join(tmpDir, "requirements");
  writeFileSync(path.join(reqDir, "req-0.md"), generateTestFile(9999));
  execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
  execSync('git commit -m "Update req-0"', { cwd: tmpDir, stdio: "pipe" });

  execSync(`bun ${KIBI_BIN} sync`, { cwd: tmpDir, stdio: "pipe" });
  cleanup(tmpDir);
});

console.log("🏃 Running kibi sync benchmarks...\n");
console.log(
  "Note: v0 baseline measurements (targets are for future optimization)\n",
);

await run();

// Cleanup any remaining temp directories
if (existsSync(BENCH_DIR)) {
  rmSync(BENCH_DIR, { recursive: true, force: true });
}
