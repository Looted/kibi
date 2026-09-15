import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(packageRoot, "..", "..");

/**
 * ZCode discovers marketplaces via `.claude-plugin/marketplace.json` (verified
 * against the installed client), and each plugin entry resolves its `source`
 * relative to the marketplace root.
 */
describe("kibi-zcode ZCode marketplace", () => {
  const marketplacePath = path.join(
    repoRoot,
    ".claude-plugin",
    "marketplace.json",
  );

  test("defines the repo marketplace with the kibi-zcode plugin", () => {
    const raw = fs.readFileSync(marketplacePath, "utf8");
    const marketplace = JSON.parse(raw) as {
      name?: string;
      description?: string;
      plugins?: Array<{
        name?: string;
        source?: string;
        description?: string;
        category?: string;
      }>;
    };

    expect(marketplace.name).toBe("kibi");
    expect(typeof marketplace.description).toBe("string");

    const plugin = marketplace.plugins?.find(
      (entry) => entry.name === "kibi-zcode",
    );
    expect(plugin).toBeTruthy();
    expect(plugin?.source).toBe("./packages/zcode");
    expect(plugin?.category).toBe("Productivity");
    expect(plugin?.description).toEqual(expect.stringContaining("Kibi"));
  });

  test("marketplace has no unsupported npm/pip source kinds", () => {
    const raw = fs.readFileSync(marketplacePath, "utf8");
    expect(raw).not.toContain('"npm"');
    expect(raw).not.toContain('"pip"');
  });

  test("the referenced plugin directory carries a complete plugin payload", () => {
    for (const required of [
      path.join(".zcode-plugin", "plugin.json"),
      path.join("hooks", "hooks.json"),
      path.join("bin", "mcp-launcher.cjs"),
      path.join("commands", "kibi-bootstrap.md"),
      "skills",
    ]) {
      expect(
        fs.existsSync(path.join(packageRoot, required)),
        `plugin payload missing ${required}`,
      ).toBe(true);
    }
  });
});
