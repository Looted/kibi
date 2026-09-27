import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE = "packages/plugin-treesitter";
const PROCESS_TIMEOUT_MS = 4 * 60 * 1000;

function runNode(args, options) {
  const { deadline, ...spawnOptions } = options;
  const result = spawnSync(process.execPath, args, {
    ...spawnOptions,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: Math.max(1, deadline - Date.now()),
    killSignal: "SIGKILL",
  });
  if (result.status !== 0 || result.error) {
    throw new Error(
      `Parser coverage command failed (${result.status ?? result.signal ?? "spawn error"}): ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`,
    );
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".d.ts")
      ? [path]
      : [];
  });
}

// implements REQ-014
/** Run the existing parser conformance suite and map real worker coverage to TS. */
export function runParserUnitCoverage(workspacePath, coveragePath) {
  const workspaceRoot = resolve(workspacePath);
  const coverageDirectory = resolve(coveragePath);
  const deadline = Date.now() + PROCESS_TIMEOUT_MS;
  const packageRoot = join(workspaceRoot, PACKAGE);
  const workspaceRequire = createRequire(join(workspaceRoot, "package.json"));
  const scratch = mkdtempSync(join(tmpdir(), "kibi-parser-unit-coverage-"));
  const copiedPackage = join(scratch, "package");
  mkdirSync(copiedPackage);
  try {
    for (const directory of ["src", "tests", "assets"]) {
      cpSync(join(packageRoot, directory), join(copiedPackage, directory), {
        recursive: true,
      });
    }
    for (const file of ["package.json", "catalog.json"]) {
      cpSync(join(packageRoot, file), join(copiedPackage, file));
    }
    symlinkSync(
      join(packageRoot, "node_modules"),
      join(copiedPackage, "node_modules"),
      "junction",
    );
    const config = join(copiedPackage, "tsconfig.coverage.json");
    writeFileSync(
      config,
      JSON.stringify({
        extends: join(packageRoot, "tsconfig.json"),
        compilerOptions: {
          rootDir: join(copiedPackage, "src"),
          outDir: join(copiedPackage, "dist"),
          sourceMap: true,
          inlineSources: true,
          declaration: false,
          declarationMap: false,
        },
        include: [join(copiedPackage, "src", "**", "*")],
      }),
    );
    runNode([workspaceRequire.resolve("typescript/bin/tsc"), "-p", config], {
      cwd: scratch,
      deadline,
    });
    const tests = readdirSync(join(copiedPackage, "tests"))
      .filter((file) => file.endsWith(".test.js"))
      .sort()
      .map((file) => join(copiedPackage, "tests", file));
    if (tests.length === 0)
      throw new Error("Parser conformance test inventory is empty");
    const v8Directory = join(scratch, "v8");
    const output = runNode(
      ["--test", "--test-reporter=tap", "--test-timeout=120000", ...tests],
      {
        deadline,
        cwd: scratch,
        env: { ...process.env, NODE_V8_COVERAGE: v8Directory },
      },
    );
    if (
      !/^# tests [1-9][0-9]*$/m.test(output) ||
      !/^# fail 0$/m.test(output) ||
      !/^# skipped 0$/m.test(output)
    ) {
      throw new Error(
        `Parser conformance summary is missing, empty, failed, or skipped:\n${output}`,
      );
    }
    const originals = sourceFiles(join(packageRoot, "src")).sort();
    const executedModules = new Set();
    let workerRecords = 0;
    for (const file of readdirSync(v8Directory)) {
      if (!file.endsWith(".json")) continue;
      const record = JSON.parse(readFileSync(join(v8Directory, file), "utf8"));
      for (const entry of record.result) {
        if (!entry.url.startsWith("file:")) continue;
        const path = fileURLToPath(entry.url);
        if (!path.startsWith(`${join(copiedPackage, "dist")}${sep}`)) continue;
        if (
          !entry.functions.some((fn) =>
            fn.ranges.some((range) => range.count > 0),
          )
        )
          continue;
        executedModules.add(path);
        if (path === join(copiedPackage, "dist", "analysis-worker.js"))
          workerRecords++;
      }
    }
    for (const original of originals) {
      const compiled = join(
        copiedPackage,
        "dist",
        relative(join(packageRoot, "src"), original).replace(/\.ts$/, ".js"),
      );
      if (!executedModules.has(compiled)) {
        throw new Error(
          `Parser V8 coverage did not record execution of ${relative(workspaceRoot, original)}`,
        );
      }
    }
    if (workerRecords === 0)
      throw new Error("Parser worker coverage is missing");
    const emptyConfig = join(scratch, "c8.json");
    writeFileSync(emptyConfig, "{}\n");
    const reports = join(scratch, "reports");
    runNode(
      [
        workspaceRequire.resolve("c8/bin/c8.js"),
        "report",
        "--config",
        emptyConfig,
        "--temp-directory",
        v8Directory,
        "--reporter",
        "lcovonly",
        "--reports-dir",
        reports,
        "--include",
        "package/dist/**/*.js",
        "--exclude-after-remap=false",
      ],
      { cwd: scratch, deadline },
    );
    const expected = new Set(
      originals.map((file) =>
        relative(workspaceRoot, file).split(sep).join("/"),
      ),
    );
    const mapped = new Set();
    const lcov = readFileSync(join(reports, "lcov.info"), "utf8").replace(
      /^SF:(.+)$/gm,
      (_line, file) => {
        const temporarySource = resolve(scratch, file);
        const suffix = relative(join(copiedPackage, "src"), temporarySource);
        const canonical = `${PACKAGE}/src/${suffix.split(sep).join("/")}`;
        if (!expected.has(canonical) || mapped.has(canonical)) {
          throw new Error(
            `Unexpected or duplicate parser coverage source: ${file}`,
          );
        }
        mapped.add(canonical);
        return `SF:${canonical}`;
      },
    );
    if (mapped.size !== expected.size) {
      throw new Error(
        `Parser mapped coverage is incomplete: ${[...expected].filter((file) => !mapped.has(file)).join(", ")}`,
      );
    }
    for (const original of originals) {
      const copied = join(
        copiedPackage,
        "src",
        relative(join(packageRoot, "src"), original),
      );
      if (!readFileSync(original).equals(readFileSync(copied))) {
        throw new Error(
          `Parser source changed during coverage: ${relative(workspaceRoot, original)}`,
        );
      }
    }
    mkdirSync(coverageDirectory, { recursive: true });
    writeFileSync(join(coverageDirectory, "lcov.info"), lcov);
    writeFileSync(join(coverageDirectory, "conformance.log"), output);
    cpSync(v8Directory, join(coverageDirectory, "v8"), { recursive: true });
    const evidence = {
      version: 1,
      workerRecords,
      testFiles: tests.map((file) =>
        relative(copiedPackage, file).split(sep).join("/"),
      ),
      sourceFiles: originals.map((file) => ({
        path: relative(workspaceRoot, file).split(sep).join("/"),
        sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
      })),
    };
    writeFileSync(
      join(coverageDirectory, "evidence.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    return evidence;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runParserUnitCoverage(
    process.argv[2] ?? dirname(dirname(fileURLToPath(import.meta.url))),
    process.argv[3] ?? "coverage/parser",
  );
}
