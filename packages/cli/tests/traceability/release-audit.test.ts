import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { auditReleaseTraceability } from "./release-audit-fixture.js";

describe("traceability/release-audit", () => {
  test("release audit accepts atomic mirrors changesets and typed links", () => {
    // Given
    const changedPaths = [
      "packages/cli/src/public/skills.ts",
      "packages/cli/tests/traceability/release-audit.test.ts",
    ];
    const canonicalSkill = "canonical guidance";

    // When
    const findings = auditReleaseTraceability({
      changedPaths: [
        "packages/cli/src/public/skills.ts",
        "packages/cli/tests/traceability/release-audit.test.ts",
      ],
      expectedChangedPaths: changedPaths,
      changesets: [
        '---\n"kibi-cli": patch\n---\n\nPeople can rely on release evidence.\n\nfix(cli): audit release traceability\n',
      ],
      symbolsManifest: `symbols:
  - id: SYM-release-audit-skills
    title: auditReleaseSkills
    sourceFile: packages/cli/src/public/skills.ts
    relationships:
      - type: implements
        target: REQ-release-audit
      - type: covered_by
        target: TEST-release-audit
  - id: SYM-release-audit-test
    title: releaseAuditTest
    sourceFile: packages/cli/tests/traceability/release-audit.test.ts
    relationships:
      - type: executable_for
        target: TEST-release-audit
`,
      canonicalFiles: { "kibi-usage/SKILL.md": canonicalSkill },
      mirrors: {
        codex: {
          files: { "kibi-usage/SKILL.md": canonicalSkill },
          hashes: {
            "kibi-usage/SKILL.md": createHash("sha256")
              .update(canonicalSkill)
              .digest("hex"),
          },
        },
      },
    });

    // Then
    expect(changedPaths).toEqual([...changedPaths].sort());
    expect(new Set(changedPaths).size).toBe(changedPaths.length);
    expect(findings).toEqual([]);
  });

  test("release audit rejects mirror hash generic reversed or missing symbol link", () => {
    // Given
    const releaseChangeset =
      '---\n"kibi-cli": patch\n---\n\nPeople can rely on the release audit.\n';

    // When
    const mirrorHashFindings = auditReleaseTraceability({
      changedPaths: [],
      expectedChangedPaths: [],
      changesets: [],
      symbolsManifest: "symbols: []\n",
      canonicalFiles: { "kibi-usage/SKILL.md": "canonical guidance" },
      mirrors: {
        codex: {
          files: { "kibi-usage/SKILL.md": "canonical guidance" },
          hashes: { "kibi-usage/SKILL.md": "drifted-hash" },
        },
      },
    });
    const genericRelationshipFindings = auditReleaseTraceability({
      changedPaths: ["packages/cli/src/public/skills.ts"],
      expectedChangedPaths: ["packages/cli/src/public/skills.ts"],
      changesets: [releaseChangeset],
      symbolsManifest: `symbols:
  - id: SYM-release-audit-skills
    title: auditReleaseSkills
    sourceFile: packages/cli/src/public/skills.ts
    relationships:
      - type: relates_to
        target: REQ-release-audit
`,
    });
    const missingChangesetFindings = auditReleaseTraceability({
      changedPaths: ["packages/cli/src/public/skills.ts"],
      expectedChangedPaths: ["packages/cli/src/public/skills.ts"],
      changesets: [],
      symbolsManifest: "symbols: []\n",
    });
    const technicalFirstFindings = auditReleaseTraceability({
      changedPaths: ["packages/cli/src/public/skills.ts"],
      expectedChangedPaths: ["packages/cli/src/public/skills.ts"],
      changesets: [
        '---\n"kibi-cli": patch\n---\n\nfix(cli): validate release evidence\n\nUsers can trust release metadata.\n',
      ],
      symbolsManifest: "symbols: []\n",
    });
    const missingTestLinkFindings = auditReleaseTraceability({
      changedPaths: ["packages/cli/tests/traceability/release-audit.test.ts"],
      expectedChangedPaths: [
        "packages/cli/tests/traceability/release-audit.test.ts",
      ],
      changesets: [],
      symbolsManifest: `symbols:
  - id: SYM-release-audit-test
    title: releaseAuditTest
    sourceFile: packages/cli/tests/traceability/release-audit.test.ts
`,
    });
    const missingSymbolFindings = auditReleaseTraceability({
      changedPaths: [
        "packages/cli/tests/traceability/untracked-release.test.ts",
      ],
      expectedChangedPaths: [
        "packages/cli/tests/traceability/untracked-release.test.ts",
      ],
      changesets: [],
      symbolsManifest: "symbols: []\n",
    });
    const reversedRelationship = () =>
      auditReleaseTraceability({
        changedPaths: ["packages/cli/src/public/skills.ts"],
        expectedChangedPaths: ["packages/cli/src/public/skills.ts"],
        changesets: [releaseChangeset],
        symbolsManifest: `symbols:
  - id: SYM-release-audit-skills
    title: auditReleaseSkills
    sourceFile: packages/cli/src/public/skills.ts
    relationships:
      - type: implements
        target: SYM-other
`,
      });

    // Then
    expect(mirrorHashFindings).toContain(
      "mirror hash drift for codex/kibi-usage/SKILL.md",
    );
    expect(genericRelationshipFindings).toContain(
      "generic relationship is not traceability evidence for SYM-release-audit-skills",
    );
    expect(genericRelationshipFindings).toContain(
      "missing implements for SYM-release-audit-skills",
    );
    expect(genericRelationshipFindings).toContain(
      "missing covered_by for SYM-release-audit-skills",
    );
    expect(missingChangesetFindings).toContain(
      "missing changeset for kibi-cli",
    );
    expect(technicalFirstFindings).toContain(
      "changeset summary must be human-readable first",
    );
    expect(missingTestLinkFindings).toContain(
      "missing executable_for for SYM-release-audit-test",
    );
    expect(missingSymbolFindings).toContain(
      "missing manifest symbol for packages/cli/tests/traceability/untracked-release.test.ts",
    );
    expect(reversedRelationship).toThrow(/Invalid relationship direction/);
  });

  test("release audit requires traceability for SkillOpt TypeScript and Python", () => {
    const implementationPaths = [
      "scripts/skillopt-eval/held-out-evaluation.ts",
      "tools/skillopt/kibi_skillopt/adapter.py",
    ];
    const testPaths = [
      "scripts/skillopt-eval/tests/held-out-evaluation.test.ts",
      "tools/skillopt/tests/test_adapter_contract.py",
    ];
    const symbols = [...implementationPaths, ...testPaths]
      .map((sourceFile, index) => {
        const testSource = sourceFile.includes("/tests/");
        return `  - id: SYM-skillopt-audit-${index}
    title: skilloptAudit${index}
    sourceFile: ${sourceFile}
    relationships:
      - type: ${testSource ? "executable_for" : "implements"}
        target: ${testSource ? "TEST-skillopt" : "REQ-skillopt"}${
          testSource
            ? ""
            : "\n      - type: covered_by\n        target: TEST-skillopt"
        }`;
      })
      .join("\n");

    expect(
      auditReleaseTraceability({
        changedPaths: [...implementationPaths, ...testPaths],
        expectedChangedPaths: [...implementationPaths, ...testPaths],
        changesets: [],
        symbolsManifest: `symbols:\n${symbols}\n`,
      }),
    ).toEqual([]);
    expect(
      auditReleaseTraceability({
        changedPaths: ["scripts/skillopt-eval/untracked.ts"],
        expectedChangedPaths: ["scripts/skillopt-eval/untracked.ts"],
        changesets: [],
        symbolsManifest: "symbols: []\n",
      }),
    ).toContain(
      "missing manifest symbol for scripts/skillopt-eval/untracked.ts",
    );
  });
});
