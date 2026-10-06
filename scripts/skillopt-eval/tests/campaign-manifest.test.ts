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
  CampaignManifestSchema,
  campaignCandidateHash,
  campaignCandidateSurface,
  candidateFrontmatterHash,
  composeCampaignManifest,
  defaultSourceFence,
  parsePublicFeedback,
  replaceCampaignBody,
  replaceCampaignBodyAndDescription,
  sha256Text,
  validateCampaignManifestAgainstSurface,
} from "../campaign-artifacts";
import { JsonValueSchema, contractHash } from "../contracts/common";
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

test("full-body revisions retain baseline and resource fences without fabricated optimizer provenance", () => {
  const manifest = replaceCampaignBody({
    skill: "kibi-bootstrap",
    surface,
    body: "## Reorganized workflow\nRead sources, review coverage, apply the approved plan, and verify results.\n",
  });
  expect(manifest.schemaVersion).toBe("1.1.0");
  expect(manifest.insertions).toEqual([]);
  expect(() =>
    validateCampaignManifestAgainstSurface(manifest, surface),
  ).not.toThrow();
  expect(() =>
    validateCampaignManifestAgainstSurface(manifest, {
      ...surface,
      resourcesHash: "c".repeat(64),
    }),
  ).toThrow("manifest_surface_mismatch");
  expect(() =>
    validateCampaignManifestAgainstSurface(
      { ...manifest, frozenBody: "tampered" },
      surface,
    ),
  ).toThrow("manifest_body_hash_mismatch");
  expect(
    CampaignManifestSchema.safeParse({ ...manifest, revisionMode: undefined })
      .success,
  ).toBe(false);
  expect(
    CampaignManifestSchema.safeParse({
      ...manifest,
      insertions: [insertion("## Discovery", "mixed")],
    }).success,
  ).toBe(false);
});

describe("body-and-description revisions", () => {
  const frontmatter = {
    id: "kibi-bootstrap",
    name: "kibi-bootstrap",
    description: "Bootstrap Kibi from the current checkout.",
    version: "3.1.1",
    kibiCompatibility: ">=1.0.0",
    tags: ["kibi", "bootstrap"],
    resources: ["resources/bootstrap.md"],
  };
  const described = {
    ...surface,
    frontmatterHash: contractHash(JsonValueSchema.parse(frontmatter)),
    manifest: frontmatter,
  };
  const description =
    'Use when a repository has no Kibi store yet: "bootstrap", sources, intent.';

  test("composes a 1.2.0 manifest that survives a JSON round trip and binds only the description", () => {
    const manifest = replaceCampaignBodyAndDescription({
      skill: "kibi-bootstrap",
      surface: described,
      body: surface.body,
      description,
    });
    expect(manifest).toMatchObject({
      schemaVersion: "1.2.0",
      revisionMode: "body-and-description-replacement",
      insertions: [],
      frontmatterHash: described.frontmatterHash,
      frozenDescription: description,
      frozenDescriptionHash: sha256Text(description),
      provenance: { kind: "host-composed", modelSource: "none" },
    });
    expect(manifest.candidateFrontmatterHash).toBe(
      contractHash(JsonValueSchema.parse({ ...frontmatter, description })),
    );
    const reparsed = CampaignManifestSchema.parse(
      JSON.parse(JSON.stringify(manifest)),
    );
    expect(reparsed).toEqual(manifest);
    expect(() =>
      validateCampaignManifestAgainstSurface(reparsed, described),
    ).not.toThrow();
    expect(campaignCandidateSurface(reparsed)).toEqual({
      body: surface.body,
      description,
    });
    // A description-only candidate must never share the baseline arm's hash.
    expect(campaignCandidateHash(reparsed)).not.toBe(sha256Text(surface.body));
  });

  test("rejects descriptions a skill loader could not read back unchanged", () => {
    const compose = (candidate: string, body: string = surface.body) =>
      replaceCampaignBodyAndDescription({
        skill: "kibi-bootstrap",
        surface: described,
        body,
        description: candidate,
      });
    expect(() => compose("   ")).toThrow("candidate_description_empty");
    expect(() => compose("First line.\nversion: 9.9.9")).toThrow(
      "candidate_description_multiline",
    );
    expect(() => compose("First line.\r")).toThrow(
      "candidate_description_multiline",
    );
    expect(() => compose("Use <skill> for bootstrap.")).toThrow(
      "candidate_description_angle_bracket",
    );
    expect(() => compose("a".repeat(1_025))).toThrow(
      "candidate_description_too_long",
    );
    expect(() => compose("a".repeat(1_024))).not.toThrow();
    expect(() => compose(frontmatter.description)).toThrow(
      "replacement_unchanged",
    );
    expect(() =>
      compose(frontmatter.description, "## Changed\nRead the sources.\n"),
    ).not.toThrow();
  });

  test("rejects a tampered description, frontmatter binding, or missing baseline frontmatter", () => {
    const manifest = replaceCampaignBodyAndDescription({
      skill: "kibi-bootstrap",
      surface: described,
      body: surface.body,
      description,
    });
    expect(
      CampaignManifestSchema.safeParse({
        ...manifest,
        frozenDescription: "Another description.",
      }).success,
    ).toBe(false);
    const rehashed = {
      ...manifest,
      frozenDescription: "Another description.",
      frozenDescriptionHash: sha256Text("Another description."),
    };
    expect(() =>
      validateCampaignManifestAgainstSurface(rehashed, described),
    ).toThrow("manifest_candidate_frontmatter_mismatch");
    expect(() =>
      validateCampaignManifestAgainstSurface(
        {
          ...rehashed,
          candidateFrontmatterHash: candidateFrontmatterHash(
            { ...frontmatter, version: "9.9.9" },
            "Another description.",
          ),
        },
        described,
      ),
    ).toThrow("manifest_candidate_frontmatter_mismatch");
    expect(() =>
      validateCampaignManifestAgainstSurface(manifest, {
        body: described.body,
        frontmatterHash: described.frontmatterHash,
        resourcesHash: described.resourcesHash,
      }),
    ).toThrow("manifest_surface_frontmatter_unavailable");
    expect(
      CampaignManifestSchema.safeParse({
        ...manifest,
        insertions: [insertion("## Discovery", "mixed")],
      }).success,
    ).toBe(false);
  });

  test("keeps 1.1.0 body-only manifests exactly as before", () => {
    const manifest = replaceCampaignBody({
      skill: "kibi-bootstrap",
      surface,
      body: "## Reorganized workflow\nRead sources and verify results.\n",
    });
    expect(Object.keys(manifest)).not.toContain("frozenDescription");
    expect(campaignCandidateHash(manifest)).toBe(manifest.frozenBodyHash);
    expect(campaignCandidateSurface(manifest)).toEqual({
      body: manifest.frozenBody,
    });
    expect(
      CampaignManifestSchema.safeParse({
        ...manifest,
        frozenDescription: description,
        frozenDescriptionHash: sha256Text(description),
      }).success,
    ).toBe(false);
  });
});
