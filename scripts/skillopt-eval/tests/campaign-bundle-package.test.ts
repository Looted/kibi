import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composeCampaignManifest, sha256Text } from "../campaign-artifacts";
import { runBundlePackageCampaign } from "../campaign-bundle-package";
import { CANONICAL_SKILLS, type CanonicalSkill } from "../catalog";
import { surface } from "../real-workflow";

async function writeCandidate(
  root: string,
  skill: CanonicalSkill,
  paragraph: string,
): Promise<string> {
  const current = await surface(process.cwd(), skill);
  const heading = current.body.match(/^ {0,3}#{1,6}[ \t]+\S.*$/m)?.[0];
  if (heading === undefined) throw new Error(`heading missing for ${skill}`);
  const manifest = composeCampaignManifest({
    skill,
    surface: current,
    insertions: [{ headingAnchor: heading, paragraph }],
    provenance: { kind: "host-composed", modelSource: "none" },
  });
  const path = join(root, `${skill}.json`);
  await writeFile(path, `${JSON.stringify(manifest)}\n`, "utf8");
  return path;
}

async function writeBundle(
  root: string,
  candidates: ReadonlyMap<CanonicalSkill, string>,
): Promise<string> {
  const path = join(root, "bundle.json");
  await writeFile(
    path,
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-bundle-manifest",
      entries: CANONICAL_SKILLS.map((skill) => {
        const manifestPath = candidates.get(skill);
        return manifestPath === undefined
          ? { skill, arm: "baseline" }
          : { skill, arm: "candidate", manifestPath };
      }),
    })}\n`,
    "utf8",
  );
  return path;
}

describe("bundle campaign package", () => {
  test("assembles two selected candidates and two explicit baselines offline", async () => {
    const parent = await mkdtemp(join(tmpdir(), "campaign-bundle-package-"));
    try {
      const candidates = new Map<CanonicalSkill, string>();
      for (const [skill, paragraph] of [
        [
          "kibi-bootstrap",
          "Read the supplied bootstrap target and verify the exact resulting state.",
        ],
        [
          "kibi-usage",
          "Use the narrowest supplied interface and read back the exact result.",
        ],
      ] as const) {
        candidates.set(skill, await writeCandidate(parent, skill, paragraph));
      }
      const bundlePath = await writeBundle(parent, candidates);
      const artifactRoot = join(parent, "artifacts");

      const receipt = await runBundlePackageCampaign({
        sourceRoot: process.cwd(),
        artifactRoot,
        bundleManifestPath: bundlePath,
      });

      expect(receipt.skills).toHaveLength(CANONICAL_SKILLS.length);
      expect(
        receipt.skills
          .filter((entry) => entry.bodyChanged)
          .map((entry) => entry.id),
      ).toEqual(["kibi-usage", "kibi-bootstrap"]);
      const packageReceipt = JSON.parse(
        await readFile(join(artifactRoot, "package-receipt.json"), "utf8"),
      );
      expect(packageReceipt.manifestReadiness.candidateSkills).toEqual([
        "kibi-usage",
        "kibi-bootstrap",
      ]);
      expect(packageReceipt.manifestReadiness.baselineSkills).toEqual([
        "kibi-freshness",
        "kibi-traceability",
      ]);
      expect(packageReceipt.evidenceValid).toBe(false);
      expect(packageReceipt.bundleEvaluation).toBe("not-performed");
      expect(packageReceipt.productionAdoption).toBe("not-performed");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("rejects a candidate with a missing hash before assembly or paid work", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "campaign-bundle-missing-hash-"),
    );
    let assemblyCalls = 0;
    try {
      const candidatePath = await writeCandidate(
        parent,
        "kibi-usage",
        "Read back the exact supplied usage result.",
      );
      const candidate = JSON.parse(
        await readFile(candidatePath, "utf8"),
      ) as Record<string, unknown>;
      candidate.frozenBodyHash = undefined;
      await writeFile(candidatePath, `${JSON.stringify(candidate)}\n`, "utf8");
      const bundlePath = await writeBundle(
        parent,
        new Map([["kibi-usage", candidatePath]]),
      );

      await expect(
        runBundlePackageCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: join(parent, "artifacts"),
          bundleManifestPath: bundlePath,
          dependencies: {
            assemble: async () => {
              assemblyCalls += 1;
              throw new Error("assembly must not run");
            },
          },
        }),
      ).rejects.toThrow("manifest_invalid");
      expect(assemblyCalls).toBe(0);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("rejects unsupported evidence explicitly without evaluating or assembling", async () => {
    const parent = await mkdtemp(join(tmpdir(), "campaign-bundle-evidence-"));
    let assemblyCalls = 0;
    try {
      const candidatePath = await writeCandidate(
        parent,
        "kibi-usage",
        "Read back the exact supplied usage result.",
      );
      const bundlePath = await writeBundle(
        parent,
        new Map([["kibi-usage", candidatePath]]),
      );

      await expect(
        runBundlePackageCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: join(parent, "artifacts"),
          bundleManifestPath: bundlePath,
          evaluation: { unsupported: true },
          dependencies: {
            assemble: async () => {
              assemblyCalls += 1;
              throw new Error("assembly must not run");
            },
          },
        }),
      ).rejects.toThrow("bundle_package_evidence_unsupported");
      expect(assemblyCalls).toBe(0);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("uses the explicit frozen body hash rather than trusting body text", async () => {
    const parent = await mkdtemp(join(tmpdir(), "campaign-bundle-body-hash-"));
    try {
      const candidatePath = await writeCandidate(
        parent,
        "kibi-usage",
        "Read back the exact supplied usage result.",
      );
      const candidate = JSON.parse(await readFile(candidatePath, "utf8")) as {
        frozenBody: string;
        frozenBodyHash: string;
      };
      candidate.frozenBodyHash = sha256Text(`${candidate.frozenBody}tampered`);
      await writeFile(candidatePath, `${JSON.stringify(candidate)}\n`, "utf8");
      const bundlePath = await writeBundle(
        parent,
        new Map([["kibi-usage", candidatePath]]),
      );

      await expect(
        runBundlePackageCampaign({
          sourceRoot: process.cwd(),
          artifactRoot: join(parent, "artifacts"),
          bundleManifestPath: bundlePath,
        }),
      ).rejects.toThrow("manifest_body_hash_mismatch");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
