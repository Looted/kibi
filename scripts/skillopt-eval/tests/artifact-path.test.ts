import { afterEach, expect, test } from "bun:test";
import { chmod, lstat, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  prepareArtifactPath,
  validateArtifactRootMetadata,
} from "../artifact-path";

const roots: string[] = [];

async function rejectionMessage(operation: Promise<unknown>): Promise<string> {
  try {
    await operation;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected operation to reject");
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

test("Given a world-writable artifact root When preparing it Then the root is rejected", async () => {
  // Given
  const sourceRoot = await mkdtemp(join(tmpdir(), "skillopt-source-"));
  const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-artifact-"));
  roots.push(sourceRoot, artifactRoot);
  await chmod(artifactRoot, 0o777);

  // When
  const prepared = prepareArtifactPath({ artifactRoot, sourceRoot });

  // Then
  expect(await rejectionMessage(prepared)).toContain("private");
});

test("Given metadata owned by another euid When validating an artifact root Then ownership is rejected", () => {
  // Given
  const currentEuid = process.geteuid?.();
  if (currentEuid === undefined) throw new Error("current euid unavailable");

  // When
  const validate = () =>
    validateArtifactRootMetadata(
      {
        uid: currentEuid + 1,
        mode: 0o700,
        isDirectory: true,
        isSymbolicLink: false,
      },
      currentEuid,
    );

  // Then
  expect(validate).toThrow("current euid");
});

test("Given an artifact root nested under the source worktree When preparing it Then it is rejected before creation", async () => {
  // Given
  const sourceRoot = await mkdtemp(join(tmpdir(), "skillopt-source-"));
  roots.push(sourceRoot);
  const artifactRoot = join(sourceRoot, "artifacts");

  // When
  const prepared = prepareArtifactPath({ artifactRoot, sourceRoot });

  // Then
  expect(await rejectionMessage(prepared)).toContain(
    "overlaps a protected root",
  );
  expect(await rejectionMessage(lstat(artifactRoot))).toContain("ENOENT");
});

test("Given a symlinked artifact root When preparing it Then the root is rejected", async () => {
  // Given
  const sourceRoot = await mkdtemp(join(tmpdir(), "skillopt-source-"));
  const target = await mkdtemp(join(tmpdir(), "skillopt-target-"));
  const artifactRoot = join(
    tmpdir(),
    `skillopt-artifact-link-${crypto.randomUUID()}`,
  );
  roots.push(sourceRoot, target, artifactRoot);
  await symlink(target, artifactRoot);

  // When
  const prepared = prepareArtifactPath({ artifactRoot, sourceRoot });

  // Then
  expect(await rejectionMessage(prepared)).toContain("symlink");
});

test("Given a safe artifact root When writing an artifact Then the atomically named file contains the requested text", async () => {
  // Given
  const sourceRoot = await mkdtemp(join(tmpdir(), "skillopt-source-"));
  const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-artifact-"));
  roots.push(sourceRoot, artifactRoot);
  const prepared = await prepareArtifactPath({ artifactRoot, sourceRoot });

  try {
    // When
    await prepared.writeText("report.json", "report\n");

    // Then
    expect(await readFile(join(artifactRoot, "report.json"), "utf8")).toBe(
      "report\n",
    );
  } finally {
    await prepared.close();
  }
});

test("Given a safe artifact root When a predictable file becomes a symlink Then the descriptor writer rejects it", async () => {
  // Given
  const sourceRoot = await mkdtemp(join(tmpdir(), "skillopt-source-"));
  const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-artifact-"));
  const outside = join(tmpdir(), `skillopt-outside-${crypto.randomUUID()}`);
  roots.push(sourceRoot, artifactRoot, outside);
  const prepared = await prepareArtifactPath({ artifactRoot, sourceRoot });
  await symlink(outside, join(artifactRoot, "report.json"));

  try {
    // When
    const write = prepared.writeText("report.json", "report\n");

    // Then
    expect(await rejectionMessage(write)).toContain("artifact file symlink");
    expect(await rejectionMessage(lstat(outside))).toContain("ENOENT");
  } finally {
    await prepared.close();
  }
});
