import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const packageRoot = path.join(import.meta.dir, "..");

describe("directory plugin entries", () => {
  test("ships root index.js and tui.js shims for directory installs", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as { files?: string[] };
    expect(pkg.files).toEqual(expect.arrayContaining(["index.js", "tui.js"]));
    for (const file of ["index.js", "tui.js"] as const) {
      const source = readFileSync(path.join(packageRoot, file), "utf8");
      expect(source).toContain("export { default }");
      expect(source).not.toMatch(/^export\s+(async\s+)?function\s+/m);
      expect(source).not.toMatch(/^export\s+const\s+/m);
    }
    expect(readFileSync(path.join(packageRoot, "tui.js"), "utf8")).toContain(
      'from "./dist/tui.js"',
    );
  });

  // implements REQ-opencode-v2-plugin-api
  test("root tui.js default export is the v1 and v2 TUI definition", async () => {
    const href = pathToFileURL(path.join(packageRoot, "tui.js")).href;
    const loaded = (await import(href)) as {
      default?: {
        id?: unknown;
        tui?: unknown;
        setup?: (context: unknown) => unknown;
      };
    };
    const definition = loaded.default;
    expect(definition?.id).toBe("kibi-opencode");
    expect(typeof definition?.tui).toBe("function");
    expect(typeof definition?.setup).toBe("function");
    // A context without the optional v2 domains still loads; setup returns
    // the cleanup that stops the signoff watcher.
    const cleanup = await definition?.setup?.({});
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
  });
});
