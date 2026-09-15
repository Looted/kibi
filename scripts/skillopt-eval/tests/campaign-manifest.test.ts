import { describe, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CampaignArtifactError,
  CampaignArtifactStore,
  composeCampaignManifest,
  defaultSourceFence,
  parsePublicFeedback,
  sha256Text,
  validateCampaignManifestAgainstSurface,
} from "../campaign-artifacts";
import { runBoundedProcess } from "../runtime/process";

const surface = {
  body: "Intro remains byte-for-byte stable.\n\n## Discovery\nFind the exact endpoint.\n\n## Closeout\nRead back the final state.\n",
  frontmatterHash: "a".repeat(64),
  resourcesHash: "b".repeat(64),
} as const;

const insertion = (headingAnchor: string, paragraph: string) => ({
  headingAnchor,
  paragraph,
});

async function git(repo: string, ...argv: string[]): Promise<void> {
  const result = await runBoundedProcess({
    argv: ["git", ...argv],
    cwd: repo,
    env: process.env,
    timeoutMs: 10_000,
  });
  if (result.exitCode !== 0) throw new Error(`git_${argv[0]}:${result.stderr}`);
}

describe("campaign manifests", () => {
  test("composes independent paragraphs against one baseline and inverses exactly", () => {
    const manifest = composeCampaignManifest({
      skill: "kibi-usage",
      surface,
      insertions: [
        insertion(
          "## Discovery",
          "Search and query the exact supplied target before applying an authorized operation.",
        ),
        insertion(
          "## Closeout",
          "Read back every affected endpoint and finish with an unfiltered final check.",
        ),
      ],
      provenance: { kind: "host-composed", modelSource: "none" },
    });

    expect(manifest.insertions).toHaveLength(2);
    expect(manifest.frozenBody).toContain(manifest.insertions[0]?.paragraph);
    expect(manifest.frozenBody).toContain(manifest.insertions[1]?.paragraph);
    expect(manifest.baselineBodyHash).toBe(sha256Text(surface.body));
    expect(manifest.frozenBodyHash).toBe(sha256Text(manifest.frozenBody));
    expect(manifest.provenance).toEqual({
      kind: "host-composed",
      modelSource: "none",
    });
    expect("modelReceipt" in manifest.provenance).toBe(false);
    expect(() =>
      validateCampaignManifestAgainstSurface(manifest, surface),
    ).not.toThrow();
  });

  test("rejects a changed baseline or duplicate heading before any model use", () => {
    const paragraph =
      "Preserve the requested payload and read back its exact result.";
    expect(() =>
      composeCampaignManifest({
        skill: "kibi-usage",
        surface,
        insertions: [
          insertion("## Discovery", paragraph),
          insertion("## Discovery", paragraph),
        ],
        provenance: { kind: "host-composed", modelSource: "none" },
      }),
    ).toThrow("insertion_anchor_duplicate");

    const manifest = composeCampaignManifest({
      skill: "kibi-usage",
      surface,
      insertions: [insertion("## Discovery", paragraph)],
      provenance: { kind: "host-composed", modelSource: "none" },
    });
    expect(() =>
      validateCampaignManifestAgainstSurface(manifest, {
        ...surface,
        body: `${surface.body}drift\n`,
      }),
    ).toThrow("manifest_surface_mismatch");
  });

  test("keeps public feedback strict and rejects private identifiers", () => {
    expect(
      parsePublicFeedback({
        schemaVersion: "1.0.0",
        observations: [
          {
            family: "recovery",
            observation: "The typed result should be queried before a retry.",
            hypothesis: "The retry path needs a post-commit distinction.",
            toolSequence: ["kb_search", "kb_query"],
          },
        ],
      }).observations,
    ).toHaveLength(1);
    expect(() =>
      parsePublicFeedback({
        schemaVersion: "1.0.0",
        observations: [{ family: "x", observation: "task-private-7 failed" }],
      }),
    ).toThrow("public_feedback_private_id");
    expect(() =>
      parsePublicFeedback({
        schemaVersion: "1.0.0",
        observations: [{ family: "x", observation: "ok", taskId: "secret" }],
      }),
    ).toThrow("public_feedback_private_field");
  });

  test("does not overwrite a completed artifact root", async () => {
    const parent = await mkdtemp(join(tmpdir(), "campaign-manifest-"));
    const artifactRoot = join(parent, "artifacts");
    try {
      const first = await CampaignArtifactStore.open({
        artifactRoot,
        sourceRoot: process.cwd(),
      });
      await first.writeJson("campaign.json", { status: "complete" });
      await first.close();
      await expect(
        CampaignArtifactStore.open({
          artifactRoot,
          sourceRoot: process.cwd(),
        }),
      ).rejects.toThrow("artifact_run_complete");
      expect(
        JSON.parse(await readFile(join(artifactRoot, "campaign.json"), "utf8"))
          .status,
      ).toBe("complete");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("fences tracked symlinks from their external target contents", async () => {
    const parent = await mkdtemp(join(tmpdir(), "campaign-fence-"));
    const repo = join(parent, "repo");
    const outside = join(parent, "outside.txt");
    try {
      await mkdir(join(repo, ".agents"), { recursive: true });
      await writeFile(join(repo, "tracked.txt"), "tracked\n");
      await writeFile(outside, "outside-v1\n");
      await symlink(outside, join(repo, ".agents", "linked.txt"));
      await git(repo, "init", "-q");
      await git(repo, "config", "user.email", "campaign@test.invalid");
      await git(repo, "config", "user.name", "Campaign Test");
      await git(repo, "add", ".");
      await git(repo, "commit", "-qm", "tracked symlink");

      const first = await defaultSourceFence(repo);
      await writeFile(outside, "outside-v2\n");
      const second = await defaultSourceFence(repo);

      expect(first.files).toBe(2);
      expect(second).toEqual(first);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
