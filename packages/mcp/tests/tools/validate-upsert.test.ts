import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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
  test("rejects prose-heavy normative requirements without an inventory", async () => {
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

    expect(structured.valid).toBe(false);
    expect(structured.errors.join("\n")).toContain(
      "Proposition-complete ingestion failed",
    );
    expect(structured.errors.join("\n")).toContain("kb_model mode analyze");
    expect(structured.warnings).toEqual([]);
    expect(structured.semanticAdvisor).toBeNull();
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
        logic_claims: ["CLAIM-136CB26F246B9589"],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "text_ref",
        semantic_source_hash:
          "bcbbdff501d48af1663e0114c1d07798b21a83a983270125754f9c1773c4aa6d",
        semantic_inventory: [
          {
            claim_key: "CLAIM-136CB26F246B9589",
            claim_text: "Session timeout must equal 30 minutes",
            role: "normative",
            status: "modeled",
            span: { start: 0, end: 37 },
          },
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
      document: {
        body: "Session timeout must equal 30 minutes.\n\n## Context\n\nSecurity asked for a fixed timeout after an audit found idle sessions left open overnight on shared kiosks.\n",
      },
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

    test("refuses links added to a stored class-level symbol", async () => {
      const workspace = await fs.mkdtemp(
        path.join(tmpdir(), "kibi-mcp-coarse-link-"),
      );
      const previous = process.env.KIBI_WORKSPACE;
      process.env.KIBI_WORKSPACE = workspace;
      try {
        await fs.mkdir(path.join(workspace, "src"), { recursive: true });
        await fs.writeFile(
          path.join(workspace, "src", "canvas.ts"),
          "export class CanvasService {\n  draw() {}\n  clear() {}\n}\n",
        );
        await handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-CANVAS-DRAW",
          properties: {
            title: "Canvas draws shapes",
            status: "open",
            source: "test://validate-upsert/coarse",
          },
        });
        await handleKbUpsert(prolog, {
          type: "symbol",
          id: "SYM-CANVAS-SERVICE",
          properties: {
            title: "CanvasService",
            status: "active",
            source: "test://validate-upsert/coarse",
            sourceFile: "src/canvas.ts",
          },
        });
        // The payload names no sourceFile: the stored symbol supplies it.
        const linksOnly = {
          type: "symbol",
          id: "SYM-CANVAS-SERVICE",
          properties: { title: "CanvasService", status: "active" },
          relationships: [
            {
              type: "implements",
              from: "SYM-CANVAS-SERVICE",
              to: "REQ-CANVAS-DRAW",
            },
          ],
        };
        const preview = await handleKbValidateUpsert(prolog, linksOnly);
        expect(preview.structuredContent.valid).toBe(false);
        expect(preview.structuredContent.errors.join("\n")).toContain(
          "Symbol SYM-CANVAS-SERVICE links src/canvas.ts coarsely while granular symbols are available (behavioral only): CanvasService.clear, CanvasService.draw.",
        );
        await expect(handleKbUpsert(prolog, linksOnly)).rejects.toThrow(
          /links src\/canvas\.ts coarsely/,
        );
      } finally {
        if (previous === undefined)
          Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
        else process.env.KIBI_WORKSPACE = previous;
        await fs.rm(workspace, { recursive: true, force: true });
      }
    });
  });
});
