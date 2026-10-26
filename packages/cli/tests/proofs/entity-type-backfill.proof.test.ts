import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inferTypeFromPath } from "../../src/extractors/markdown.js";
import {
  applyEntityTypeBackfill,
  planEntityTypeBackfill,
} from "../../src/operations/migration/entity-type.js";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  failedMembers,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import { ENTITY_LANES, KB_PATHS } from "../../src/utils/kb-paths.js";

// implements REQ-cli-migrate-entity-type-backfill

/** Every KB schema version a workspace can be at when kibi migrate runs. */
const SCHEMA_VERSIONS = Array.from({ length: 11 }, (_, index) => index + 1);

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** Documents without a type: plain, with nested YAML, with CRLF line ends. */
function documents(id: string): string[] {
  return [
    `---\nid: ${id}\ntitle: Untyped\nstatus: active\n---\n\nBody line.\n`,
    `---\nid: ${id}\ntitle: "Untyped: nested"\ntags:\n  - one\n  - two\norigin:\n  kind: human\n---\n\n# Heading\n\nBody.\n`,
    `---\r\nid: ${id}\r\ntitle: Untyped\r\nstatus: active\r\n---\r\n\r\nBody.\r\n`,
  ];
}

/** The document with exactly one line added: the stated type. */
function onlyTypeAdded(before: string, after: string, type: string): boolean {
  const eol = before.includes("\r\n") ? "\r\n" : "\n";
  const beforeLines = before.split(eol);
  const afterLines = after.split(eol);
  const added = afterLines.findIndex(
    (line, index) => line !== beforeLines[index],
  );
  return (
    afterLines.length === beforeLines.length + 1 &&
    afterLines[added] === `type: ${type}` &&
    afterLines.slice(added + 1).join(eol) === beforeLines.slice(added).join(eol)
  );
}

/** Every entity lane gets its folder-implied type at every schema version and keeps every other line: the exhaustive certificate. */
async function entityTypeBackfillCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-cli-migrate-entity-type-backfill-exhaustive",
    domain: { symbolId: "SYM-canonical-ENTITY_LANES", members: ENTITY_LANES },
    check(lane) {
      for (const schemaVersion of SCHEMA_VERSIONS) {
        for (const [index, before] of documents(`X-${lane}`).entries()) {
          const root = mkdtempSync(path.join(tmpdir(), "kibi-type-backfill-"));
          roots.push(root);
          mkdirSync(path.join(root, ".kb"), { recursive: true });
          writeFileSync(
            path.join(root, KB_PATHS.manifest),
            `${JSON.stringify({ manifestVersion: 1, schemaVersion })}\n`,
          );
          const relative = path.posix.join(
            KB_PATHS.lanes[lane],
            `X-${lane}-${index}.md`,
          );
          mkdirSync(path.join(root, KB_PATHS.lanes[lane]), { recursive: true });
          writeFileSync(path.join(root, relative), before);
          const type = inferTypeFromPath(path.join(root, relative));
          if (type === null)
            throw new Error(`no type is implied by ${relative}`);
          const plan = planEntityTypeBackfill(root);
          const [target] = plan.targets;
          if (plan.targets.length !== 1 || target?.type !== type)
            throw new Error(
              `schema ${schemaVersion}, document ${index}: planned ${JSON.stringify(plan)}`,
            );
          applyEntityTypeBackfill(root);
          const after = readFileSync(path.join(root, relative), "utf8");
          if (!onlyTypeAdded(before, after, type))
            throw new Error(
              `schema ${schemaVersion}, document ${index}: wrote ${JSON.stringify(after)}`,
            );
          if (planEntityTypeBackfill(root).targets.length !== 0)
            throw new Error("a typed file is planned again");
        }
      }
    },
  });
}

describe("entity type backfill, proved by exhaustion", () => {
  test("every entity lane gets its folder-implied type at every schema version and keeps every other line", async () => {
    const certificate = await entityTypeBackfillCertificate();
    writeCodeCertificate(certificate);
    expect(failedMembers(certificate)).toEqual([]);
  });
});
