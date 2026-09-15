import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { campaignMain } from "../campaign";
import { composeCampaignManifest } from "../campaign-artifacts";
import { surface } from "../real-workflow";

describe("campaign CLI", () => {
  test("requires an artifact root and paid acknowledgement for paid commands", async () => {
    expect(await campaignMain(["evaluate", "--skill", "kibi-usage"])).toBe(2);

    const parent = await mkdtemp(join(tmpdir(), "campaign-cli-gate-"));
    try {
      const current = await surface(process.cwd(), "kibi-usage");
      const heading = current.body.match(/^ {0,3}#{1,6}[ \t]+\S.*$/m)?.[0];
      if (heading === undefined)
        throw new Error("test baseline heading missing");
      const manifest = composeCampaignManifest({
        skill: "kibi-usage",
        surface: current,
        insertions: [
          {
            headingAnchor: heading,
            paragraph:
              "Search the supplied target and read back the exact result.",
          },
        ],
        provenance: { kind: "host-composed", modelSource: "none" },
      });
      const manifestPath = join(parent, "candidate.json");
      await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
      expect(
        await campaignMain([
          "evaluate",
          "--artifact-root",
          join(parent, "artifacts"),
          "--skill",
          "kibi-usage",
          "--candidate-manifest",
          manifestPath,
          "--max-target-episodes",
          "8",
          "--repeats",
          "1",
        ]),
      ).toBe(1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("runs offline compose through the public command shape", async () => {
    const parent = await mkdtemp(join(tmpdir(), "campaign-cli-compose-"));
    try {
      const insertionPath = join(parent, "insertion.json");
      const current = await surface(process.cwd(), "kibi-usage");
      const heading = current.body.match(/^ {0,3}#{1,6}[ \t]+\S.*$/m)?.[0];
      if (heading === undefined)
        throw new Error("test baseline heading missing");
      await writeFile(
        insertionPath,
        JSON.stringify({
          headingAnchor: heading,
          paragraph:
            "Search the supplied target and read back the exact result.",
        }),
        "utf8",
      );
      const artifactRoot = join(parent, "artifacts");
      expect(
        await campaignMain([
          "compose",
          "--artifact-root",
          artifactRoot,
          "--skill",
          "kibi-usage",
          "--insertion-file",
          insertionPath,
        ]),
      ).toBe(0);
      expect(
        JSON.parse(await readFile(join(artifactRoot, "manifest.json"), "utf8"))
          .artifactType,
      ).toBe("skillopt-campaign-manifest");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("keeps bundle packaging exclusive from individual candidates and evidence", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "campaign-cli-bundle-package-"),
    );
    try {
      const bundlePath = join(parent, "bundle.json");
      const individualPath = join(parent, "candidate.json");
      await writeFile(
        bundlePath,
        JSON.stringify({ artifactType: "skillopt-bundle-manifest" }),
        "utf8",
      );
      await writeFile(individualPath, "{}", "utf8");
      expect(
        await campaignMain([
          "package",
          "--artifact-root",
          join(parent, "mixed-artifacts"),
          "--candidate-manifest",
          bundlePath,
          "--candidate-manifest",
          individualPath,
        ]),
      ).toBe(2);
      expect(
        await campaignMain([
          "package",
          "--artifact-root",
          join(parent, "evidence-artifacts"),
          "--candidate-manifest",
          bundlePath,
          "--evaluation",
          join(parent, "evaluation.json"),
        ]),
      ).toBe(1);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
