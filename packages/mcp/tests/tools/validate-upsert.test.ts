import { describe, expect, test } from "bun:test";
import { handleKbValidateUpsert } from "../../src/tools/validate-upsert.js";

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
});
