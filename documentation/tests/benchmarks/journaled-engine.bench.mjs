#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { syncCommand } from "../../../packages/cli/dist/commands/sync.js";
import { EngineClient } from "../../../packages/cli/dist/engine.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const cliBin = path.join(repositoryRoot, "packages/cli/bin/kibi");
const symbolCount = Number.parseInt(
  process.env.KIBI_BENCH_SYMBOLS ?? "10000",
  10,
);
const enforce = process.env.KIBI_BENCH_SMOKE !== "1";
if (!Number.isInteger(symbolCount) || symbolCount < 1) {
  throw new Error("KIBI_BENCH_SYMBOLS must be a positive integer");
}
if (enforce && symbolCount !== 10_000) {
  throw new Error(
    "Performance gates require the canonical 10,000-symbol fixture",
  );
}

const workspace = mkdtempSync(path.join(tmpdir(), "kibi-journal-bench-"));
const originalWorkingDirectory = process.cwd();
const runtimeDirectory = path.join(workspace, ".runtime");
const environment = {
  ...process.env,
  KIBI_RUNTIME_DIR: runtimeDirectory,
  NODE_ENV: "production",
};
process.env.KIBI_RUNTIME_DIR = runtimeDirectory;
process.env.NODE_ENV = "production";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: workspace,
    env: environment,
    encoding: "utf8",
    stdio: options.quiet ? "pipe" : "inherit",
  });
}

function writeFixture() {
  run("git", ["init", "-b", "main"], { quiet: true });
  run("git", ["config", "user.email", "benchmark@kibi.local"], {
    quiet: true,
  });
  run("git", ["config", "user.name", "Kibi Benchmark"], { quiet: true });
  run(process.execPath, [cliBin, "init", "--no-hooks"], { quiet: true });

  const requirements = path.join(workspace, "documentation/requirements");
  const tests = path.join(workspace, "documentation/tests");
  const sources = path.join(workspace, "src");
  mkdirSync(requirements, { recursive: true });
  mkdirSync(tests, { recursive: true });
  mkdirSync(sources, { recursive: true });
  writeFileSync(
    path.join(requirements, "REQ-BENCH-0.md"),
    "---\nid: REQ-BENCH-0\ntitle: Journal engine benchmark requirement\nstatus: open\npriority: must\ntags: [benchmark, performance]\n---\n\nThe journal engine must keep symbol discovery fast.\n",
  );
  writeFileSync(
    path.join(tests, "TEST-BENCH-0.md"),
    "---\nid: TEST-BENCH-0\ntitle: Journal engine benchmark test\nstatus: active\npriority: must\ntags: [benchmark, performance]\n---\n\nMeasures the canonical generated performance fixture.\n",
  );

  const sourceCount = Math.ceil(symbolCount / 10);
  for (let file = 0; file < sourceCount; file += 1) {
    const declarations = [];
    for (let member = 0; member < 10; member += 1) {
      const id = file * 10 + member;
      if (id >= symbolCount) break;
      declarations.push(`export const symbol${id} = ${id};`);
    }
    writeFileSync(
      path.join(sources, `file-${file}.ts`),
      `${declarations.join("\n")}\n`,
    );
  }

  const symbols = ["symbols:"];
  for (let id = 0; id < symbolCount; id += 1) {
    const padded = String(id).padStart(5, "0");
    const next = String((id + 1) % symbolCount).padStart(5, "0");
    symbols.push(
      `  - id: SYM-bench-${padded}`,
      `    title: Performance token ${padded}`,
      `    sourceFile: src/file-${Math.floor(id / 10)}.ts`,
      "    symbol_role: behavioral",
      "    tags: [benchmark, generated]",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-BENCH-0",
      "      - type: covered_by",
      "        target: TEST-BENCH-0",
      "      - type: relates_to",
      `        target: SYM-bench-${next}`,
    );
  }
  writeFileSync(
    path.join(workspace, "documentation/symbols.yaml"),
    `${symbols.join("\n")}\n`,
  );
  run("git", ["add", "."], { quiet: true });
  run("git", ["commit", "-m", "benchmark fixture"], { quiet: true });
}

function elapsed(task) {
  const started = performance.now();
  const value = task();
  return { value, milliseconds: performance.now() - started };
}

async function elapsedAsync(task) {
  const started = performance.now();
  const value = await task();
  return { value, milliseconds: performance.now() - started };
}

async function withoutConsole(task) {
  const methods = ["log", "warn", "error"];
  const previous = new Map(methods.map((method) => [method, console[method]]));
  for (const method of methods) console[method] = () => {};
  try {
    return await task();
  } finally {
    for (const method of methods) console[method] = previous.get(method);
  }
}

async function samples(iterations, task) {
  const values = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    values.push((await elapsedAsync(task)).milliseconds);
  }
  return values;
}

function percentile(values, percentileValue) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.ceil((percentileValue / 100) * ordered.length) - 1] ?? 0;
}

const results = [];
function gate(name, value, threshold, unit = "ms") {
  const passed = value <= threshold;
  results.push({ name, value, threshold, unit, passed });
}

let client;
try {
  console.log(
    `Generating ${symbolCount.toLocaleString()} symbols and ${(symbolCount * 3).toLocaleString()} relationships (untimed)...`,
  );
  writeFixture();
  process.chdir(workspace);

  const fullSync = elapsed(() =>
    run(process.execPath, [cliBin, "sync"], { quiet: true }),
  );
  gate("full sync", fullSync.milliseconds, 30_000);

  client = new EngineClient({ workspaceRoot: workspace, branch: "main" });
  await client.start();
  await client.queryEntities({ id: "SYM-bench-05000", limit: 1, offset: 0 });
  await client.searchEntities({
    query: "performance token 05000",
    limit: 20,
    offset: 0,
  });
  await client.queryStatusJson();

  gate(
    "warm exact query p95",
    percentile(
      await samples(30, () =>
        client.queryEntities({ id: "SYM-bench-05000", limit: 1, offset: 0 }),
      ),
      95,
    ),
    100,
  );
  gate(
    "warm paginated query p95",
    percentile(
      await samples(30, () =>
        client.queryEntities({ type: "symbol", limit: 25, offset: 9000 }),
      ),
      95,
    ),
    100,
  );
  gate(
    "warm search p95",
    percentile(
      await samples(30, () =>
        client.searchEntities({
          query: "performance token 07777",
          limit: 20,
          offset: 0,
        }),
      ),
      95,
    ),
    150,
  );
  gate(
    "warm status p95",
    percentile(await samples(30, () => client.queryStatusJson()), 95),
    150,
  );

  const upserts = await samples(20, async () => {
    const id = `SYM-durable-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const result = await client.query(
      `kb_commit_upsert(symbol, [id='${id}', title="Durable benchmark", status=active, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="benchmark", sourceFile="src/benchmark.ts", symbol_role=behavioral], [], true, ChangeKind)`,
    );
    if (!result.success)
      throw new Error(result.error ?? "durable upsert failed");
  });
  gate("ordinary durable upsert p95", percentile(upserts, 95), 500);

  const noOpSync = await elapsedAsync(() =>
    withoutConsole(() => syncCommand()),
  );
  gate("no-op sync", noOpSync.milliseconds, 500);

  const manifestPath = path.join(workspace, "documentation/symbols.yaml");
  let manifest = readFileSync(manifestPath, "utf8");
  const oneSymbolSamples = [];
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const padded = String(5000 + iteration).padStart(5, "0");
    const anchor = `  - id: SYM-bench-${padded}\n    title: Performance token ${padded}\n    sourceFile: src/file-${Math.floor((5000 + iteration) / 10)}.ts\n    symbol_role: behavioral\n    tags: [benchmark, generated]`;
    const replacement = anchor.replace(
      "tags: [benchmark, generated]",
      `tags: [benchmark, generated, changed-${iteration}]`,
    );
    const nextManifest = manifest.replace(anchor, replacement);
    if (nextManifest === manifest) {
      throw new Error(`Unable to update one-symbol fixture ${padded}`);
    }
    manifest = nextManifest;
    writeFileSync(manifestPath, manifest);
    oneSymbolSamples.push(
      (await elapsedAsync(() => withoutConsole(() => syncCommand())))
        .milliseconds,
    );
  }
  gate("one-symbol sync p95", percentile(oneSymbolSamples, 95), 999.999);

  await client.stop(false);
  await client.terminate();
  client = new EngineClient({ workspaceRoot: workspace, branch: "main" });
  const coldAttach = await elapsedAsync(() =>
    client.queryEntities({ id: "SYM-bench-05000", limit: 1, offset: 0 }),
  );
  gate("cold engine attach and index build", coldAttach.milliseconds, 3000);

  if (process.platform === "linux") {
    const pid = client.getPid();
    const status = readFileSync(`/proc/${pid}/status`, "utf8");
    const rssKiB = Number.parseInt(
      status.match(/^VmRSS:\s+(\d+)\s+kB$/m)?.[1] ?? "0",
      10,
    );
    gate("steady-state engine RSS", rssKiB / 1024, 512, "MiB");
  }

  console.table(
    results.map((result) => ({
      gate: result.name,
      observed: `${result.value.toFixed(1)} ${result.unit}`,
      threshold: `≤ ${result.threshold} ${result.unit}`,
      result: result.passed ? "PASS" : "FAIL",
    })),
  );
  if (enforce && results.some((result) => !result.passed)) process.exitCode = 1;
} finally {
  await client?.stop(false).catch(() => undefined);
  await client?.terminate().catch(() => undefined);
  process.chdir(originalWorkingDirectory);
  rmSync(workspace, { recursive: true, force: true });
}
