import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as runtime from "kibi-runtime";

import { loadDefaultEnvFile, loadEnvFile } from "../src/env.js";
import { KIBI_ICONS } from "../src/server/icons.js";
import { resolveEnvFilePath } from "../src/workspace.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 308 309"><rect width="308" height="309" rx="64" fill="#1D1E23"/><ellipse cx="113.3" cy="150.9" rx="51.3" ry="51.5" fill="#A2D3F4"/><path d="M228.1 197.8L227.6 165.5H156.5L95.4 165.3V135.1H156.5L227.5 135.1V101.2H252.2V197.8Z" fill="#A2D3F4"/></svg>';

describe("server icon", () => {
  test("is the dark Kibi mark as an SVG data URL", () => {
    expect(KIBI_ICONS).toStrictEqual([
      {
        src: `data:image/svg+xml;base64,${Buffer.from(LOGO, "utf8").toString("base64")}`,
        mimeType: "image/svg+xml",
        sizes: ["any"],
        theme: "dark",
      },
    ]);
  });
});

describe("environment loading", () => {
  test("the default load reports every key it loaded", () => {
    const result = (user: string[], project: string[], legacy: string[]) =>
      ({
        keysLoadedFromUser: user,
        keysLoadedFromProject: project,
        keysLoadedFromLegacy: legacy,
        projectEnvPath: "/ws/.env.kibi",
      }) as never;
    const bootstrap = spyOn(runtime, "bootstrapKibiEnvironment");
    spies.push(bootstrap);
    bootstrap.mockReturnValueOnce(result([], [], []));
    expect(loadDefaultEnvFile()).toStrictEqual({
      loaded: false,
      envFilePath: "/ws/.env.kibi",
      keysLoaded: [],
    });
    bootstrap.mockReturnValueOnce(result(["U"], ["P"], ["L"]));
    expect(loadDefaultEnvFile()).toStrictEqual({
      loaded: true,
      envFilePath: "/ws/.env.kibi",
      keysLoaded: ["U", "P", "L"],
    });
  });

  test("a missing env file is not an error", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-mcp-env-"));
    const error = spyOn(console, "error").mockImplementation(() => undefined);
    spies.push(error);
    // Another file may have left console.error as a mock with its own calls.
    error.mockClear();
    try {
      expect(
        loadEnvFile({ envFileName: ".env.none", workspaceRoot: root }),
      ).toStrictEqual({
        loaded: false,
        envFilePath: path.join(root, ".env.none"),
        keysLoaded: [],
      });
      expect(
        error.mock.calls.filter((call) =>
          String(call[0]).includes("Unable to load environment file"),
        ),
      ).toStrictEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an absolute env file name is kept as written", () => {
    expect(resolveEnvFilePath("/a/../.env", "/ws")).toBe("/a/../.env");
    expect(resolveEnvFilePath("x/../.env", "/ws")).toBe("/ws/.env");
  });
});
