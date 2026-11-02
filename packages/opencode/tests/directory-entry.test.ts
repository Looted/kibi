import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

describe("project-local plugin file from the README", () => {
  const readme = readFileSync(path.join(packageRoot, "README.md"), "utf8");

  test("the README pins no stale release in its plugin array example", () => {
    expect(readme).not.toMatch(/kibi-opencode@\d/);
  });

  test("the .opencode/plugins/kibi.js re-export loads the installed package", async () => {
    const snippet = readme.match(
      /```js\n((?:\/\/[^\n]*\n)*export \{ default \} from "\.\.\/\.\.\/node_modules\/kibi-opencode\/[^"]+";\n)```/,
    )?.[1];
    expect(snippet).toBeTruthy();

    const project = mkdtempSync(path.join(tmpdir(), "kibi-opencode-local-"));
    try {
      mkdirSync(path.join(project, "node_modules"), { recursive: true });
      symlinkSync(
        packageRoot,
        path.join(project, "node_modules", "kibi-opencode"),
      );
      mkdirSync(path.join(project, ".opencode", "plugins"), {
        recursive: true,
      });
      const pluginFile = path.join(project, ".opencode", "plugins", "kibi.js");
      writeFileSync(pluginFile, snippet as string);

      const local = (await import(pathToFileURL(pluginFile).href)) as {
        default?: unknown;
      };
      const installed = (await import(
        pathToFileURL(path.join(packageRoot, "dist", "index.js")).href
      )) as { default?: unknown };
      expect(local.default).toBeDefined();
      expect(local.default).toBe(installed.default);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
