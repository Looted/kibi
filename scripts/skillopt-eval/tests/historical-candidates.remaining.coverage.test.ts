import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { missingRequiredGuidance } from "../candidate-body";
import { inspectHistoricalCandidates } from "../historical-candidates";

const RUN = "00000000-0000-4000-8000-000000000201";
const SKILL = "kibi-usage";
const COMPLETE_BODY = [
  ...missingRequiredGuidance(""),
  "Safety-compliant generic operational guidance.",
  "Operational detail. ".repeat(80),
].join("\n");

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  while (restores.length > 0) restores.pop()?.();
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function temporaryRoot(): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "skillopt-historical-rest-")),
  );
  roots.push(root);
  return root;
}

async function put(path: string, contents: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

function skillRoot(root: string): string {
  return join(root, RUN, "skills", SKILL);
}

function sha256(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

function codes(report: { diagnostics: readonly { code: string }[] }) {
  return report.diagnostics.map((entry) => entry.code);
}

function failOn<T extends "lstat" | "readdir" | "open">(
  name: T,
  matches: (path: string) => boolean,
  failure: () => unknown,
) {
  const real = fsPromises[name] as (...args: unknown[]) => unknown;
  const spy = spyOn(fsPromises, name).mockImplementation(((
    path: string,
    ...rest: unknown[]
  ) => {
    if (matches(String(path))) return Promise.reject(failure());
    return real(path, ...rest);
  }) as never);
  restores.push(() => spy.mockRestore());
}

function coded(code: string): Error {
  return Object.assign(new Error(code), { code });
}

describe("historical candidate roots", () => {
  test("an ignored ancestor is refused before anything is read", async () => {
    const root = await temporaryRoot();
    const report = await inspectHistoricalCandidates({
      artifactRoot: join(root, "private", "runs"),
    });
    expect(codes(report)).toStrictEqual(["ignored_root"]);
  });

  test("a missing root and an ancestor that is a file are reported", async () => {
    const root = await temporaryRoot();
    expect(
      codes(
        await inspectHistoricalCandidates({
          artifactRoot: join(root, "absent"),
        }),
      ),
    ).toStrictEqual(["missing_root"]);
    await writeFile(join(root, "plain"), "x");
    const report = await inspectHistoricalCandidates({
      artifactRoot: join(root, "plain", "runs"),
    });
    expect(report.diagnostics).toStrictEqual([
      { code: "unreadable_ancestor", path: "", detail: "ENOTDIR" },
    ]);
  });
});

describe("historical candidate directories", () => {
  test("a skill entry that is a file is not a directory", async () => {
    const root = await temporaryRoot();
    await put(skillRoot(root), "not a directory");
    expect(
      codes(await inspectHistoricalCandidates({ artifactRoot: root })),
    ).toStrictEqual(["non_directory", "no_candidate_body"]);
  });

  test("unreadable directories are reported with their error code", async () => {
    const root = await temporaryRoot();
    await mkdir(skillRoot(root), { recursive: true });
    failOn(
      "readdir",
      (path) => path.endsWith(join("skills", SKILL)),
      () => coded("EIO"),
    );
    const report = await inspectHistoricalCandidates({ artifactRoot: root });
    expect(report.diagnostics).toContainEqual({
      code: "directory_unreadable",
      path: `${RUN}/skills/${SKILL}`,
      runId: RUN,
      detail: "EIO",
    });
  });

  test("an unreadable trainer directory carries its error code", async () => {
    const root = await temporaryRoot();
    await mkdir(join(skillRoot(root), "trainer-output"), { recursive: true });
    failOn(
      "lstat",
      (path) => path.endsWith("trainer-output"),
      () => coded("EACCES"),
    );
    const report = await inspectHistoricalCandidates({ artifactRoot: root });
    expect(report.diagnostics).toContainEqual({
      code: "directory_unreadable",
      path: `${RUN}/skills/${SKILL}/trainer-output`,
      runId: RUN,
      detail: "EACCES",
    });
  });
});

describe("historical candidate files", () => {
  const candidate = (root: string) =>
    join(skillRoot(root), "candidate_skill.md");

  test("a candidate that is a directory or not UTF-8 is rejected", async () => {
    const root = await temporaryRoot();
    await mkdir(candidate(root), { recursive: true });
    expect(
      codes(await inspectHistoricalCandidates({ artifactRoot: root })),
    ).toContain("nonregular_file");
    await rm(candidate(root), { recursive: true });
    await put(candidate(root), new Uint8Array([0xff, 0xfe, 0xfd]));
    expect(
      codes(await inspectHistoricalCandidates({ artifactRoot: root })),
    ).toContain("invalid_utf8");
  });

  test("lstat and open failures are reported, with or without an error code", async () => {
    const root = await temporaryRoot();
    await put(candidate(root), COMPLETE_BODY);
    failOn(
      "lstat",
      (path) => path.endsWith("candidate_skill.md"),
      () => coded("EIO"),
    );
    expect(
      (await inspectHistoricalCandidates({ artifactRoot: root })).diagnostics,
    ).toContainEqual({
      code: "file_unreadable",
      path: `${RUN}/skills/${SKILL}/candidate_skill.md`,
      runId: RUN,
      detail: "EIO",
    });
    restores.pop()?.();
    failOn(
      "open",
      (path) => path.endsWith("candidate_skill.md"),
      () => new Error("no code"),
    );
    expect(
      (await inspectHistoricalCandidates({ artifactRoot: root })).diagnostics,
    ).toContainEqual({
      code: "file_unreadable",
      path: `${RUN}/skills/${SKILL}/candidate_skill.md`,
      runId: RUN,
    });
  });

  test("a file that changes while it is read is rejected", async () => {
    const root = await temporaryRoot();
    await put(candidate(root), COMPLETE_BODY);
    const size = Buffer.byteLength(COMPLETE_BODY);
    const handles = [
      { stats: [{ nlink: 2, size }], bytesRead: size },
      { stats: [{ nlink: 1, size }], bytesRead: 0 },
      {
        stats: [
          { nlink: 1, size },
          { nlink: 1, size: size + 1 },
        ],
        bytesRead: size,
      },
    ];
    const realOpen = fsPromises.open;
    const spy = spyOn(fsPromises, "open").mockImplementation((async (
      path: string,
      flags: number,
    ) => {
      if (!String(path).endsWith("candidate_skill.md"))
        return realOpen(path, flags);
      const plan = handles.shift();
      if (plan === undefined) throw new Error("unexpected open");
      const stats = [...plan.stats];
      return {
        stat: async () => ({
          isFile: () => true,
          ...(stats.length > 1 ? stats.shift() : stats[0]),
        }),
        read: async () => ({ bytesRead: plan.bytesRead }),
        close: async () => {
          throw new Error("close failed");
        },
      };
    }) as never);
    restores.push(() => spy.mockRestore());
    const seen: string[] = [];
    for (let run = 0; run < 3; run += 1) {
      seen.push(
        ...codes(await inspectHistoricalCandidates({ artifactRoot: root })),
      );
    }
    expect(seen).toContain("file_changed_before_read");
    expect(seen).toContain("short_read");
    expect(seen).toContain("file_changed_during_read");
  });
});

describe("historical candidate metadata", () => {
  test("unparsable and mis-typed review metadata is reported", async () => {
    const root = await temporaryRoot();
    const reviewPath = join(root, RUN, "optimization-review.json");
    await put(join(skillRoot(root), "candidate_skill.md"), COMPLETE_BODY);
    await put(reviewPath, "not json");
    expect(
      codes(await inspectHistoricalCandidates({ artifactRoot: root })),
    ).toStrictEqual(["invalid_review_metadata"]);
    await put(reviewPath, JSON.stringify({ schemaVersion: "0.0.1" }));
    expect(
      codes(await inspectHistoricalCandidates({ artifactRoot: root })),
    ).toStrictEqual(["invalid_review_metadata"]);
  });

  test("review provenance distinguishes undeclared skills and other hashes", async () => {
    const root = await temporaryRoot();
    const reviewPath = join(root, RUN, "optimization-review.json");
    await put(join(skillRoot(root), "candidate_skill.md"), COMPLETE_BODY);
    const review = (skills: string[], hash: string) =>
      put(
        reviewPath,
        JSON.stringify({
          schemaVersion: "1.0.0",
          artifactType: "skillopt-optimization-review",
          runId: RUN,
          skills,
          candidates: [
            "not a record",
            {
              skill: SKILL,
              candidateBodyHash: hash,
              baselineBodyHash: "c".repeat(64),
            },
          ],
        }),
      );
    await review([], sha256(COMPLETE_BODY));
    const undeclared = await inspectHistoricalCandidates({
      artifactRoot: root,
    });
    expect(undeclared.candidates[0]?.origins[0]).toStrictEqual({
      runId: RUN,
      path: `${RUN}/skills/${SKILL}/candidate_skill.md`,
      verified: false,
      reason: "review_skill_not_declared",
      historicalBaselineHash: "c".repeat(64),
    });
    await review([SKILL], "d".repeat(64));
    const mismatched = await inspectHistoricalCandidates({
      artifactRoot: root,
    });
    expect(mismatched.candidates[0]?.origins[0]?.reason).toBe(
      "review_hash_mismatch",
    );
  });

  test("an accepted output with a rejected or non-object receipt is unverified", async () => {
    const root = await temporaryRoot();
    const accepted = join(skillRoot(root), "one-shot", "accepted-output");
    await put(join(accepted, "candidate-body.md"), COMPLETE_BODY);
    await mkdir(join(accepted, "receipt.json"));
    const rejected = await inspectHistoricalCandidates({ artifactRoot: root });
    expect(rejected.candidates[0]?.origins[0]?.reason).toBe("nonregular_file");
    await rm(join(accepted, "receipt.json"), { recursive: true });
    await put(join(accepted, "receipt.json"), "[]");
    const invalid = await inspectHistoricalCandidates({ artifactRoot: root });
    expect(codes(invalid)).toContain("invalid_receipt");
    expect(invalid.candidates[0]?.origins[0]?.reason).toBe("invalid_receipt");
  });
});
