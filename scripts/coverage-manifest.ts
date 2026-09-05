import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const PACKAGE_ROOT = "packages";

function walkSourceDirectory(root: string, directory: string): string[] {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    return [];
  }

  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceDirectory(root, absolutePath));
      continue;
    }
    if (
      entry.isFile() &&
      /\.(?:cts|mts|ts|tsx)$/.test(entry.name) &&
      !/\.(?:d|test|spec)\.(?:cts|mts|ts|tsx)$/.test(entry.name)
    ) {
      files.push(relative(root, absolutePath).split(sep).join("/"));
    }
  }
  return files;
}

// implements REQ-014
export function collectProductionSourceFiles(workspaceRoot: string): string[] {
  const packagesRoot = join(workspaceRoot, PACKAGE_ROOT);
  if (!existsSync(packagesRoot)) return [];

  const sourceFiles: string[] = [];
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    sourceFiles.push(
      ...walkSourceDirectory(
        workspaceRoot,
        join(packagesRoot, entry.name, "src"),
      ),
    );
  }
  return sourceFiles.sort();
}

// implements REQ-014
export function sourceFilesInLcov(lcov: string): Set<string> {
  return new Set(
    [...lcov.matchAll(/^SF:(.+)$/gm)].map((match) => match[1] ?? ""),
  );
}

// implements REQ-014
export function writeCoverageManifestAudit(
  workspaceRoot: string,
  coverageDir: string,
  lcov: string,
): string[] {
  const sourceFiles = collectProductionSourceFiles(workspaceRoot);
  const coveredFiles = sourceFilesInLcov(lcov);
  const missingFiles = sourceFiles.filter((file) => !coveredFiles.has(file));
  writeFileSync(
    join(coverageDir, "source-manifest.txt"),
    `${sourceFiles.join("\n")}\n`,
    "utf8",
  );
  writeFileSync(
    join(coverageDir, "missing-source-files.txt"),
    missingFiles.length > 0 ? `${missingFiles.join("\n")}\n` : "",
    "utf8",
  );
  return missingFiles;
}

export async function runCoverageManifestCli(
  argv: string[] = process.argv,
): Promise<void> {
  const workspaceRoot = argv[2] ?? process.cwd();
  const coverageDir =
    argv[3] ?? join(workspaceRoot, "coverage", "unit");
  const lcov = await Bun.file(join(coverageDir, "lcov.info")).text();
  const missingFiles = writeCoverageManifestAudit(
    workspaceRoot,
    coverageDir,
    lcov,
  );
  if (missingFiles.length > 0) {
    console.error(
      `Coverage manifest is incomplete: ${missingFiles.length} production source files are absent from LCOV.`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await runCoverageManifestCli();
}
