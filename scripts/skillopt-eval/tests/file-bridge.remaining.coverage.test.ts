// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BridgeVisibilityError, FileBridge } from "../runtime/file-bridge";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("FileBridge remaining public and private IO", () => {
  test("rejects absolute paths and round-trips public and private files", async () => {
    const publicRoot = await mkdtemp(join(tmpdir(), "skillopt-bridge-pub-"));
    const privateRoot = await mkdtemp(join(tmpdir(), "skillopt-bridge-priv-"));
    roots.push(publicRoot, privateRoot);
    const bridge = new FileBridge(publicRoot, privateRoot);

    expect(() => bridge.resolve("/tmp/absolute.json", "public")).toThrow(
      BridgeVisibilityError,
    );
    expect(() => bridge.resolve("/tmp/absolute.json", "public")).toThrow(
      "absolute_bridge_path",
    );

    const publicPath = bridge.resolve("nested/public.json", "public");
    const privatePath = bridge.resolve("nested/private.json", "private");
    expect(publicPath.startsWith(publicRoot)).toBe(true);
    expect(privatePath.startsWith(privateRoot)).toBe(true);

    await bridge.writePublic("nested/public.json", "public-body\n");
    await bridge.writePrivate("nested/private.json", "private-body\n");
    expect(await bridge.readPublic("nested/public.json")).toBe("public-body\n");
    expect(await bridge.readPrivate("nested/private.json")).toBe(
      "private-body\n",
    );
  });
});
