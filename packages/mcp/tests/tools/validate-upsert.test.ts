import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import fs from "node:fs/promises";
import { semanticClaimKey } from "kibi-cli/operations/semantic-advisor/analyze-prose";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import { handleKbValidateUpsert } from "../../src/tools/validate-upsert.js";
import {
  attachTestKb,
  createTestKbDir,
  detachTestKb,
  startIntegrationProlog,
  stopIntegrationProlog,
} from "../helpers/integration-prolog.js";

describe("kb_validate_upsert", () => {
  test("returns semantic advisor warning for prose-heavy normative requirements", async () => {
    const result = await handleKbValidateUpsert({
      type: "req",
      id: "REQ-SESSIONS",
      properties: {
        title: "Limit active sessions",
        status: "open",
        source: "docs/requirements/sessions.md",
        text_ref: "Users may have at most two active sessions.",
      },
    });

    const structured =
      result.structuredContent as typeof result.structuredContent & {
        semanticAdvisor?: Record<string, unknown> | null;
      };

    expect(structured.valid).toBe(true);
    expect(structured.warnings.join("\n")).toContain("kb_model_requirement");
    expect(structured.semanticAdvisor).toMatchObject({
      logic_readiness: "needs_modeling",
      candidate_lane: "strict_property",
      suggestions: [
        expect.objectContaining({
          kind: "strict_property",
          suggested_next_tool: "kb_model_requirement",
          claim: expect.objectContaining({
            subject_key: "user.session",
            property_key: "active_count",
            operator: "lte",
            value_int: 2,
          }),
        }),
      ],
    });
  });

  test("does not warn when valid requirement already links strict facts", async () => {
    const result = await handleKbValidateUpsert({
      type: "req",
      id: "REQ-MODELED",
      properties: {
        title: "Session timeout",
        status: "open",
        source: "docs/requirements/sessions.md",
        text_ref: "Session timeout must equal 30 minutes.",
        logic_claims: [
          semanticClaimKey("Session timeout must equal 30 minutes."),
        ],
      },
      relationships: [
        { type: "constrains", from: "REQ-MODELED", to: "FACT-SUBJECT" },
        {
          type: "requires_property",
          from: "REQ-MODELED",
          to: "FACT-TIMEOUT",
        },
      ],
    });

    const structured =
      result.structuredContent as typeof result.structuredContent & {
        semanticAdvisor?: Record<string, unknown> | null;
      };

    expect(structured.valid).toBe(true);
    expect(structured.warnings).toEqual([]);
    expect(structured.semanticAdvisor).toMatchObject({
      logic_readiness: "modeled",
    });
  });

  test("returns valid=false with modeling guidance without mutating", async () => {
    const result = await handleKbValidateUpsert({
      type: "fact",
      id: "FACT-VR-DRAFT-METADATA-PRESERVED",
      properties: {
        title: "Voice recording draft metadata is preserved",
        status: "active",
        source: "docs/facts/voice-recording.md",
        subjectKey: "VoiceRecording.Draft",
        propertyKey: "Preserves Existing Draft Metadata",
        operator: "eq",
        value: true,
      },
    });

    expect(result.structuredContent.valid).toBe(false);
    expect(result.structuredContent.errors.join("\n")).toMatch(
      /subjectKey[\s\S]*subject_key[\s\S]*value_bool/,
    );
    expect(result.structuredContent.normalizedPreview).toBeNull();
    expect(
      "semanticAdvisor" in result.structuredContent
        ? result.structuredContent.semanticAdvisor
        : null,
    ).toBeNull();
  });

  test("returns normalized preview for a valid payload", async () => {
    const result = await handleKbValidateUpsert({
      type: "fact",
      id: "FACT-VR-DRAFT-METADATA-PRESERVED",
      properties: {
        title: "Voice recording draft metadata is preserved",
        status: "active",
        source: "docs/facts/voice-recording.md",
        fact_kind: "property_value",
        subject_key: "voice_recording.draft",
        property_key: "preserves_existing_metadata",
        operator: "eq",
        value_type: "bool",
        value_bool: true,
        canonical_key:
          "voice_recording.draft.preserves_existing_metadata.eq.true",
      },
    });

    expect(result.structuredContent.valid).toBe(true);
    expect(result.structuredContent.errors).toEqual([]);
    expect(result.structuredContent.normalizedPreview).toMatchObject({
      id: "FACT-VR-DRAFT-METADATA-PRESERVED",
      type: "fact",
      fact_kind: "property_value",
      value_bool: true,
    });
  });

  describe("live relationship preflight", () => {
    let prolog: PrologProcess;
    let testKbPath: string;

    beforeAll(async () => {
      prolog = await startIntegrationProlog();
      testKbPath = await createTestKbDir("kibi-mcp-validate-upsert-");
    });

    beforeEach(async () => {
      await detachTestKb(prolog);
      await fs.rm(testKbPath, { recursive: true, force: true });
      await fs.mkdir(testKbPath, { recursive: true });
      await attachTestKb(prolog, testKbPath);
    });

    afterAll(async () => {
      await stopIntegrationProlog(prolog);
      await fs.rm(testKbPath, { recursive: true, force: true });
    });

    test("returns invalid before mutation when a fact is linked directly to a test", async () => {
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-UPPERCASE-INITIAL",
        properties: {
          title: "Header avatar initial is uppercase",
          status: "active",
          source: "test://validate-upsert/fact",
          fact_kind: "property_value",
          subject_key: "header.avatar.initial",
          property_key: "text_case",
          operator: "eq",
          value_type: "string",
          value_string: "uppercase",
        },
      });
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-HEADER-AVATAR-FALLBACK",
        properties: {
          title: "Header avatar fallback test",
          status: "passing",
          source: "test://validate-upsert/test",
          verification_scope: "unit",
          verification_perspective: "consumer",
        },
      });

      const result = await handleKbValidateUpsert(prolog, {
        type: "fact",
        id: "FACT-UPPERCASE-INITIAL",
        properties: {
          title: "Header avatar initial is uppercase",
          status: "active",
          source: "test://validate-upsert/fact",
          fact_kind: "property_value",
          subject_key: "header.avatar.initial",
          property_key: "text_case",
          operator: "eq",
          value_type: "string",
          value_string: "uppercase",
        },
        relationships: [
          {
            type: "verified_by",
            from: "FACT-UPPERCASE-INITIAL",
            to: "TEST-HEADER-AVATAR-FALLBACK",
          },
        ],
      });

      expect(result.structuredContent.valid).toBe(false);
      expect(result.structuredContent.errors.join("\n")).toContain(
        "Invalid relationship: verified_by from fact to test",
      );
      expect(result.structuredContent.errors.join("\n")).toContain(
        "Create or update a requirement and link REQ -> TEST with verified_by",
      );
    });
  });
});
