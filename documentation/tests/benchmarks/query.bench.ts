import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { bench, run } from "mitata";

const BENCH_DIR = path.join("/tmp", ".kibi-bench-tmp");
const KIBI_BIN = "/home/looted/projects/kibi/packages/cli/src/cli.ts";

function generateTestFile(id: number): string {
  return `---
id: req-bench-${id}
title: Benchmark Requirement ${id}
status: approved
priority: ${["critical", "high", "medium", "low"][id % 4]}
tags: [benchmark, perf-test, category-${id % 5}, sprint-${Math.floor(id / 10)}]
---

# Benchmark Requirement ${id}

This is requirement ${id} for benchmarking kibi query performance.

## Description

Testing query performance with ${id} entities in the knowledge base.

## Acceptance Criteria

- [ ] Query response time < 100ms for 1000 entities
- [ ] Results are accurate and complete
- [ ] No memory leaks during repeated queries

## Related Requirements

${Array.from({ length: Math.min(3, id) }, (_, i) => `- req-bench-${id - i - 1}`).join("\n")}
`;
}

function setupWorkspaceWithEntities(tmpDir: string, entityCount: number): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  mkdirSync(tmpDir, { recursive: true });

  execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  execSync('git config user.email "bench@test.com"', {
    cwd: tmpDir,
    stdio: "pipe",
  });
  execSync('git config user.name "Bench Test"', { cwd: tmpDir, stdio: "pipe" });

  const reqDir = path.join(tmpDir, "requirements");
  mkdirSync(reqDir, { recursive: true });

  for (let i = 0; i < entityCount; i++) {
    const filePath = path.join(reqDir, `req-${i}.md`);
    writeFileSync(filePath, generateTestFile(i));
  }

  execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir, stdio: "pipe" });

  try {
    const branch = execSync("git branch --show-current", {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    if (branch === "master" || branch === "main") {
      execSync(`git branch -m ${branch} develop`, { cwd: tmpDir, stdio: "pipe" });
    }
  } catch {
    // ignore
  }

  execSync(`bun ${KIBI_BIN} init`, { cwd: tmpDir, stdio: "pipe" });
  execSync(`bun ${KIBI_BIN} sync`, { cwd: tmpDir, stdio: "pipe" });
}

function cleanup(tmpDir: string): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

bench("kibi query - 100 entities (all)", async () => {
  const tmpDir = path.join(BENCH_DIR, "query-100");
  setupWorkspaceWithEntities(tmpDir, 100);
  execSync(`bun ${KIBI_BIN} query req`, { cwd: tmpDir, stdio: "pipe" });
  cleanup(tmpDir);
});

bench("kibi query - 100 entities (by ID)", async () => {
  const tmpDir = path.join(BENCH_DIR, "query-100-id");
  setupWorkspaceWithEntities(tmpDir, 100);
  execSync(`bun ${KIBI_BIN} query req --id req-bench-50`, {
    cwd: tmpDir,
    stdio: "pipe",
  });
  cleanup(tmpDir);
});

console.log("🏃 Running kibi query benchmarks...\n");
console.log(
  "Note: v0 baseline measurements (targets are for future optimization)\n",
);

await run();

if (existsSync(BENCH_DIR)) {
  rmSync(BENCH_DIR, { recursive: true, force: true });
}
