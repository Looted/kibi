import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

// implements REQ-capability-plugin-jev-optional-dependency

/**
 * Jev is optional: the default packages do not list it as a dependency. Kibi
 * reads each package.json itself at ingest, so the claims stay proved only while
 * the manifests still leave it out.
 */
const WORKSPACE = `${import.meta.dir}/../../../../../`;

/** The kibi-cli package dependencies shall exclude kibi-plugin-jev. */
export function cliExcludesJevCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cli-excludes-jev" });
}

/** The kibi-mcp package dependencies shall exclude kibi-plugin-jev. */
export function mcpExcludesJevCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-mcp-excludes-jev" });
}

/** The kibi-runtime package dependencies shall exclude kibi-plugin-jev. */
export function runtimeExcludesJevCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-runtime-excludes-jev" });
}

describe("kibi-cli, kibi-mcp and kibi-runtime do not depend on Jev", () => {
  test("kibi-cli does not depend on kibi-plugin-jev", async () => {
    writeCodeCertificate(cliExcludesJevCertificate());
    const read = await readProjectSource(
      {
        reader: "json",
        file: "packages/cli/package.json",
        path: "/dependencies",
        select: "keys",
      },
      WORKSPACE,
    );
    for (const member of ["kibi-plugin-jev"])
      expect(read.members).not.toContain(member);
  });

  test("kibi-mcp does not depend on kibi-plugin-jev", async () => {
    writeCodeCertificate(mcpExcludesJevCertificate());
    const read = await readProjectSource(
      {
        reader: "json",
        file: "packages/mcp/package.json",
        path: "/dependencies",
        select: "keys",
      },
      WORKSPACE,
    );
    for (const member of ["kibi-plugin-jev"])
      expect(read.members).not.toContain(member);
  });

  test("kibi-runtime does not depend on kibi-plugin-jev", async () => {
    writeCodeCertificate(runtimeExcludesJevCertificate());
    const read = await readProjectSource(
      {
        reader: "json",
        file: "packages/runtime/package.json",
        path: "/dependencies",
        select: "keys",
      },
      WORKSPACE,
    );
    for (const member of ["kibi-plugin-jev"])
      expect(read.members).not.toContain(member);
  });
});
