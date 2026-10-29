import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  GITHUB_BADGE_WORKFLOW_RELPATH,
  GITHUB_PAGES_NAMESPACE,
  KIBI_BADGE_ALT,
  PLACEHOLDER_OWNER,
  PLACEHOLDER_REPO,
} from "../../../src/commands/github-init.js";

// implements REQ-kibi-github-report-settings

/**
 * Where kibi init --github writes the badge workflow, the Pages folder the report is published under, the badge alt text and the placeholders used before the repository is known. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml. */
export function githubBadgeWorkflowPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-github-badge-workflow-path",
    symbolId: "SYM-cli-github-badge-workflow-relpath",
    value: GITHUB_BADGE_WORKFLOW_RELPATH,
  });
}

/** The GitHub Pages report folder shall be kibi-report. */
export function githubPagesNamespaceCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-github-pages-namespace",
    symbolId: "SYM-cli-github-pages-namespace",
    value: GITHUB_PAGES_NAMESPACE,
  });
}

/** The Kibi badge alt text shall be Kibi requirement health. */
export function githubBadgeAltCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-github-badge-alt",
    symbolId: "SYM-cli-github-badge-alt",
    value: KIBI_BADGE_ALT,
  });
}

/** The placeholder repository owner shall be OWNER. */
export function githubPlaceholderOwnerCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-github-placeholder-owner",
    symbolId: "SYM-cli-github-placeholder-owner",
    value: PLACEHOLDER_OWNER,
  });
}

/** The placeholder repository name shall be REPOSITORY. */
export function githubPlaceholderRepoCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-github-placeholder-repo",
    symbolId: "SYM-cli-github-placeholder-repo",
    value: PLACEHOLDER_REPO,
  });
}

describe("GitHub report and badge settings", () => {
  test("The Kibi badge workflow shall be written to .github/workflows/kibi-badge.yml", () => {
    writeCodeCertificate(githubBadgeWorkflowPathCertificate());
    expect(GITHUB_BADGE_WORKFLOW_RELPATH).toBe(
      ".github/workflows/kibi-badge.yml",
    );
  });

  test("The GitHub Pages report folder shall be kibi-report", () => {
    writeCodeCertificate(githubPagesNamespaceCertificate());
    expect(GITHUB_PAGES_NAMESPACE).toBe("kibi-report");
  });

  test("The Kibi badge alt text shall be Kibi requirement health", () => {
    writeCodeCertificate(githubBadgeAltCertificate());
    expect(KIBI_BADGE_ALT).toBe("Kibi requirement health");
  });

  test("The placeholder repository owner shall be OWNER", () => {
    writeCodeCertificate(githubPlaceholderOwnerCertificate());
    expect(PLACEHOLDER_OWNER).toBe("OWNER");
  });

  test("The placeholder repository name shall be REPOSITORY", () => {
    writeCodeCertificate(githubPlaceholderRepoCertificate());
    expect(PLACEHOLDER_REPO).toBe("REPOSITORY");
  });
});
