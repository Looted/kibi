// executable_for TEST-source-analysis-v2-contract
import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const statusModule = fileURLToPath(
  new URL("../../core/src/status.pl", import.meta.url),
);
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-status-freshness-"));
  roots.push(root);
  return root;
}

function atom(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function newerPathCount(root: string) {
  // Exercise the source-only traversal used by freshness reasons. No KB is
  // attached and no project knowledge files are consulted.
  return spawnSync(
    "swipl",
    [
      "-q",
      "-s",
      statusModule,
      "-g",
      `findall(Path,status:directory_tree_newer_path(${atom(root)},0,Path),Paths),length(Paths,Count),writeln(Count),halt`,
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
}

test("repeated metadata examples produce one freshness path per document", () => {
  const root = fixture();
  writeFileSync(
    join(root, "entity.md"),
    "---\nid: REQ-one\ntitle: One\nstatus: active\n---\nExample: id: REQ-two title: Two status: active\n",
  );
  const result = newerPathCount(root);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("1");
});

test("ignored README files are excluded before decoding their contents", () => {
  const root = fixture();
  writeFileSync(join(root, "README.md"), Buffer.from([0xff]));
  const result = newerPathCount(root);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("0");
  expect(result.stderr).not.toContain("Illegal UTF-8");
});

test("ignored e2e and benchmark directories are excluded before reading children", () => {
  const root = fixture();
  for (const directory of ["e2e", "benchmarks"]) {
    const ignored = join(root, "tests", directory, "nested");
    mkdirSync(ignored, { recursive: true });
    writeFileSync(join(ignored, "unreadable.md"), Buffer.from([0xff]));
  }
  const result = newerPathCount(root);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("0");
  expect(result.stderr).not.toContain("Illegal UTF-8");
});
