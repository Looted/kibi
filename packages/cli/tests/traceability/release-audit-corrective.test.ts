import { describe, expect, test } from "bun:test";
import {
  auditReleaseTraceability,
  detectScopeDrift,
} from "./release-audit-fixture.js";
import { RELEASE_SCOPE } from "./release-scope.js";

const publishableSkillsSource = "packages/cli/src/public/skills.ts";
const scriptCliSource = "scripts/skillopt-eval/cli.ts";
const toolAdapterSource = "tools/skillopt/kibi_skillopt/adapter.py";

const releaseChangeset =
  '---\n"kibi-cli": patch\n---\n\nPeople can rely on release evidence.\n\nfix(cli): audit release traceability\n';

type AuditCase = Readonly<{
  changedPaths: readonly string[];
  expectedChangedPaths: readonly string[];
  changesets?: readonly string[];
  symbolsManifest?: string;
  canonicalFiles?: Readonly<Record<string, string>>;
  mirrors?: Readonly<
    Record<
      string,
      Readonly<{
        files: Readonly<Record<string, string>>;
        hashes: Readonly<Record<string, string>>;
      }>
    >
  >;
}>;

function auditCase(input: AuditCase): readonly string[] {
  return auditReleaseTraceability({
    changedPaths: input.changedPaths,
    expectedChangedPaths: input.expectedChangedPaths,
    changesets: input.changesets ?? [],
    symbolsManifest: input.symbolsManifest ?? "symbols: []\n",
    ...(input.canonicalFiles === undefined
      ? {}
      : { canonicalFiles: input.canonicalFiles }),
    ...(input.mirrors === undefined ? {} : { mirrors: input.mirrors }),
  });
}

describe("traceability/release-audit corrective scope drift", () => {
  test("accepts explicitly supplied changed paths without git history", () => {
    // Given: CI supplies changed paths explicitly, including shallow or detached jobs.
    const changedPaths = [...RELEASE_SCOPE].reverse();

    // When: the drift detector compares that input against the authoritative scope.
    const drift = detectScopeDrift(changedPaths, RELEASE_SCOPE);

    // Then: no repository state or commit ancestry is required.
    expect(drift).toEqual([]);
  });
  test("fails when a changed path is omitted from expected scope", () => {
    const scopePaths = [...RELEASE_SCOPE];
    const changedPaths = scopePaths.filter((_, i) => i !== 0);

    const drift = detectScopeDrift(changedPaths, scopePaths);

    expect(drift).toEqual([
      "changed paths do not exactly match expected scope",
    ]);
  });

  test("fails when an extra path is added beyond the expected scope", () => {
    const scopePaths = [...RELEASE_SCOPE];
    const changedPaths = [...scopePaths, "extra/added.ts"];

    const drift = detectScopeDrift(changedPaths, scopePaths);

    expect(drift).toEqual([
      "changed paths do not exactly match expected scope",
    ]);
  });

  test("fails when a changed path is tampered within the expected scope", () => {
    const scopePaths = [...RELEASE_SCOPE];
    const changedPaths = scopePaths.map((p) =>
      p === "packages/cli/src/public/skills.ts"
        ? "packages/cli/src/public/tampered.ts"
        : p,
    );

    const drift = detectScopeDrift(changedPaths, scopePaths);

    expect(drift).toEqual([
      "changed paths do not exactly match expected scope",
    ]);
  });

  test("rejects a POSIX absolute changed path", () => {
    const findings = auditCase({
      changedPaths: ["/workspace/packages/cli/src/public/skills.ts"],
      expectedChangedPaths: ["/workspace/packages/cli/src/public/skills.ts"],
    });

    expect(findings).toEqual([
      "absolute path is not allowed: /workspace/packages/cli/src/public/skills.ts",
    ]);
  });

  test("rejects a Windows drive absolute changed path", () => {
    const findings = auditCase({
      changedPaths: ["C:\\workspace\\packages\\cli\\src\\public\\skills.ts"],
      expectedChangedPaths: [
        "C:\\workspace\\packages\\cli\\src\\public\\skills.ts",
      ],
    });

    expect(findings).toEqual([
      "absolute path is not allowed: C:\\workspace\\packages\\cli\\src\\public\\skills.ts",
    ]);
  });

  test("keeps a deleted changeset path valid without checking filesystem state", () => {
    const findings = auditCase({
      changedPaths: [".changeset/deleted-release-audit.md"],
      expectedChangedPaths: [".changeset/deleted-release-audit.md"],
    });

    expect(findings).toEqual([]);
  });

  test("reports only the missing package changeset using a real publishable path", () => {
    const findings = auditCase({
      changedPaths: [publishableSkillsSource],
      expectedChangedPaths: [publishableSkillsSource],
    });

    expect(findings).toEqual([
      "missing changeset for kibi-cli",
      "missing manifest symbol for packages/cli/src/public/skills.ts",
    ]);
  });

  test("reports only missing mirror files and hashes", () => {
    const findings = auditCase({
      changedPaths: [],
      expectedChangedPaths: [],
      canonicalFiles: { "kibi-usage/SKILL.md": "canonical guidance" },
      mirrors: { codex: { files: {}, hashes: {} } },
    });

    expect(findings).toEqual([
      "mirror content drift for codex/kibi-usage/SKILL.md",
      "mirror hash drift for codex/kibi-usage/SKILL.md",
    ]);
  });

  test("reports only a missing typed symbol using a real publishable path", () => {
    const findings = auditCase({
      changedPaths: [publishableSkillsSource],
      expectedChangedPaths: [publishableSkillsSource],
      changesets: [releaseChangeset],
    });

    expect(findings).toEqual([
      `missing manifest symbol for ${publishableSkillsSource}`,
    ]);
  });

  test("reports only a missing script symbol using a real changed path", () => {
    const findings = auditCase({
      changedPaths: [scriptCliSource],
      expectedChangedPaths: [scriptCliSource],
    });

    expect(findings).toEqual([
      `missing manifest symbol for ${scriptCliSource}`,
    ]);
  });

  test("reports only a missing tool symbol using a real changed path", () => {
    const findings = auditCase({
      changedPaths: [toolAdapterSource],
      expectedChangedPaths: [toolAdapterSource],
    });

    expect(findings).toEqual([
      `missing manifest symbol for ${toolAdapterSource}`,
    ]);
  });
});
