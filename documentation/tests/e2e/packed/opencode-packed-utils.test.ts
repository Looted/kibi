import assert from "node:assert";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  parseNpmPackJsonOutput,
  resolveNpmPackFilename,
} from "./npm-pack-json.js";
import { writePackedInstallManifest } from "./packed-install-manifest.js";

describe("opencode packed utility helpers", () => {
  it("parses npm pack JSON after build output noise", () => {
    const noisyOutput = `[build-tui] dist/tui.js written
[{"lifecycle":"contract verifier"}]
[
  {
    "filename": "kibi-opencode-0.4.1.tgz",
    "version": "0.4.1"
  }
]
`;

    const results = parseNpmPackJsonOutput(noisyOutput);

    assert.deepStrictEqual(results, [
      { filename: "kibi-opencode-0.4.1.tgz", version: "0.4.1" },
    ]);
  });

  it("parses pnpm's single absolute-path pack result", () => {
    const results = parseNpmPackJsonOutput(
      ' {"filename":"/tmp/kibi-pack/kibi-core-0.10.3.tgz","version":"0.10.3"}\n',
    );

    assert.deepStrictEqual(results, [
      {
        filename: "/tmp/kibi-pack/kibi-core-0.10.3.tgz",
        version: "0.10.3",
      },
    ]);
    assert.strictEqual(
      resolveNpmPackFilename("/tmp/kibi-pack", results[0]?.filename ?? ""),
      "/tmp/kibi-pack/kibi-core-0.10.3.tgz",
    );
    assert.strictEqual(
      resolveNpmPackFilename(
        "/tmp/another-destination",
        "kibi-core-0.10.3.tgz",
      ),
      "/tmp/another-destination/kibi-core-0.10.3.tgz",
    );
  });

  it("rejects malformed and traversal pack output", () => {
    assert.throws(() => parseNpmPackJsonOutput('{"version":"0.10.3"}'));
    assert.throws(() =>
      parseNpmPackJsonOutput(
        '[{"filename":"../outside/kibi-core-0.10.3.tgz","version":"0.10.3"}]',
      ),
    );
    assert.throws(() =>
      resolveNpmPackFilename(
        "/tmp/destination",
        "/tmp/outside/kibi-core-0.10.3.tgz",
      ),
    );
    assert.throws(() =>
      resolveNpmPackFilename("/tmp/destination", "../outside.tgz"),
    );
  });

  it("writes deterministic npm and current-pnpm install manifests", () => {
    const prefix = mkdtempSync(join(tmpdir(), "kibi-packed-manifest-test-"));
    const tarballs = {
      core: "/tmp/kibi/core.tgz",
      cli: "/tmp/kibi/cli.tgz",
      runtime: "/tmp/kibi/runtime.tgz",
      mcp: "/tmp/kibi/mcp.tgz",
      opencode: "/tmp/kibi/opencode.tgz",
      codex: "/tmp/kibi/codex.tgz",
      cursor: "C:\\kibi\\cursor.tgz",
    };
    const packageFiles = {
      "kibi-core": `file:${tarballs.core}`,
      "kibi-cli": `file:${tarballs.cli}`,
      "kibi-runtime": `file:${tarballs.runtime}`,
      "kibi-mcp": `file:${tarballs.mcp}`,
      "kibi-opencode": `file:${tarballs.opencode}`,
      "kibi-codex": `file:${tarballs.codex}`,
      "kibi-cursor": `file:${tarballs.cursor}`,
    };

    try {
      writeFileSync(join(prefix, "pnpm-workspace.yaml"), "stale\n", "utf8");
      writePackedInstallManifest(prefix, tarballs);

      const packageJson = JSON.parse(
        readFileSync(join(prefix, "package.json"), "utf8"),
      ) as Record<string, unknown>;
      assert.deepStrictEqual(packageJson.dependencies, packageFiles);
      assert.strictEqual(packageJson.pnpm, undefined);
      assert.strictEqual(
        readFileSync(join(prefix, "pnpm-workspace.yaml"), "utf8"),
        [
          "overrides:",
          ...Object.entries(packageFiles).map(
            ([packageName, tarballPath]) =>
              `  ${packageName}: ${JSON.stringify(tarballPath)}`,
          ),
          "allowBuilds:",
          "  msgpackr-extract: true",
          "",
        ].join("\n"),
      );
      assert.deepStrictEqual(readdirSync(prefix).sort(), [
        "package.json",
        "pnpm-workspace.yaml",
      ]);
    } finally {
      rmSync(prefix, { recursive: true, force: true });
    }
  });
});
