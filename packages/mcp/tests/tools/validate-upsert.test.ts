import { describe, expect, test } from "bun:test";
import { handleKbValidateUpsert } from "../../src/tools/validate-upsert.js";

describe("kb_validate_upsert", () => {
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
