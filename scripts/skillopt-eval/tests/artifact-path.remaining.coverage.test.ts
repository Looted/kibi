// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareArtifactPath } from "../artifact-path";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("ArtifactPath remaining read, append, and remove methods", () => {
  test("reads, appends, removes, and rejects closed or symlink destinations", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "skillopt-art-src-"));
    const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-art-dst-"));
    roots.push(sourceRoot, artifactRoot);
    await chmod(artifactRoot, 0o700);
    const prepared = await prepareArtifactPath({ artifactRoot, sourceRoot });
    try {
      await prepared.writeText("report.json", "one\n");
      expect(await prepared.readText("report.json")).toBe("one\n");
      await prepared.appendText("report.json", "two\n");
      expect(await prepared.readText("report.json")).toBe("one\ntwo\n");
      await prepared.appendText("notes.txt", "fresh\n");
      expect(await prepared.readText("notes.txt")).toBe("fresh\n");
      await prepared.remove("notes.txt");
      await expect(prepared.readText("notes.txt")).rejects.toThrow();

      const outside = join(tmpdir(), `skillopt-art-out-${crypto.randomUUID()}`);
      roots.push(outside);
      await symlink(outside, join(artifactRoot, "link.json"));
      await expect(prepared.appendText("link.json", "nope\n")).rejects.toThrow(
        "artifact file symlink",
      );

      await prepared.close();
      await expect(prepared.readText("report.json")).rejects.toThrow(
        "artifact root is closed",
      );
      await expect(prepared.appendText("report.json", "x")).rejects.toThrow(
        "artifact root is closed",
      );
      await expect(prepared.remove("report.json")).rejects.toThrow(
        "artifact root is closed",
      );
    } finally {
      await prepared.close();
    }
  });
});
