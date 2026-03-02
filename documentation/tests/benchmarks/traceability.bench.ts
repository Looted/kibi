import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { bench, run } from "mitata";

const BENCH_DIR = path.join("/tmp", ".kibi-bench-tmp");
const KIBI_BIN = "/home/looted/projects/kibi/packages/cli/src/cli.ts";

function generateTsFile(i: number): string {
  return `export const value${i} = ${i};\nexport function func${i}(): number { return ${i}; }\n`;
}

function setupWorkspace(tmpDir: string, fileCount: number): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  mkdirSync(tmpDir, { recursive: true });

  // Init git
  execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  execSync('git config user.email "bench@test.com"', {
    cwd: tmpDir,
    stdio: "pipe",
  });
  execSync('git config user.name "Bench Test"', { cwd: tmpDir, stdio: "pipe" });

  const srcDir = path.join(tmpDir, "src");
  mkdirSync(srcDir, { recursive: true });

  for (let i = 0; i < fileCount; i++) {
    const filePath = path.join(srcDir, `file-${i}.ts`);
    writeFileSync(filePath, `${generateTsFile(i)}`);
  }

  // Create an initial commit so we can create staged changes separately
  execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir, stdio: "pipe" });

  // Ensure branch name is develop
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

  // Make a change to files and stage them (but do not commit) to simulate staged files
  for (let i = 0; i < fileCount; i++) {
    const filePath = path.join(srcDir, `file-${i}.ts`);
    // append a benign export to mark as changed
    writeFileSync(filePath, `${generateTsFile(i)}\n// staged-change-${i}\n`);
  }
  execSync("git add .", { cwd: tmpDir, stdio: "pipe" });

  // Initialize kibi in the repo
  execSync(`bun ${KIBI_BIN} init`, { cwd: tmpDir, stdio: "pipe" });
}

function cleanup(tmpDir: string): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function runStagedCheck(tmpDir: string): Promise<number> {
  const start = Date.now();
  execSync(`bun ${KIBI_BIN} check --staged`, { cwd: tmpDir, stdio: "pipe" });
  const end = Date.now();
  return end - start;
}

bench("staged check - 10 files", async () => {
  const tmpDir = path.join(BENCH_DIR, "staged-10");
  setupWorkspace(tmpDir, 10);
  try {
    const runs: number[] = [];
    const ITER = 3;
    for (let i = 0; i < ITER; i++) {
      const t = await runStagedCheck(tmpDir);
      runs.push(t);
      console.log(`run ${i + 1}: ${t}ms`);
    }
    const avg = Math.round(runs.reduce((a, b) => a + b, 0) / runs.length);
    console.log(`average (10 files): ${avg}ms`);
  } finally {
    cleanup(tmpDir);
  }
});

bench("staged check - 50 files", async () => {
  const tmpDir = path.join(BENCH_DIR, "staged-50");
  setupWorkspace(tmpDir, 50);
  try {
    const runs: number[] = [];
    const ITER = 3;
    for (let i = 0; i < ITER; i++) {
      const t = await runStagedCheck(tmpDir);
      runs.push(t);
      console.log(`run ${i + 1}: ${t}ms`);
    }
    const avg = Math.round(runs.reduce((a, b) => a + b, 0) / runs.length);
    console.log(`average (50 files): ${avg}ms`);
  } finally {
    cleanup(tmpDir);
  }
});

console.log("🏃 Running staged traceability gate benchmarks...\n");
await run();

if (existsSync(BENCH_DIR)) {
  rmSync(BENCH_DIR, { recursive: true, force: true });
}
