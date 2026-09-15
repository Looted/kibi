import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composeCampaignManifest } from "../campaign-artifacts";
import { CANONICAL_SKILLS } from "../catalog";
import { CliUsageError } from "../cli-options";
import {
  defaultWorkflowDependencies,
  resolveBundleSurfaces,
  runWorkflowCommand,
} from "../cli-workflow";
import { surface } from "../real-workflow";

describe("bundle wiring", () => {
  test("accepts three explicit baselines and one campaign candidate", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bundle-manifest-"));
    try {
      const candidateSkill = "kibi-bootstrap" as const;
      const current = await surface(process.cwd(), candidateSkill);
      const heading = current.body.match(/^ {0,3}#{1,6}[ \t]+\S.*$/m)?.[0];
      if (heading === undefined) throw new Error("candidate heading missing");
      const candidate = composeCampaignManifest({
        skill: candidateSkill,
        surface: current,
        insertions: [
          {
            headingAnchor: heading,
            paragraph:
              "Use the supplied Kibi workflow and read back the exact result.",
          },
        ],
        provenance: { kind: "host-composed", modelSource: "none" },
      });
      await writeFile(
        join(root, "candidate.json"),
        `${JSON.stringify(candidate)}\n`,
        "utf8",
      );
      await writeFile(
        join(root, "bundle.json"),
        `${JSON.stringify({
          schemaVersion: "1.0.0",
          artifactType: "skillopt-bundle-manifest",
          entries: [
            { skill: "kibi-usage", arm: "baseline" },
            { skill: "kibi-freshness", arm: "baseline" },
            { skill: "kibi-traceability", arm: "baseline" },
            {
              skill: candidateSkill,
              arm: "candidate",
              manifestPath: "candidate.json",
            },
          ],
        })}\n`,
        "utf8",
      );

      const resolved = await resolveBundleSurfaces(
        process.cwd(),
        join(root, "bundle.json"),
      );
      for (const skill of CANONICAL_SKILLS) {
        if (skill === candidateSkill) {
          expect(resolved.candidateSurfaces[skill].body).toBe(
            candidate.frozenBody,
          );
        } else {
          expect(resolved.candidateSurfaces[skill].body).toBe(
            resolved.baselineSurfaces[skill].body,
          );
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects a missing bundle manifest before preflight", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bundle-missing-"));
    let preflightCalls = 0;
    try {
      await expect(
        runWorkflowCommand(
          "bundle",
          {
            runId: "00000000-0000-4000-8000-0000000000ee",
            artifactRoot: root,
            artifactRootExplicit: true,
            fake: false,
            skill: "all",
            allowPaid: true,
            maxSteps: 1,
            sourceRoot: process.cwd(),
            candidateManifest: join(root, "missing.json"),
            cellRuntime: { fixtureRunRoot: join(root, "fixtures") },
          },
          {
            ...defaultWorkflowDependencies,
            runPreflight: async () => {
              preflightCalls += 1;
              throw new Error("preflight must not run");
            },
          },
        ),
      ).rejects.toBeInstanceOf(CliUsageError);
      expect(preflightCalls).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects an all-baseline bundle as no improvement", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bundle-no-delta-"));
    try {
      await writeFile(
        join(root, "bundle.json"),
        `${JSON.stringify({
          schemaVersion: "1.0.0",
          artifactType: "skillopt-bundle-manifest",
          entries: CANONICAL_SKILLS.map((skill) => ({
            skill,
            arm: "baseline",
          })),
        })}\n`,
        "utf8",
      );
      await expect(
        resolveBundleSurfaces(process.cwd(), join(root, "bundle.json")),
      ).rejects.toThrow("bundle_no_improvement");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
