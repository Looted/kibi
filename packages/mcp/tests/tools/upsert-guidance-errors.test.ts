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
  test("explains how to fix Align-style camelCase strict fact fields", async () => {
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
