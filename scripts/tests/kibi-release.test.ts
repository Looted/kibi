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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KIBI_PROTOCOL_VERSION } from "../../packages/cli/src/public/operations/result-envelope.ts";
import {
  OPERATION_PROTOCOL_VERSION,
  RELEASE_HISTORY_PATH,
  RELEASE_MANIFEST_PATH,
  type ReleaseManifest,
  type RepoIo,
  checkRelease,
  currentCompatibility,
  fsRepo,
  isReleaseVersion,
  main,
  nextReleaseVersion,
  parseReleaseManifest,
  prepareRelease,
  releaseDate,
  releaseNotes,
  serializeManifest,
  writeRelease,
} from "../kibi-release.ts";
import { PACKAGE_CATALOG } from "../package-catalog.ts";

const repoRoot = join(import.meta.dir, "..", "..");
const NOV_4 = new Date("2026-11-04T05:00:00Z");

/** An in-memory repository holding every publishable package at `versions`. */
function memoryRepo(
  versions: Record<string, string> = {},
  files: Record<string, string> = {},
): RepoIo & { files: Map<string, string> } {
  const map = new Map<string, string>(Object.entries(files));
  for (const entry of PACKAGE_CATALOG) {
    if (!entry.publishable) continue;
    map.set(
      `packages/${entry.dir}/package.json`,
      JSON.stringify({
        name: entry.npmName,
        version: versions[entry.npmName] ?? "1.0.0",
      }),
    );
  }
  return {
    root: "/memory",
    files: map,
    read: (p) => map.get(p),
    write: (p, content) => {
      map.set(p, content);
    },
    list: (dir) =>
      [...map.keys()]
        .filter((p) => p.startsWith(`${dir}/`))
        .map((p) => p.slice(dir.length + 1))
        .filter((p) => !p.includes("/")),
  };
}

function allPackages(version = "1.0.0"): Record<string, string> {
  return Object.fromEntries(
    PACKAGE_CATALOG.filter((e) => e.publishable).map((e) => [
      e.npmName,
      version,
    ]),
  );
}

function manifest(overrides: Partial<ReleaseManifest> = {}): ReleaseManifest {
  return {
    release: "2026.11.0",
    date: "2026-11-03",
    packages: allPackages(),
    compatibility: currentCompatibility(),
    ...overrides,
  };
}

function released(
  m: ReleaseManifest,
  history: ReleaseManifest[] = [m],
): Record<string, string> {
  return {
    [RELEASE_MANIFEST_PATH]: serializeManifest(m),
    [RELEASE_HISTORY_PATH]: `${JSON.stringify(history, null, 2)}\n`,
  };
}

describe("nextReleaseVersion", () => {
  test("starts a month at .0 and counts releases within it", () => {
    expect(nextReleaseVersion(undefined, NOV_4)).toBe("2026.11.0");
    expect(nextReleaseVersion("2026.10.7", NOV_4)).toBe("2026.11.0");
    expect(
      nextReleaseVersion("2025.12.3", new Date("2026-01-02T00:00:00Z")),
    ).toBe("2026.1.0");
    expect(nextReleaseVersion("2026.11.0", NOV_4)).toBe("2026.11.1");
    expect(nextReleaseVersion("2026.11.9", NOV_4)).toBe("2026.11.10");
  });

  test("never goes backwards when the clock is behind the last release", () => {
    expect(nextReleaseVersion("2026.12.2", NOV_4)).toBe("2026.12.3");
    expect(nextReleaseVersion("2027.1.0", NOV_4)).toBe("2027.1.1");
  });

  test("rejects a malformed previous version", () => {
    expect(() => nextReleaseVersion("2026.13.0", NOV_4)).toThrow(
      "Invalid Kibi release version '2026.13.0'",
    );
    expect(() => nextReleaseVersion("2026.11.01", NOV_4)).toThrow();
  });

  test("release versions are calendar triples", () => {
    expect(isReleaseVersion("2026.11.0")).toBe(true);
    expect(isReleaseVersion("2026.0.1")).toBe(false);
    expect(isReleaseVersion("2.41.0")).toBe(false);
    expect(isReleaseVersion(2026)).toBe(false);
  });
});

describe("parseReleaseManifest", () => {
  test("accepts a complete manifest", () => {
    expect(parseReleaseManifest(serializeManifest(manifest()))).toStrictEqual(
      manifest(),
    );
  });

  test("names every bad field", () => {
    expect(() =>
      parseReleaseManifest(
        JSON.stringify({ release: "x", date: "today", packages: { a: 1 } }),
      ),
    ).toThrow(
      "Invalid Kibi release manifest: bad release, date, packages, compatibility",
    );
    expect(() =>
      parseReleaseManifest(
        JSON.stringify({
          ...manifest(),
          compatibility: { ...currentCompatibility(), pluginApi: 1 },
        }),
      ),
    ).toThrow("bad compatibility");
  });
});

describe("compatibility", () => {
  test("declares the versions the source code uses", () => {
    expect(OPERATION_PROTOCOL_VERSION).toBe(KIBI_PROTOCOL_VERSION);
    const compat = currentCompatibility();
    expect(compat.kbSchema.migratesFrom).toBeLessThanOrEqual(
      compat.kbSchema.current,
    );
    expect(compat.pluginApi).toBe("kibi.plugin.v1");
  });
});

describe("prepareRelease", () => {
  test("does nothing without pending changesets", () => {
    const repo = memoryRepo({}, { ".changeset/README.md": "docs" });
    expect(prepareRelease(repo, NOV_4)).toStrictEqual({ action: "none" });
    expect(repo.files.has(".changeset/kibi-release-manifest.md")).toBe(false);
  });

  test("adds a kibi-core patch changeset when nothing bumps kibi-core", () => {
    const repo = memoryRepo(
      {},
      {
        ...released(manifest()),
        ".changeset/feature.md": '---\n"kibi-cli": minor\n---\n\nFeature.\n',
      },
    );
    expect(prepareRelease(repo, NOV_4)).toStrictEqual({
      action: "added-carrier",
      release: "2026.11.1",
    });
    expect(repo.files.get(".changeset/kibi-release-manifest.md")).toBe(
      '---\n"kibi-core": patch\n---\n\nShips the release manifest for Kibi 2026.11.1.\n',
    );
  });

  test("leaves an existing kibi-core bump alone", () => {
    const repo = memoryRepo(
      {},
      { ".changeset/core.md": "---\nkibi-core: minor\n---\n\nCore.\n" },
    );
    expect(prepareRelease(repo, NOV_4)).toStrictEqual({
      action: "already-carried",
      release: "2026.11.0",
    });
    expect(repo.files.has(".changeset/kibi-release-manifest.md")).toBe(false);
  });
});

describe("writeRelease", () => {
  test("keeps the current release when no package version moved", () => {
    const repo = memoryRepo({}, released(manifest()));
    const before = new Map(repo.files);
    const result = writeRelease(repo, NOV_4);
    expect(result.action).toBe("unchanged");
    expect(result.manifest.release).toBe("2026.11.0");
    expect(repo.files).toStrictEqual(before);
  });

  test("assigns the next release and prepends it to the history", () => {
    const previous = manifest();
    const repo = memoryRepo(
      { "kibi-core": "1.0.1", "kibi-cli": "1.1.0" },
      released(previous),
    );
    const result = writeRelease(repo, NOV_4);
    expect(result.action).toBe("released");
    expect(result.manifest.release).toBe("2026.11.1");
    expect(result.manifest.date).toBe("2026-11-04");
    expect(result.manifest.packages["kibi-cli"]).toBe("1.1.0");
    const history = JSON.parse(
      repo.files.get(RELEASE_HISTORY_PATH) ?? "[]",
    ) as ReleaseManifest[];
    expect(history.map((entry) => entry.release)).toStrictEqual([
      "2026.11.1",
      "2026.11.0",
    ]);
    expect(checkRelease(repo)).toStrictEqual([]);
  });

  test("refuses a release in which kibi-core cannot ship the manifest", () => {
    const repo = memoryRepo({ "kibi-cli": "1.1.0" }, released(manifest()));
    expect(() => writeRelease(repo, NOV_4)).toThrow("kibi-core was not bumped");
  });

  test("writes the first release when no manifest exists", () => {
    const repo = memoryRepo();
    expect(writeRelease(repo, NOV_4).manifest.release).toBe("2026.11.0");
    expect(checkRelease(repo)).toStrictEqual([]);
  });
});

describe("checkRelease", () => {
  test("reports a missing or unreadable manifest", () => {
    expect(checkRelease(memoryRepo())).toStrictEqual([
      `${RELEASE_MANIFEST_PATH} is missing`,
    ]);
    expect(
      checkRelease(memoryRepo({}, { [RELEASE_MANIFEST_PATH]: "{}" })),
    ).toStrictEqual([
      "Invalid Kibi release manifest: bad release, date, packages, compatibility",
    ]);
  });

  test("reports drifted, unlisted and unknown packages", () => {
    const listed = Object.fromEntries(
      Object.entries(allPackages()).filter(([name]) => name !== "kibi-mcp"),
    );
    const m = manifest({ packages: { ...listed, "kibi-gone": "1.0.0" } });
    const repo = memoryRepo({ "kibi-cli": "1.2.0" }, released(m));
    expect(checkRelease(repo)).toStrictEqual([
      "kibi-cli is 1.2.0 but Kibi 2026.11.0 lists 1.0.0",
      "kibi-mcp@1.0.0 is not listed in Kibi 2026.11.0",
      "Kibi 2026.11.0 lists kibi-gone, which is not a publishable package",
    ]);
  });

  test("requires the history to start with the manifest, newest first", () => {
    const m = manifest({ release: "2026.11.2" });
    const out = [
      manifest({ release: "2026.11.0" }),
      manifest({ release: "2026.11.1" }),
    ];
    const repo = memoryRepo({}, released(m, [m, ...out]));
    expect(checkRelease(repo)).toStrictEqual([
      `${RELEASE_HISTORY_PATH} is not newest first at 2026.11.0, 2026.11.1`,
    ]);
    const stale = memoryRepo({}, released(m, [manifest()]));
    expect(checkRelease(stale)).toStrictEqual([
      `${RELEASE_HISTORY_PATH} must start with the entry in ${RELEASE_MANIFEST_PATH}`,
    ]);
    const broken = memoryRepo(
      {},
      { ...released(m), [RELEASE_HISTORY_PATH]: "{}" },
    );
    expect(checkRelease(broken)).toStrictEqual([
      `${RELEASE_HISTORY_PATH} must hold a JSON array`,
      `${RELEASE_HISTORY_PATH} must start with the entry in ${RELEASE_MANIFEST_PATH}`,
    ]);
  });

  test("the committed manifest matches this tree", () => {
    expect(checkRelease(fsRepo(repoRoot))).toStrictEqual([]);
    const shipped = JSON.parse(
      readFileSync(join(repoRoot, "packages/core/package.json"), "utf8"),
    ) as { files: string[] };
    expect(shipped.files).toContain("release.json");
  });
});

describe("releaseNotes", () => {
  test("lists every package and the compatibility versions", () => {
    const notes = releaseNotes(manifest());
    expect(notes).toStartWith(
      "Kibi 2026.11.0 (2026-11-03) is this exact package set:",
    );
    expect(notes).toContain("| `kibi-cli` | 1.0.0 |");
    expect(notes).toContain(
      `- KB schema ${currentCompatibility().kbSchema.current} (\`kibi migrate\` upgrades from schema 1)`,
    );
    expect(notes).toContain("- Plugin API `kibi.plugin.v1`");
  });
});

describe("releaseDate", () => {
  test("uses KIBI_RELEASE_DATE when set", () => {
    expect(releaseDate({ KIBI_RELEASE_DATE: "2026-12-01" }).toISOString()).toBe(
      "2026-12-01T00:00:00.000Z",
    );
    expect(() => releaseDate({ KIBI_RELEASE_DATE: "soon" })).toThrow(
      "KIBI_RELEASE_DATE must be YYYY-MM-DD, got 'soon'",
    );
    const now = Date.now();
    expect(releaseDate({}).getTime()).toBeGreaterThanOrEqual(now - 1000);
  });
});

describe("main", () => {
  const env = { KIBI_RELEASE_DATE: "2026-11-04" };

  function run(argv: string[], repo: RepoIo) {
    const log = spyOn(console, "log").mockImplementation(() => {});
    const error = spyOn(console, "error").mockImplementation(() => {});
    const write = spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const code = main(argv, repo, env);
      return {
        code,
        out: [
          ...log.mock.calls.map((c) => String(c[0])),
          ...write.mock.calls.map((c) => String(c[0])),
        ].join("\n"),
        err: error.mock.calls.map((c) => String(c[0])).join("\n"),
      };
    } finally {
      log.mockRestore();
      error.mockRestore();
      write.mockRestore();
    }
  }

  test("runs a whole release: prepare, version bump, write, check, notes", () => {
    const repo = memoryRepo(
      {},
      {
        ...released(manifest()),
        ".changeset/feature.md": '---\n"kibi-cli": minor\n---\n\nFeature.\n',
      },
    );
    expect(run(["prepare"], repo).out).toBe(
      "Kibi 2026.11.1: added .changeset/kibi-release-manifest.md so kibi-core ships the release manifest.",
    );
    expect(run(["prepare"], repo).out).toBe(
      "Kibi 2026.11.1: kibi-core is already bumped.",
    );
    // What `changeset version` does to the package versions.
    const bumped = memoryRepo(
      { "kibi-core": "1.0.1", "kibi-cli": "1.1.0" },
      released(manifest()),
    );
    expect(run(["check"], bumped)).toMatchObject({ code: 1 });
    expect(run(["write"], bumped).out).toBe(
      `Wrote Kibi 2026.11.1 to ${RELEASE_MANIFEST_PATH} and ${RELEASE_HISTORY_PATH}.`,
    );
    expect(run(["write"], bumped).out).toBe(
      "No package versions changed; Kibi 2026.11.1 stays current.",
    );
    expect(run(["check"], bumped)).toMatchObject({
      code: 0,
      out: "Kibi release manifest is current (2026.11.1).",
    });
    expect(run(["version"], bumped).out).toBe("2026.11.1");
    expect(run(["notes"], bumped).out).toContain("| `kibi-cli` | 1.1.0 |");
  });

  test("reports problems and usage", () => {
    const repo = memoryRepo({}, released(manifest()));
    expect(run(["prepare"], repo).out).toBe(
      "No pending changesets; no Kibi release to prepare.",
    );
    const drifted = memoryRepo({ "kibi-cli": "9.9.9" }, released(manifest()));
    const result = run(["check"], drifted);
    expect(result.code).toBe(1);
    expect(result.err).toContain(
      "✗ kibi-cli is 9.9.9 but Kibi 2026.11.0 lists 1.0.0",
    );
    expect(result.err).toContain("bun run version-packages");
    expect(run(["bogus"], repo)).toMatchObject({ code: 2 });
    expect(() => run(["notes"], memoryRepo())).toThrow("is missing");
    expect(() => run(["version"], memoryRepo())).toThrow("is missing");
  });
});
