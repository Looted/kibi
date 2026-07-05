import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbUpsert } from "../../src/tools/upsert.js";

function createMockProlog() {
  const query = mock(async () => ({ success: true, bindings: {} }));
  return {
    query,
    invalidateCache: mock(() => {}),
  } as unknown as PrologProcess;
}

describe("kb_upsert modeling guidance errors", () => {
  test("explains how to fix product-style camelCase strict fact fields", async () => {
    await expect(
      handleKbUpsert(createMockProlog(), {
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
      }),
    ).rejects.toThrow(
      /subjectKey[\s\S]*subject_key[\s\S]*propertyKey[\s\S]*property_key[\s\S]*value_type[\s\S]*value_bool[\s\S]*kb_model_requirement/,
    );
  });

  test("explains generic numeric and string value hints", async () => {
    await expect(
      handleKbUpsert(createMockProlog(), {
        type: "fact",
        id: "FACT-NUMBER-VALUE-HINT",
        properties: {
          title: "Number value hint",
          status: "active",
          fact_kind: "property_value",
          value: 1.5,
        },
      }),
    ).rejects.toThrow('value_type: "number" plus value_number: 1.5');

    await expect(
      handleKbUpsert(createMockProlog(), {
        type: "fact",
        id: "FACT-STRING-VALUE-HINT",
        properties: {
          title: "String value hint",
          status: "active",
          fact_kind: "property_value",
          value: "enabled",
        },
      }),
    ).rejects.toThrow('value_type: "string" plus value_string: "enabled"');
  });

  test("explains generic object value fallback hint", async () => {
    await expect(
      handleKbUpsert(createMockProlog(), {
        type: "fact",
        id: "FACT-OBJECT-VALUE-HINT",
        properties: {
          title: "Object value hint",
          status: "active",
          fact_kind: "property_value",
          value: { enabled: true },
        },
      }),
    ).rejects.toThrow(
      "Use value_type plus exactly one of value_string, value_int, value_number, or value_bool",
    );
  });

  test("explains missing property_value fact fields", async () => {
    await expect(
      handleKbUpsert(createMockProlog(), {
        type: "fact",
        id: "FACT-INCOMPLETE-PROPERTY",
        properties: {
          title: "Incomplete property fact",
          status: "active",
          source: "test://fact",
          fact_kind: "property_value",
          subject_key: "voice_recording.draft",
        },
      }),
    ).rejects.toThrow(
      /property_value[\s\S]*property_key[\s\S]*operator[\s\S]*value_type[\s\S]*value_/,
    );
  });

  test("explains missing predicate fact fields", async () => {
    await expect(
      handleKbUpsert(createMockProlog(), {
        type: "fact",
        id: "FACT-INCOMPLETE-PREDICATE",
        properties: {
          title: "Incomplete predicate fact",
          status: "active",
          source: "test://fact",
          fact_kind: "predicate",
        },
      }),
    ).rejects.toThrow(
      /predicate[\s\S]*predicate_name[\s\S]*predicate_args[\s\S]*canonical_key[\s\S]*kb_suggest_predicates/,
    );
  });
});
