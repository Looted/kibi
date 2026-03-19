/**
 * Tests for manifestResolver.ts
 * Pure function with file system operations - needs temp directories
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resolveSymbolsManifestPath } from "../src/shared/manifestResolver";

let tempDir: string;

beforeAll(() => {
  // Create a temporary directory for all tests
  tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "kibi-manifest-resolver-test-"),
  );
});

afterEach(() => {
  // Clean up .kb directory after each test if it exists
  const kbDir = path.join(tempDir, ".kb");
  if (fs.existsSync(kbDir)) {
    fs.rmSync(kbDir, { recursive: true });
  }
  // Clean up any symbols files
  const symbolsYaml = path.join(tempDir, "symbols.yaml");
  const symbolsYml = path.join(tempDir, "symbols.yml");
  if (fs.existsSync(symbolsYaml)) {
    fs.unlinkSync(symbolsYaml);
  }
  if (fs.existsSync(symbolsYml)) {
    fs.unlinkSync(symbolsYml);
  }
});

afterAll(() => {
  // Clean up the entire temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
});

describe("resolveSymbolsManifestPath - missing config", () => {
  test("no config file falls back to default candidates", () => {
    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("no config file but symbols.yaml exists returns symbols.yaml", () => {
    const symbolsYaml = path.join(tempDir, "symbols.yaml");
    fs.writeFileSync(symbolsYaml, "test: value");
    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYaml);
  });

  test("no config file but symbols.yml exists returns symbols.yml", () => {
    const symbolsYml = path.join(tempDir, "symbols.yml");
    fs.writeFileSync(symbolsYml, "test: value");
    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYml);
  });

  test("no config file but both symbols files exist returns symbols.yaml", () => {
    const symbolsYaml = path.join(tempDir, "symbols.yaml");
    const symbolsYml = path.join(tempDir, "symbols.yml");
    fs.writeFileSync(symbolsYaml, "yaml content");
    fs.writeFileSync(symbolsYml, "yml content");
    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYaml);
  });
});

describe("resolveSymbolsManifestPath - malformed config", () => {
  test("invalid JSON in config.json falls back to defaults", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{ invalid json }");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("empty config.json falls back to defaults", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("config.json with syntax errors falls back to defaults", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, '{ "symbolsManifest": "/path/to/file" ');

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("malformed config with symbols.yaml fallback returns symbols.yaml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{ invalid }");
    const symbolsYaml = path.join(tempDir, "symbols.yaml");
    fs.writeFileSync(symbolsYaml, "test: value");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYaml);
  });
});

describe("resolveSymbolsManifestPath - paths.symbols handling", () => {
  test("config with paths.symbols returns resolved path", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "custom/symbols.yaml" } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "custom", "symbols.yaml"));
  });

  test("config with paths.symbols and nested directory resolves correctly", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "deep/nested/path/symbols.yaml" } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(
      path.join(tempDir, "deep", "nested", "path", "symbols.yaml"),
    );
  });

  test("config with paths.symbols as parent directory path resolves correctly", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "../other/symbols.yaml" } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(
      path.join(path.dirname(tempDir), "other", "symbols.yaml"),
    );
  });

  test("config with paths.symbols null falls back to defaults", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify({ paths: { symbols: null } }));

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("config with paths.symbols empty string falls back to defaults", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify({ paths: { symbols: "" } }));

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });
});

describe("resolveSymbolsManifestPath - symbolsManifest legacy handling", () => {
  test("config with symbolsManifest returns resolved path", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ symbolsManifest: "legacy/symbols.yaml" }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "legacy", "symbols.yaml"));
  });

  test("config with symbolsManifest and nested directory resolves correctly", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ symbolsManifest: "config/legacy/symbols.yml" }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "config", "legacy", "symbols.yml"));
  });

  test("config with both symbolsManifest and paths.symbols prefers paths.symbols (current convention)", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        symbolsManifest: "legacy/symbols.yaml",
        paths: { symbols: "new/symbols.yaml" },
      }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "new/symbols.yaml"));
  });

  test("config with symbolsManifest null falls back to defaults", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify({ symbolsManifest: null }));

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("config with symbolsManifest empty string falls back to defaults", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify({ symbolsManifest: "" }));

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });
});

describe("resolveSymbolsManifestPath - absolute paths", () => {
  test("config with absolute paths.symbols returns absolute path", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    const absolutePath = "/absolute/path/to/symbols.yaml";
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: absolutePath } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(absolutePath);
  });

  test("config with absolute symbolsManifest returns absolute path", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    const absolutePath = "/absolute/legacy/symbols.yml";
    fs.writeFileSync(
      configPath,
      JSON.stringify({ symbolsManifest: absolutePath }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(absolutePath);
  });

  test("config with absolute path on different drive (Windows)", () => {
    // On non-Windows systems, drive-letter paths are not recognized as absolute
    // This test verifies the actual behavior on the current platform
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    const absolutePath = "C:\\absolute\\path\\symbols.yaml";

    // Create a symbols.yaml at the location where the path would resolve to on non-Windows
    const resolvedPath = path.resolve(tempDir, absolutePath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, "test: value");

    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: absolutePath } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    // On Windows, this would be the absolute path; on Unix, it resolves relative to tempDir
    expect(result).toBe(
      path.isAbsolute(absolutePath) ? absolutePath : resolvedPath,
    );
  });
});

describe("resolveSymbolsManifestPath - relative paths", () => {
  test("config with relative paths.symbols resolves against workspace root", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "relative/symbols.yaml" } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "relative", "symbols.yaml"));
  });

  test("config with relative symbolsManifest resolves against workspace root", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ symbolsManifest: "relative/symbols.yml" }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "relative", "symbols.yml"));
  });

  test("config with dot-relative path resolves correctly", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "./config/symbols.yaml" } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "config", "symbols.yaml"));
  });

  test("config with parent-relative path resolves correctly", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "../shared/symbols.yaml" } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(
      path.join(path.dirname(tempDir), "shared", "symbols.yaml"),
    );
  });
});

describe("resolveSymbolsManifestPath - fallback to symbols.yaml/symbols.yml", () => {
  test("empty config returns symbols.yaml as default", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{}");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("config with paths object but no symbols returns symbols.yaml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify({ paths: {} }));

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("config with null paths returns symbols.yaml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify({ paths: null }));

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("both symbols.yaml and symbols.yml exist returns symbols.yaml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{}");

    const symbolsYaml = path.join(tempDir, "symbols.yaml");
    const symbolsYml = path.join(tempDir, "symbols.yml");
    fs.writeFileSync(symbolsYaml, "yaml content");
    fs.writeFileSync(symbolsYml, "yml content");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYaml);
  });

  test("only symbols.yml exists returns symbols.yml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{}");

    const symbolsYml = path.join(tempDir, "symbols.yml");
    fs.writeFileSync(symbolsYml, "yml content");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYml);
  });

  test("neither symbols.yaml nor symbols.yml exist returns symbols.yaml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{}");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("config with symbolsManifest undefined returns symbols.yaml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: undefined } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });
});

describe("resolveSymbolsManifestPath - priority and fallback behavior", () => {
  test("paths.symbols takes priority over symbolsManifest (legacy field)", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        symbolsManifest: "legacy/symbols.yaml",
        paths: { symbols: "current/symbols.yaml" },
      }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "current/symbols.yaml"));
  });

  test("symbolsManifest used when paths.symbols is null", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        symbolsManifest: "legacy/symbols.yaml",
        paths: { symbols: null },
      }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "legacy", "symbols.yaml"));
  });

  test("fallback to symbols.yaml when config paths exist but symbols don't", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { docs: "docs/path" } }),
    );

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(path.join(tempDir, "symbols.yaml"));
  });

  test("config error falls back to existing symbols.yaml", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{ invalid }");

    const symbolsYaml = path.join(tempDir, "symbols.yaml");
    fs.writeFileSync(symbolsYaml, "yaml content");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYaml);
  });

  test("config error falls back to existing symbols.yml if symbols.yaml doesn't exist", () => {
    const kbDir = path.join(tempDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    const configPath = path.join(kbDir, "config.json");
    fs.writeFileSync(configPath, "{ invalid }");

    const symbolsYml = path.join(tempDir, "symbols.yml");
    fs.writeFileSync(symbolsYml, "yml content");

    const result = resolveSymbolsManifestPath(tempDir);
    expect(result).toBe(symbolsYml);
  });
});
