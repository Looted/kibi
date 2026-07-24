import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../cli";

describe("SkillOpt workflow CLI", () => {
  test("supports help and zero-cost dry-run", async () => {
    expect(await main(["--help"])).toBe(0);
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-"));
    try {
      expect(
        await main([
          "dry-run",
          "--run-id",
          "00000000-0000-4000-8000-000000000092",
          "--artifact-root",
          root,
        ]),
      ).toBe(0);
      expect(await readFile(join(root, "dry-run.json"), "utf8")).toContain(
        '"mode":"dry-run"',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("runs and resumes the fake workflow through its CLI surface", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-run-"));
    try {
      const args = [
        "run",
        "--fake",
        "--run-id",
        "00000000-0000-4000-8000-000000000093",
        "--artifact-root",
        root,
      ];
      expect(await main(args)).toBe(0);
      expect(
        await main(args.map((value) => (value === "run" ? "resume" : value))),
      ).toBe(0);
      expect(
        await main([
          "status",
          "--run-id",
          "00000000-0000-4000-8000-000000000093",
          "--artifact-root",
          root,
        ]),
      ).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("publishes a fake report, exact approval, and adoption dry-run", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-cli-review-"));
    const runId = "00000000-0000-4000-8000-000000000094";
    const args = ["--fake", "--run-id", runId, "--artifact-root", root];
    try {
      expect(await main(["report", ...args])).toBe(0);
      expect(await main(["approve", ...args])).toBe(0);
      expect(await main(["adopt", ...args])).toBe(0);
      expect(await readFile(join(root, "report.json"), "utf8")).toContain(
        '"artifactType":"report"',
      );
      const approval = JSON.parse(
        await readFile(join(root, "approval.json"), "utf8"),
      ) as { decision?: string };
      expect(approval.decision).toBe("approved");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
