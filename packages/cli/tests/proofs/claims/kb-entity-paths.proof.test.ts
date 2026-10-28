import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  CANONICAL_ENTITY_PATHS,
  LEGACY_CONFIG_PATH_KEYS,
} from "../../../src/utils/kb-paths.js";

// implements REQ-cli-kb-entity-paths

/**
 * Where each kind of entity lives in a knowledge base, and the lanes an older config could relocate. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols. */
export async function canonicalPathKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-canonical-path-kinds",
    domain: {
      symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
      members: [...Object.keys(CANONICAL_ENTITY_PATHS)],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events. */
export async function legacyConfigPathKeysCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-legacy-config-path-keys",
    domain: {
      symbolId: "SYM-canonical-LEGACY_CONFIG_PATH_KEYS",
      members: [...Object.keys(LEGACY_CONFIG_PATH_KEYS)],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The canonical requirements path shall be .kb/requirements. */
export function canonicalRequirementsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-requirements-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.requirements,
  });
}

/** The canonical scenarios path shall be .kb/scenarios. */
export function canonicalScenariosPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-scenarios-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.scenarios,
  });
}

/** The canonical tests path shall be .kb/tests. */
export function canonicalTestsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-tests-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.tests,
  });
}

/** The canonical adr path shall be .kb/adr. */
export function canonicalAdrPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-adr-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.adr,
  });
}

/** The canonical flags path shall be .kb/flags. */
export function canonicalFlagsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-flags-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.flags,
  });
}

/** The canonical events path shall be .kb/events. */
export function canonicalEventsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-events-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.events,
  });
}

/** The canonical facts path shall be .kb/facts. */
export function canonicalFactsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-facts-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.facts,
  });
}

/** The canonical symbols path shall be .kb/symbols.yaml. */
export function canonicalSymbolsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-canonical-symbols-path",
    symbolId: "SYM-canonical-CANONICAL_ENTITY_PATHS",
    value: CANONICAL_ENTITY_PATHS.symbols,
  });
}

describe("Canonical knowledge base entity paths", () => {
  test("A canonical entity path shall belong to requirements, scenarios, tests, adr, flags, events, facts or symbols", async () => {
    writeCodeCertificate(await canonicalPathKindsCertificate());
    expect([...Object.keys(CANONICAL_ENTITY_PATHS)].sort()).toEqual([
      "adr",
      "events",
      "facts",
      "flags",
      "requirements",
      "scenarios",
      "symbols",
      "tests",
    ]);
  });

  test("A legacy config path key shall be requirements, scenarios, tests, facts, adr, flags or events", async () => {
    writeCodeCertificate(await legacyConfigPathKeysCertificate());
    expect([...Object.keys(LEGACY_CONFIG_PATH_KEYS)].sort()).toEqual([
      "adr",
      "events",
      "facts",
      "flags",
      "requirements",
      "scenarios",
      "tests",
    ]);
  });

  test("The canonical requirements path shall be .kb/requirements", () => {
    writeCodeCertificate(canonicalRequirementsPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.requirements).toBe(".kb/requirements");
  });

  test("The canonical scenarios path shall be .kb/scenarios", () => {
    writeCodeCertificate(canonicalScenariosPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.scenarios).toBe(".kb/scenarios");
  });

  test("The canonical tests path shall be .kb/tests", () => {
    writeCodeCertificate(canonicalTestsPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.tests).toBe(".kb/tests");
  });

  test("The canonical adr path shall be .kb/adr", () => {
    writeCodeCertificate(canonicalAdrPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.adr).toBe(".kb/adr");
  });

  test("The canonical flags path shall be .kb/flags", () => {
    writeCodeCertificate(canonicalFlagsPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.flags).toBe(".kb/flags");
  });

  test("The canonical events path shall be .kb/events", () => {
    writeCodeCertificate(canonicalEventsPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.events).toBe(".kb/events");
  });

  test("The canonical facts path shall be .kb/facts", () => {
    writeCodeCertificate(canonicalFactsPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.facts).toBe(".kb/facts");
  });

  test("The canonical symbols path shall be .kb/symbols.yaml", () => {
    writeCodeCertificate(canonicalSymbolsPathCertificate());
    expect(CANONICAL_ENTITY_PATHS.symbols).toBe(".kb/symbols.yaml");
  });
});
