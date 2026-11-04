/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildProgram } from "../src/cli.js";
import { checkKibiRelease, doctorCommand } from "../src/commands/doctor.js";
import {
  type KibiReleaseManifest,
  formatVersionLine,
  parseKibiReleaseManifest,
  readKibiRelease,
  releaseMismatches,
} from "../src/kibi-release.js";

const shipped = JSON.parse(
  readFileSync(path.join(import.meta.dir, "../../core/release.json"), "utf8"),
) as KibiReleaseManifest;

function release(
  packages: Record<string, string> = {
    "kibi-cli": "2.41.0",
    "kibi-core": "0.30.0",
    "kibi-mcp": "3.25.0",
    "kibi-lang-go": "1.0.0",
  },
): KibiReleaseManifest {
  return {
    release: "2026.11.0",
    date: "2026-11-03",
    packages,
    compatibility: {
      kbSchema: { current: 13, migratesFrom: 1 },
      operationProtocol: 1,
      pluginApi: "kibi.plugin.v1",
    },
  };
}

describe("parseKibiReleaseManifest", () => {
  test("accepts the manifest kibi-core ships", () => {
    expect(parseKibiReleaseManifest(shipped)).toBe(shipped);
  });

  test("rejects anything incomplete", () => {
    expect(parseKibiReleaseManifest(null)).toBeUndefined();
    expect(parseKibiReleaseManifest("2026.11.0")).toBeUndefined();
    expect(
      parseKibiReleaseManifest({ ...release(), release: "2.41.0" }),
    ).toBeUndefined();
    expect(
      parseKibiReleaseManifest({ ...release(), date: 20261103 }),
    ).toBeUndefined();
    expect(
      parseKibiReleaseManifest({ ...release(), packages: { a: 1 } }),
    ).toBeUndefined();
    expect(
      parseKibiReleaseManifest({ ...release(), packages: null }),
    ).toBeUndefined();
    for (const compatibility of [
      undefined,
      { operationProtocol: 1, pluginApi: "kibi.plugin.v1" },
      { ...release().compatibility, kbSchema: { current: "13" } },
      { ...release().compatibility, kbSchema: { current: 13 } },
      { ...release().compatibility, operationProtocol: "1" },
      { ...release().compatibility, pluginApi: 1 },
    ]) {
      expect(
        parseKibiReleaseManifest({ ...release(), compatibility }),
      ).toBeUndefined();
    }
  });
});

describe("readKibiRelease", () => {
  test("reads the installed kibi-core manifest", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-release-"));
    try {
      const file = path.join(dir, "release.json");
      writeFileSync(file, JSON.stringify(release()));
      expect(readKibiRelease(() => file)).toStrictEqual(release());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("falls back to the monorepo manifest when kibi-core has none", () => {
    expect(
      readKibiRelease(() => {
        throw new Error("Cannot find module 'kibi-core/release.json'");
      }),
    ).toStrictEqual(shipped);
    expect(readKibiRelease(() => "/nonexistent/release.json")).toStrictEqual(
      shipped,
    );
    expect(readKibiRelease()).toStrictEqual(shipped);
  });
});

describe("releaseMismatches", () => {
  test("flags installed packages at another version, ignoring absent ones", () => {
    expect(
      releaseMismatches(release(), {
        "kibi-cli": "2.41.0",
        "kibi-core": "0.30.1",
        "kibi-mcp": undefined,
      }),
    ).toStrictEqual([
      { name: "kibi-core", installed: "0.30.1", listed: "0.30.0" },
    ]);
  });

  test("treats a local dev pack of a listed version as that version", () => {
    expect(
      releaseMismatches(release(), {
        "kibi-cli": "2.41.0-dev.abc1234",
        "kibi-core": "0.30.0-devx",
        "kibi-mcp": "3.25.0-beta.1",
      }),
    ).toStrictEqual([
      { name: "kibi-core", installed: "0.30.0-devx", listed: "0.30.0" },
      { name: "kibi-mcp", installed: "3.25.0-beta.1", listed: "3.25.0" },
    ]);
    expect(formatVersionLine("2.41.0-dev.abc1234", release())).toBe(
      "Kibi 2026.11.0 (kibi-cli 2.41.0-dev.abc1234)",
    );
  });
});

describe("formatVersionLine", () => {
  test("names the release when it lists this CLI", () => {
    expect(formatVersionLine("2.41.0", release())).toBe(
      "Kibi 2026.11.0 (kibi-cli 2.41.0)",
    );
  });

  test("falls back to the CLI version alone", () => {
    expect(formatVersionLine("2.41.0", undefined)).toBe("kibi-cli 2.41.0");
    expect(formatVersionLine("2.40.0", release())).toBe(
      "kibi-cli 2.40.0 (installed kibi-core belongs to Kibi 2026.11.0, which lists kibi-cli 2.41.0; run 'kibi doctor')",
    );
    expect(formatVersionLine("2.40.0", release({}))).toContain(
      "which lists kibi-cli none",
    );
  });
});

describe("doctor Kibi release check", () => {
  test("names the release and its compatibility versions", () => {
    const result = checkKibiRelease(release(), (name) =>
      name === "kibi-lang-go" ? undefined : release().packages[name],
    );
    expect(result).toStrictEqual({
      passed: true,
      message: "Kibi 2026.11.0 (KB schema 13, protocol 1, kibi.plugin.v1)",
      details: {
        release: "2026.11.0",
        date: "2026-11-03",
        compatibility: release().compatibility,
        installed: {
          "kibi-cli": "2.41.0",
          "kibi-core": "0.30.0",
          "kibi-mcp": "3.25.0",
        },
        mismatches: [],
      },
    });
  });

  test("warns about a mixed install", () => {
    const result = checkKibiRelease(release(), (name) =>
      name === "kibi-mcp" ? "3.24.0" : release().packages[name],
    );
    expect(result.passed).toBe(true);
    expect(result.warning).toBe(true);
    expect(result.message).toBe(
      "Mixed install for Kibi 2026.11.0: kibi-mcp 3.24.0 (release lists 3.25.0)",
    );
    expect(result.remediation).toBe(
      "Install the package versions Kibi 2026.11.0 lists, or upgrade all Kibi packages together.",
    );
  });

  test("warns when kibi-core ships no manifest", () => {
    const result = checkKibiRelease(null);
    expect(result).toMatchObject({
      passed: true,
      warning: true,
      details: { release: null },
    });
    expect(result.message).toContain("No release manifest");
  });

  test("checks this workspace's packages by default", () => {
    const result = checkKibiRelease();
    expect(result.message).toStartWith(`Kibi ${shipped.release} (`);
    expect(result.details?.mismatches).toStrictEqual([]);
    expect(
      (result.details?.installed as Record<string, string>)["kibi-cli"],
    ).toBe(shipped.packages["kibi-cli"]);
  });
});

describe("kibi --version", () => {
  test("prints the release next to the CLI version", () => {
    const cli = JSON.parse(
      readFileSync(path.join(import.meta.dir, "../package.json"), "utf8"),
    ) as { version: string };
    expect(buildProgram().version()).toBe(
      `Kibi ${shipped.release} (kibi-cli ${cli.version})`,
    );
  });
});

describe("kibi doctor", () => {
  test("reports the release first and carries the manifest in JSON", async () => {
    const log = spyOn(console, "log").mockImplementation(() => {});
    try {
      await doctorCommand({ format: "json" });
      const report = JSON.parse(String(log.mock.calls.at(-1)?.[0])) as {
        runtime: { release: KibiReleaseManifest | null };
        checks: { name: string; passed: boolean; message: string }[];
      };
      expect(report.runtime.release).toStrictEqual(shipped);
      expect(report.checks[0]).toMatchObject({
        name: "Kibi release",
        passed: true,
      });
      expect(report.checks[0]?.message).toStartWith(
        `Kibi ${shipped.release} (`,
      );
    } finally {
      log.mockRestore();
    }
  });
});
