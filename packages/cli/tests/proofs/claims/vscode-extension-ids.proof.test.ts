import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  KIBI_CONTAINER_ID,
  KIBI_FOCUS_KB_COMMAND,
  KIBI_REFRESH_TREE_COMMAND,
  KIBI_VIEW_ID,
} from "../../../../vscode/src/extensionIds.js";

// implements REQ-vscode-extension-ids

/**
 * The sidebar container, tree view and tree command ids the VS Code extension contributes. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The Kibi sidebar container id shall be kibi-sidebar. */
export function vscodeContainerIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-vscode-container-id",
    symbolId: "SYM-KIBI-CONTAINER-ID",
    value: KIBI_CONTAINER_ID,
  });
}

/** The Kibi tree view id shall be kibi-knowledge-base. */
export function vscodeViewIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-vscode-view-id",
    symbolId: "SYM-KIBI-VIEW-ID",
    value: KIBI_VIEW_ID,
  });
}

/** The refresh tree command shall be kibi.refreshTree. */
export function vscodeRefreshCommandCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-vscode-refresh-command",
    symbolId: "SYM-KIBI-REFRESH-TREE-COMMAND",
    value: KIBI_REFRESH_TREE_COMMAND,
  });
}

/** The focus knowledge base command shall be kibi.focusKnowledgeBase. */
export function vscodeFocusCommandCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-vscode-focus-command",
    symbolId: "SYM-KIBI-FOCUS-KB-COMMAND",
    value: KIBI_FOCUS_KB_COMMAND,
  });
}

describe("VS Code extension view and command ids", () => {
  test("The Kibi sidebar container id shall be kibi-sidebar", () => {
    writeCodeCertificate(vscodeContainerIdCertificate());
    expect(KIBI_CONTAINER_ID).toBe("kibi-sidebar");
  });

  test("The Kibi tree view id shall be kibi-knowledge-base", () => {
    writeCodeCertificate(vscodeViewIdCertificate());
    expect(KIBI_VIEW_ID).toBe("kibi-knowledge-base");
  });

  test("The refresh tree command shall be kibi.refreshTree", () => {
    writeCodeCertificate(vscodeRefreshCommandCertificate());
    expect(KIBI_REFRESH_TREE_COMMAND).toBe("kibi.refreshTree");
  });

  test("The focus knowledge base command shall be kibi.focusKnowledgeBase", () => {
    writeCodeCertificate(vscodeFocusCommandCertificate());
    expect(KIBI_FOCUS_KB_COMMAND).toBe("kibi.focusKnowledgeBase");
  });
});
