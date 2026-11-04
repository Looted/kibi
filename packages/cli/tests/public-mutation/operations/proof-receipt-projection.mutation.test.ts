import { describe, expect, test } from "bun:test";
import {
  snapshotFileContent,
  withoutProofReceiptFrontmatter,
} from "../../../src/public/operations/proof-receipt-projection.js";

describe("withoutProofReceiptFrontmatter", () => {
  test("leaves content without frontmatter untouched", () => {
    expect(withoutProofReceiptFrontmatter("")).toBe("");
    expect(withoutProofReceiptFrontmatter("# Title\nproof_receipts: x\n")).toBe(
      "# Title\nproof_receipts: x\n",
    );
    expect(withoutProofReceiptFrontmatter("text")).toBe("text");
  });

  test("drops the proof_receipts block and keeps the rest byte-for-byte", () => {
    const input = [
      "---\n",
      "id: REQ-1\n",
      "proof_receipts:\n",
      "  - id: r1\n",
      "    digest: abc\n",
      "status: open\n",
      "---\n",
      "body\n",
      "proof_receipts:\n",
      "  - kept\n",
    ].join("");
    expect(withoutProofReceiptFrontmatter(input)).toBe(
      "---\nid: REQ-1\nstatus: open\n---\nbody\nproof_receipts:\n  - kept\n",
    );
  });

  test("ends the receipts block at the closing fence", () => {
    const input = "---\nproof_receipts :\n  - r\n---\nafter\n";
    expect(withoutProofReceiptFrontmatter(input)).toBe("---\n---\nafter\n");
  });

  test("keeps a frontmatter opened by an indented fence", () => {
    expect(
      withoutProofReceiptFrontmatter("  ---  \nproof_receipts: x\n---\n"),
    ).toBe("  ---  \n---\n");
  });

  test("keeps non-key lines before any receipts block", () => {
    const input = "---\n# comment\n  - item\nid: x\n---\n";
    expect(withoutProofReceiptFrontmatter(input)).toBe(input);
  });

  test("handles a last line without newline", () => {
    expect(withoutProofReceiptFrontmatter("---\nproof_receipts: x\n---")).toBe(
      "---\n---",
    );
  });

  test("treats only unindented keys as the next field", () => {
    const input =
      "---\nproof_receipts:\n  nested: 1\n- item: 2\nkey-2_x : v\n---\n";
    expect(withoutProofReceiptFrontmatter(input)).toBe(
      "---\nkey-2_x : v\n---\n",
    );
  });

  test("does not end the block on keys starting with a digit or dash", () => {
    const input = "---\nproof_receipts:\n1abc: x\n-abc: y\n_ok: z\n---\n";
    expect(withoutProofReceiptFrontmatter(input)).toBe("---\n_ok: z\n---\n");
  });

  test("keeps a non-receipts key that merely mentions proof_receipts", () => {
    const input = "---\nx: proof_receipts: y\n my_proof_receipts: z\n---\n";
    expect(withoutProofReceiptFrontmatter(input)).toBe(input);
  });

  test("does not treat the opening fence as the closing fence", () => {
    const input = "---\nproof_receipts: a\n---\n---\nproof_receipts: b\n";
    expect(withoutProofReceiptFrontmatter(input)).toBe(
      "---\n---\n---\nproof_receipts: b\n",
    );
  });

  test("resumes after a key line that follows receipts", () => {
    const input =
      "---\nproof_receipts:\n  - a\nnext: 1\nproof_receipts: 2\n  - b\nlast: 3\n---\n";
    expect(withoutProofReceiptFrontmatter(input)).toBe(
      "---\nnext: 1\nlast: 3\n---\n",
    );
  });
});

describe("snapshotFileContent", () => {
  test("projects markdown files", () => {
    const content = Buffer.from("---\nproof_receipts: x\nid: y\n---\n", "utf8");
    expect(snapshotFileContent("docs/a.md", content).toString("utf8")).toBe(
      "---\nid: y\n---\n",
    );
  });

  test("returns other files unchanged", () => {
    const content = Buffer.from("---\nproof_receipts: x\n---\n", "utf8");
    expect(snapshotFileContent("docs/a.mdx", content)).toBe(content);
    expect(snapshotFileContent("docs/a.yaml", content)).toBe(content);
  });

  test("decodes markdown as utf8", () => {
    const content = Buffer.from("---\nid: é\n---\n", "utf8");
    expect(snapshotFileContent("a.md", content).toString("utf8")).toBe(
      "---\nid: é\n---\n",
    );
  });
});
