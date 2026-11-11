import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

/**
 * The canonical Kibi skills the CLI bundles, proved against the skill folders
 * it ships. Kibi reads the folders itself at ingest; the test checks the same
 * read.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;

const CANONICAL_SKILLS = [
  "kibi-bootstrap",
  "kibi-commit-review",
  "kibi-decisions",
  "kibi-freshness",
  "kibi-provable-code",
  "kibi-traceability",
  "kibi-usage",
];

/** The canonical Kibi skills must be exactly kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage. */
export function canonicalSkillCatalogCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-bundled-skill-catalog" });
}

describe("The canonical Kibi skill catalog", () => {
  test("The canonical Kibi skills must be exactly the seven bundled skills", async () => {
    writeCodeCertificate(canonicalSkillCatalogCertificate());
    const read = await readProjectSource(
      {
        reader: "glob",
        pattern: "packages/cli/src/public/skills/*/SKILL.md",
        capture: true,
      },
      WORKSPACE,
    );
    expect([...new Set(read.members)].sort()).toEqual(CANONICAL_SKILLS);
  });
});
