import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EngineClient, daemonNodePath } from "../src/engine.js";

describe("daemonNodePath", () => {
  test("KIBI_NODE_PATH overrides the daemon runtime", () => {
    expect(daemonNodePath({ KIBI_NODE_PATH: "/opt/node22/bin/node" })).toBe(
      "/opt/node22/bin/node",
    );
  });

  test("a Bun client starts the Node daemon from PATH", () => {
    expect(daemonNodePath({})).toBe("node");
  });

  test("a Node client starts the daemon with its own runtime", () => {
    const engine = pathToFileURL(
      path.resolve(import.meta.dir, "../dist/engine.js"),
    ).href;
    const child = spawnSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `const { daemonNodePath } = await import(${JSON.stringify(engine)});
process.stdout.write(JSON.stringify([daemonNodePath({}), process.execPath]));`,
      ],
      { encoding: "utf8", timeout: 20_000 },
    );
    expect(child.stderr).toBe("");
    const [selected, execPath] = JSON.parse(child.stdout) as [string, string];
    expect(selected).toBe(execPath);
  });
});

describe("idle engine connection", () => {
  test("does not keep a finished client process alive", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-idle-client-"));
    const engine = pathToFileURL(
      path.resolve(import.meta.dir, "../dist/engine.js"),
    ).href;
    try {
      const child = spawnSync(
        "node",
        [
          "--input-type=module",
          "-e",
          `const { EngineClient } = await import(${JSON.stringify(engine)});
const client = new EngineClient({ workspaceRoot: ${JSON.stringify(root)}, branch: "main", timeout: 30000 });
const status = await client.command({ version: 1, kind: "status" });
process.stdout.write(String(status.success));`,
        ],
        { encoding: "utf8", timeout: 60_000 },
      );
      expect(child.signal).toBeNull();
      expect(child.stdout).toBe("true");
    } finally {
      const client = new EngineClient({ workspaceRoot: root, branch: "main" });
      void client
        .stop(false)
        .catch(() => undefined)
        .finally(() => {
          void client.terminate();
          rmSync(root, { recursive: true, force: true });
        });
    }
  }, 90_000);
});
