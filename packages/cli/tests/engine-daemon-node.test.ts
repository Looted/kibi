import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { daemonNodePath } from "../src/engine.js";

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
