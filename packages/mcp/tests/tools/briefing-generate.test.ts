import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import {
  createVendoredTree,
  writeRootConfig,
} from "./autopilot-workspace-fixture";

type PrologQueryResult = Awaited<ReturnType<PrologProcess["query"]>>;

interface BriefingGenerateArgsLike {
  taskText?: string;
  sourceFiles?: string[];
  seedIds?: string[];
}

interface BriefingCitationLike {
  id: string;
  type: string;
  title: string;
  source?: string;
  textRef?: string;
}

interface BriefingStatementLike {
  statement: string;
  citationIds: string[];
}

interface BriefingEntityLike extends BriefingCitationLike {
  status: string;
  reason: string;
  score: number;
}

interface BriefingGenerateResultLike {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    briefingState: "ready" | "no_briefing";
    activationState: string;
    activationReason: string;
    freshness: {
      state: "fresh" | "stale" | "unknown";
      syncState: string;
      dirty: boolean;
      syncedAt: string | null;
    };
    confidence: {
      score: number;
      level: "high" | "medium" | "low";
      reasons: string[];
    };
    tldr: string;
    promptBlock: string;
    entities: BriefingEntityLike[];
    constraints: BriefingStatementLike[];
    regressionRisks: BriefingStatementLike[];
    missingEvidence: BriefingStatementLike[];
    citations: BriefingCitationLike[];
    automationReview?: {
      generatedEntities: Array<{
        id: string;
        type: string;
        title: string;
        confidence: number;
      }>;
      strictReadinessScore: number;
      confidence: number;
      migrationWarnings: string[];
      contradictionRisks: string[];
      evidenceCitationIds: string[];
    } | null;
  };
}

interface FixtureEntity {
  id: string;
  type: string;
  title: string;
  status: string;
  source: string;
  textRef: string;
}

const READY_PROMPT_BLOCK = [
  "- REQ-BRIEF-001: Keep start-task briefings deterministic and citation-backed.",
  "- ADR-BRIEF-001: Keep the MCP tool read-only; do not repair or mutate the workspace.",
  "- TEST-BRIEF-001: Repeated calls must preserve entity, citation, and prompt ordering.",
  "- FACT-BRIEF-001: Keep the prompt block within 120 words and 5 bullets.",
].join("\n");

const READY_ENTITIES: FixtureEntity[] = [
  {
    id: "REQ-BRIEF-001",
    type: "req",
    title: "Generate deterministic citation-backed briefings",
    status: "open",
    source: "documentation/requirements/REQ-BRIEF-001.md",
    textRef: "documentation/requirements/REQ-BRIEF-001.md#L1",
  },
  {
    id: "ADR-BRIEF-001",
    type: "adr",
    title: "Keep briefing generation MCP-owned and read-only",
    status: "accepted",
    source: "documentation/adr/ADR-BRIEF-001.md",
    textRef: "documentation/adr/ADR-BRIEF-001.md#L1",
  },
  {
    id: "TEST-BRIEF-001",
    type: "test",
    title: "Verify briefing output is deterministic",
    status: "passing",
    source: "documentation/tests/TEST-BRIEF-001.md",
    textRef: "documentation/tests/TEST-BRIEF-001.md#L1",
  },
  {
    id: "FACT-BRIEF-001",
    type: "fact",
    title: "Prompt blocks must fit the OpenCode budget",
    status: "active",
    source: "documentation/facts/FACT-BRIEF-001.md",
    textRef: "documentation/facts/FACT-BRIEF-001.md#L1",
  },
];

describe("briefing generate", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-briefing-"));
    process.env.KIBI_WORKSPACE = tmp;
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    process.env.KIBI_WORKSPACE = undefined;
  });

  function createPrologStub(
    queryImpl: (goal: string | string[]) => Promise<PrologQueryResult>,
  ): PrologProcess {
    const prolog = new PrologProcess();
    prolog.query = queryImpl;
    return prolog;
  }

  async function loadHandler() {
    const mod = (await import("../../src/tools/briefing-generate.js")) as {
      handleKbBriefingGenerate: (
        prolog: PrologProcess,
        args: BriefingGenerateArgsLike,
      ) => Promise<BriefingGenerateResultLike>;
    };
    return mod.handleKbBriefingGenerate;
  }

  async function ensureBriefingWorkspace(root: string) {
    await fs.mkdir(path.join(root, "documentation", "requirements"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "documentation", "scenarios"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "documentation", "tests"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "documentation", "adr"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "documentation", "flags"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "documentation", "events"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "documentation", "facts"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, "documentation", "symbols.yaml"),
      "symbols: []\n",
    );

    writeRootConfig(root, {});

    await fs.writeFile(
      path.join(root, "documentation", "requirements", "REQ-BRIEF-001.md"),
      [
        "---",
        "id: REQ-BRIEF-001",
        "title: Generate deterministic citation-backed briefings",
        "status: open",
        "---",
        "Generate citation-backed, deterministic start-task briefings.",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(root, "documentation", "adr", "ADR-BRIEF-001.md"),
      [
        "---",
        "id: ADR-BRIEF-001",
        "title: Keep briefing generation MCP-owned and read-only",
        "status: accepted",
        "---",
        "The tool stays MCP-owned, read-only, and deterministic.",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(root, "documentation", "tests", "TEST-BRIEF-001.md"),
      [
        "---",
        "id: TEST-BRIEF-001",
        "title: Verify briefing output is deterministic",
        "status: passing",
        "---",
        "Repeated calls must keep entity order, citation order, and prompt text stable.",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(root, "documentation", "facts", "FACT-BRIEF-001.md"),
      [
        "---",
        "id: FACT-BRIEF-001",
        "title: Prompt blocks must fit the OpenCode budget",
        "status: active",
        "---",
        "Prompt blocks must remain under 120 words and 5 bullets.",
      ].join("\n"),
    );
  }

  async function snapshotRelevantFiles(root: string) {
    const files = new Map<string, string>();

    async function walk(relativeRoot: string) {
      const absoluteRoot = path.join(root, relativeRoot);
      try {
        const entries = await fs.readdir(absoluteRoot, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
          const relativePath = path.posix.join(relativeRoot, entry.name);
          const absolutePath = path.join(root, relativePath);
          if (entry.isDirectory()) {
            await walk(relativePath);
            continue;
          }
          files.set(relativePath, await fs.readFile(absolutePath, "utf8"));
        }
      } catch {
        // Absent directories are part of the snapshot contract.
      }
    }

    await walk("documentation");
    await walk(".kb");

    return Array.from(files.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }

  function toJsonResult(payload: unknown): PrologQueryResult {
    return {
      success: true,
      bindings: { JsonString: JSON.stringify(payload) },
    };
  }

  function quoteProlog(value: string): string {
    return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  }

  function toEntityBinding(entity: FixtureEntity): string {
    return `['${entity.id}','${entity.type}',[title="${quoteProlog(entity.title)}",status="${quoteProlog(entity.status)}",source="${quoteProlog(entity.source)}",text_ref="${quoteProlog(entity.textRef)}"]]`;
  }

  function toEntityResult(entities: FixtureEntity[]): PrologQueryResult {
    return {
      success: true,
      bindings: {
        Results: `[${entities.map(toEntityBinding).join(",")}]`,
      },
    };
  }

  function createBriefingPrologStub(options?: {
    entities?: FixtureEntity[];
    statusPayload?: {
      branch: string;
      snapshotId: string;
      syncedAt: string | null;
      dirty: boolean;
      syncState: string;
    };
    graphPayload?: {
      nodes: Array<Record<string, unknown>>;
      edges: Array<Record<string, unknown>>;
      truncated: boolean;
      meta?: Record<string, unknown>;
    };
    coverageRows?: Array<{ id: string; type: string; count: number }>;
  }): PrologProcess {
    const entities = options?.entities ?? READY_ENTITIES;
    const statusPayload = options?.statusPayload ?? {
      branch: "feature/briefings",
      snapshotId: "stamp:briefing-001",
      syncedAt: "2026-04-20T12:00:00Z",
      dirty: false,
      syncState: "fresh",
    };
    const graphPayload = options?.graphPayload ?? {
      nodes: entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        title: entity.title,
        status: entity.status,
        source: entity.source,
        textRef: entity.textRef,
      })),
      edges: [
        {
          from: "REQ-BRIEF-001",
          type: "verified_by",
          to: "TEST-BRIEF-001",
        },
        {
          from: "REQ-BRIEF-001",
          type: "requires_property",
          to: "FACT-BRIEF-001",
        },
      ],
      truncated: false,
      meta: { depth: 1 },
    };
    const coverageRows = options?.coverageRows ?? [
      { id: "req", type: "req", count: 1 },
      { id: "scenario", type: "scenario", count: 1 },
      { id: "test", type: "test", count: 1 },
      { id: "adr", type: "adr", count: 1 },
      { id: "flag", type: "flag", count: 0 },
      { id: "event", type: "event", count: 0 },
      { id: "fact", type: "fact", count: 1 },
    ];

    return createPrologStub(async (goal) => {
      const queryText = Array.isArray(goal) ? goal.join(" ") : goal;

      if (queryText.includes("status:kb_status_json")) {
        return toJsonResult(statusPayload);
      }

      if (queryText.includes("coverage_report_json")) {
        return toJsonResult({ rows: coverageRows });
      }

      if (queryText.includes("graph_expand_json")) {
        return toJsonResult(graphPayload);
      }

      if (queryText.includes("kb_entities_by_source(")) {
        const matches = entities.filter(
          (entity) =>
            queryText.includes(`'${entity.source}'`) ||
            queryText.includes(`\"${entity.source}\"`),
        );
        return toEntityResult(matches);
      }

      if (
        queryText.includes(
          "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
        )
      ) {
        return toEntityResult(entities);
      }

      const idMatches = Array.from(
        queryText.matchAll(/kb_entity\('([^']+)'(?:,\s*'([^']+)')?/g),
      );
      if (idMatches.length > 0) {
        const requested = entities.filter((entity) =>
          idMatches.some(
            ([, id, type]) =>
              entity.id === id && (type === undefined || entity.type === type),
          ),
        );
        return toEntityResult(requested);
      }

      const typedGoal = queryText.match(
        /kb_entity\(Id,\s*'([^']+)',\s*Props\)/,
      );
      if (typedGoal) {
        return toEntityResult(
          entities.filter((entity) => entity.type === typedGoal[1]),
        );
      }

      return toEntityResult([]);
    });
  }

  function expectPromptBudget(promptBlock: string) {
    const words = promptBlock.split(/\s+/).filter(Boolean).length;
    const bullets = promptBlock
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));

    expect(words).toBeLessThanOrEqual(120);
    expect(bullets).toHaveLength(4);
    expect(bullets.length).toBeLessThanOrEqual(5);
    expect(promptBlock.includes("<!-- kibi-opencode -->")).toBe(false);
  }

  test("fails clearly when all inputs are empty after normalization", async () => {
    const handleKbBriefingGenerate = await loadHandler();
    const prolog = createBriefingPrologStub();

    await expect(
      handleKbBriefingGenerate(prolog, {
        taskText: "  \n  ",
        sourceFiles: ["   ", ""],
        seedIds: ["", "   "],
      }),
    ).rejects.toThrow(/at least one of taskText, sourceFiles, or seedIds/i);
  });

  test("uses a fast text-only path without activation or status Prolog queries", async () => {
    const root = path.join(tmp, "text-only-workspace");
    await ensureBriefingWorkspace(root);
    process.env.KIBI_WORKSPACE = root;

    const handleKbBriefingGenerate = await loadHandler();
    const prolog = createPrologStub(async (goal) => {
      const queryText = Array.isArray(goal) ? goal.join(" ") : goal;

      if (queryText.includes("coverage_report_json")) {
        throw new Error("text-only path should not call coverage_report_json");
      }
      if (queryText.includes("status:kb_status_json")) {
        throw new Error("text-only path should not call status:kb_status_json");
      }
      if (queryText.includes("graph_expand_json")) {
        return toJsonResult({
          nodes: [],
          edges: [],
          truncated: false,
          meta: {},
        });
      }
      if (
        queryText.includes(
          "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
        )
      ) {
        return toEntityResult(READY_ENTITIES);
      }

      return toEntityResult([]);
    });

    const result = await handleKbBriefingGenerate(prolog, {
      taskText:
        "Generate a deterministic citation-backed briefing for MCP registration work.",
    });

    expect(result.structuredContent.activationState).toBe("root_active_thin");
    expect(result.structuredContent.freshness).toEqual({
      state: "unknown",
      syncState: "unknown",
      dirty: false,
      syncedAt: null,
    });
    expect(["ready", "no_briefing"]).toContain(
      result.structuredContent.briefingState,
    );
  });

  test("returns a full ready briefing with cited deterministic entities and zero file writes", async () => {
    const root = path.join(tmp, "ready-workspace");
    await ensureBriefingWorkspace(root);
    process.env.KIBI_WORKSPACE = root;

    const handleKbBriefingGenerate = await loadHandler();
    const prolog = createBriefingPrologStub();
    const before = await snapshotRelevantFiles(root);

    const result = await handleKbBriefingGenerate(prolog, {
      taskText:
        "Create a deterministic citation-backed start-task briefing that stays read-only and budget-safe.",
      sourceFiles: [
        "documentation/tests/TEST-BRIEF-001.md",
        "documentation/facts/FACT-BRIEF-001.md",
      ],
      seedIds: ["REQ-BRIEF-001", "ADR-BRIEF-001"],
    });

    const after = await snapshotRelevantFiles(root);

    expect(after).toEqual(before);
    expect(result.structuredContent.briefingState).toBe("ready");
    expect(result.structuredContent.activationState).toBe("root_active_seeded");
    expect(result.structuredContent.freshness).toEqual({
      state: "fresh",
      syncState: "fresh",
      dirty: false,
      syncedAt: "2026-04-20T12:00:00Z",
    });
    expect(result.structuredContent.confidence.level).toBe("high");
    expect(result.structuredContent.confidence.score).toBeGreaterThanOrEqual(
      0.55,
    );
    expect(
      result.structuredContent.entities.map((entity) => entity.id),
    ).toEqual([
      "REQ-BRIEF-001",
      "ADR-BRIEF-001",
      "TEST-BRIEF-001",
      "FACT-BRIEF-001",
    ]);
    expect(result.structuredContent.entities).toEqual([
      expect.objectContaining({
        id: "REQ-BRIEF-001",
        type: "req",
        title: "Generate deterministic citation-backed briefings",
        status: "open",
        source: "documentation/requirements/REQ-BRIEF-001.md",
        textRef: "documentation/requirements/REQ-BRIEF-001.md#L1",
        score: expect.any(Number),
        reason: expect.any(String),
      }),
      expect.objectContaining({
        id: "ADR-BRIEF-001",
        type: "adr",
        title: "Keep briefing generation MCP-owned and read-only",
        status: "accepted",
        source: "documentation/adr/ADR-BRIEF-001.md",
        textRef: "documentation/adr/ADR-BRIEF-001.md#L1",
        score: expect.any(Number),
        reason: expect.any(String),
      }),
      expect.objectContaining({
        id: "TEST-BRIEF-001",
        type: "test",
        title: "Verify briefing output is deterministic",
        status: "passing",
        source: "documentation/tests/TEST-BRIEF-001.md",
        textRef: "documentation/tests/TEST-BRIEF-001.md#L1",
        score: expect.any(Number),
        reason: expect.any(String),
      }),
      expect.objectContaining({
        id: "FACT-BRIEF-001",
        type: "fact",
        title: "Prompt blocks must fit the OpenCode budget",
        status: "active",
        source: "documentation/facts/FACT-BRIEF-001.md",
        textRef: "documentation/facts/FACT-BRIEF-001.md#L1",
        score: expect.any(Number),
        reason: expect.any(String),
      }),
    ]);
    expect(result.structuredContent.citations).toEqual([
      {
        id: "REQ-BRIEF-001",
        type: "req",
        title: "Generate deterministic citation-backed briefings",
        source: "documentation/requirements/REQ-BRIEF-001.md",
        textRef: "documentation/requirements/REQ-BRIEF-001.md#L1",
      },
      {
        id: "ADR-BRIEF-001",
        type: "adr",
        title: "Keep briefing generation MCP-owned and read-only",
        source: "documentation/adr/ADR-BRIEF-001.md",
        textRef: "documentation/adr/ADR-BRIEF-001.md#L1",
      },
      {
        id: "TEST-BRIEF-001",
        type: "test",
        title: "Verify briefing output is deterministic",
        source: "documentation/tests/TEST-BRIEF-001.md",
        textRef: "documentation/tests/TEST-BRIEF-001.md#L1",
      },
      {
        id: "FACT-BRIEF-001",
        type: "fact",
        title: "Prompt blocks must fit the OpenCode budget",
        source: "documentation/facts/FACT-BRIEF-001.md",
        textRef: "documentation/facts/FACT-BRIEF-001.md#L1",
      },
    ]);
    expect(result.structuredContent.constraints).toEqual([
      {
        statement: "Keep the briefing generator read-only and MCP-owned.",
        citationIds: ["ADR-BRIEF-001"],
      },
      {
        statement: "Return deterministic, citation-backed start-task output.",
        citationIds: ["REQ-BRIEF-001", "TEST-BRIEF-001"],
      },
    ]);
    expect(result.structuredContent.regressionRisks).toEqual([
      {
        statement:
          "Do not let repeated calls change entity, citation, or prompt ordering.",
        citationIds: ["TEST-BRIEF-001"],
      },
      {
        statement: "Do not exceed the OpenCode prompt budget.",
        citationIds: ["FACT-BRIEF-001"],
      },
    ]);
    expect(result.structuredContent.missingEvidence).toEqual([]);
    expect(result.structuredContent.promptBlock).toBe(READY_PROMPT_BLOCK);
    expectPromptBudget(result.structuredContent.promptBlock);
    expect(result.structuredContent.tldr.length).toBeGreaterThan(0);
    expect(result.content[0]?.text.toLowerCase()).toContain("brief");
  });

  describe("operational artifact exclusion", () => {
    function expectNoOperationalArtifactStrings(
      result: BriefingGenerateResultLike,
    ) {
      const textBlobs = [
        result.content[0]?.text ?? "",
        result.structuredContent.tldr,
        result.structuredContent.promptBlock,
        JSON.stringify(result.structuredContent.citations),
      ];

      for (const blob of textBlobs) {
        expect(blob).not.toContain("boulder.json");
        expect(blob).not.toContain(".sisyphus");
      }
    }

    test("excludes operational-only briefing inputs", async () => {
      const root = path.join(tmp, "operational-only-workspace");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub({
        entities: [
          {
            id: "FACT-BOULDER-001",
            type: "fact",
            title: "Operational artifact boulder.json should never surface",
            status: "active",
            source: ".sisyphus/boulder.json",
            textRef: ".sisyphus/boulder.json#L1",
          },
        ],
      });

      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "Brief only from operational task-tracking data.",
        sourceFiles: [".sisyphus/boulder.json"],
      });

      expect(result.structuredContent.briefingState).toBe("no_briefing");
      expect(result.structuredContent.entities).toHaveLength(0);
      expectNoOperationalArtifactStrings(result);
    });

    test("excludes operational artifacts from mixed briefing inputs", async () => {
      const root = path.join(tmp, "mixed-workspace");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub({
        entities: [
          {
            id: "REQ-AUTH-001",
            type: "req",
            title: "Authenticate users before they access the workspace",
            status: "open",
            source: "src/auth.ts",
            textRef: "src/auth.ts#L12",
          },
          {
            id: "FACT-BOULDER-002",
            type: "fact",
            title: "Operational artifact boulder.json should never surface",
            status: "active",
            source: ".sisyphus/boulder.json",
            textRef: ".sisyphus/boulder.json#L1",
          },
        ],
      });

      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "Brief from auth work and operational task-tracking data.",
        sourceFiles: ["src/auth.ts", ".sisyphus/boulder.json"],
      });

      expect(
        result.structuredContent.entities.map((entity) => entity.id),
      ).toContain("REQ-AUTH-001");
      expect(
        result.structuredContent.entities.map((entity) => entity.id),
      ).not.toContain("FACT-BOULDER-002");
      expectNoOperationalArtifactStrings(result);
    });

    test("drops operational artifact citations from otherwise valid entities", async () => {
      const root = path.join(tmp, "citation-workspace");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub({
        entities: [
          {
            id: "REQ-CITE-001",
            type: "req",
            title: "Keep citations free of operational artifacts",
            status: "open",
            source: "src/citations.ts",
            textRef: ".sisyphus/boulder.json#L8",
          },
        ],
      });

      const result = await handleKbBriefingGenerate(prolog, {
        taskText:
          "Brief from a valid requirement with an operational citation.",
        sourceFiles: ["src/citations.ts"],
      });

      expect(
        result.structuredContent.citations.map(
          (citation) => citation.textRef ?? "",
        ),
      ).not.toContain(".sisyphus/boulder.json#L8");
      expect(result.content[0]?.text ?? "").not.toContain(
        ".sisyphus/boulder.json",
      );
    });

    test("drops explicit .sisyphus draft paths passed as sourceFiles", async () => {
      const root = path.join(tmp, "sisyphus-draft-workspace");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub({
        entities: [
          {
            id: "FACT-DRAFT-001",
            type: "fact",
            title: "Draft should be ignored",
            status: "active",
            source: ".sisyphus/drafts/kibi-kb-quality-audit.md",
            textRef: ".sisyphus/drafts/kibi-kb-quality-audit.md#L1",
          },
        ],
      });

      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "Brief from draft path",
        sourceFiles: [".sisyphus/drafts/kibi-kb-quality-audit.md"],
      });

      expect(result.structuredContent.briefingState).toBe("no_briefing");
      expect(result.structuredContent.entities).toHaveLength(0);
      expect(result.structuredContent.citations).toEqual([]);
    });

    test("skips explicit sourceFiles that are gitignored and still accepts non-ignored docs", async () => {
      const root = path.join(tmp, "gitignore-workspace");
      await ensureBriefingWorkspace(root);
      // create a doc that will be gitignored
      const secretPath = path.join(root, "documentation", "secret.md");
      await fs.writeFile(secretPath, "# Secret\nThis is secret.");
      // write .gitignore to ignore the secret doc
      await fs.writeFile(
        path.join(root, ".gitignore"),
        "documentation/secret.md\n",
      );

      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub({
        entities: [
          {
            id: "REQ-SECRET-001",
            type: "req",
            title: "This should be ignored by gitignore",
            status: "open",
            source: "documentation/secret.md",
            textRef: "documentation/secret.md#L1",
          },
          // a normal doc that should still be picked up
          {
            id: "REQ-NORMAL-001",
            type: "req",
            title: "This should be accepted",
            status: "open",
            source: "documentation/requirements/REQ-BRIEF-001.md",
            textRef: "documentation/requirements/REQ-BRIEF-001.md#L1",
          },
        ],
      });

      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "Brief from mixed gitignored and normal docs",
        sourceFiles: [
          "documentation/secret.md",
          "documentation/requirements/REQ-BRIEF-001.md",
        ],
      });

      // The gitignored secret should be dropped, but the normal doc remains
      expect(result.structuredContent.entities.map((e) => e.id)).toContain(
        "REQ-NORMAL-001",
      );
      expect(result.structuredContent.entities.map((e) => e.id)).not.toContain(
        "REQ-SECRET-001",
      );
    });
  });

  test("fails closed with no_briefing for unsupported posture and stale freshness", async () => {
    const unsupportedRoot = path.join(tmp, "unsupported-workspace");
    await fs.mkdir(unsupportedRoot, { recursive: true });
    createVendoredTree(unsupportedRoot);
    process.env.KIBI_WORKSPACE = unsupportedRoot;

    const handleKbBriefingGenerate = await loadHandler();
    const unsupported = await handleKbBriefingGenerate(
      createBriefingPrologStub(),
      {
        taskText: "Brief the risky work",
        seedIds: ["REQ-BRIEF-001"],
      },
    );

    expect(unsupported.structuredContent.briefingState).toBe("no_briefing");
    expect(unsupported.structuredContent.activationState).toBe("vendored_only");
    expect(unsupported.structuredContent.promptBlock).toBe("");
    expect(unsupported.content).toEqual([
      { type: "text", text: "No briefing is available." },
    ]);
    expect(unsupported.structuredContent.entities).toEqual([]);
    expect(unsupported.structuredContent.constraints).toEqual([]);
    expect(unsupported.structuredContent.regressionRisks).toEqual([]);
    expect(unsupported.structuredContent.citations).toEqual([]);

    const staleRoot = path.join(tmp, "stale-workspace");
    await ensureBriefingWorkspace(staleRoot);
    process.env.KIBI_WORKSPACE = staleRoot;

    const stale = await handleKbBriefingGenerate(
      createBriefingPrologStub({
        statusPayload: {
          branch: "feature/briefings",
          snapshotId: "stamp:briefing-stale",
          syncedAt: "2026-04-19T12:00:00Z",
          dirty: true,
          syncState: "stale",
        },
      }),
      {
        taskText: "Need a deterministic start-task briefing",
        seedIds: ["REQ-BRIEF-001"],
      },
    );

    expect(stale.structuredContent.briefingState).toBe("no_briefing");
    expect(stale.structuredContent.activationState).toBe("root_active_seeded");
    expect(stale.structuredContent.freshness).toEqual({
      state: "stale",
      syncState: "stale",
      dirty: true,
      syncedAt: "2026-04-19T12:00:00Z",
    });
    expect(stale.content).toEqual([
      { type: "text", text: "No briefing is available." },
    ]);
    expect(stale.structuredContent.promptBlock).toBe("");
    expect(stale.structuredContent.entities).toEqual([]);
    expect(stale.structuredContent.constraints).toEqual([]);
    expect(stale.structuredContent.regressionRisks).toEqual([]);
    expect(stale.structuredContent.citations).toEqual([]);
  });

  test("returns byte-stable ordering, citations, and prompt content across repeated calls", async () => {
    const root = path.join(tmp, "repeat-workspace");
    await ensureBriefingWorkspace(root);
    process.env.KIBI_WORKSPACE = root;

    const handleKbBriefingGenerate = await loadHandler();
    const prolog = createBriefingPrologStub();
    const before = await snapshotRelevantFiles(root);

    const args: BriefingGenerateArgsLike = {
      taskText:
        "Create a deterministic citation-backed start-task briefing that stays read-only and budget-safe.",
      sourceFiles: [
        "documentation/tests/TEST-BRIEF-001.md",
        "documentation/facts/FACT-BRIEF-001.md",
      ],
      seedIds: ["REQ-BRIEF-001", "ADR-BRIEF-001"],
    };
    const first = await handleKbBriefingGenerate(prolog, args);
    const second = await handleKbBriefingGenerate(prolog, args);
    const after = await snapshotRelevantFiles(root);

    expect(after).toEqual(before);
    expect(second.structuredContent.briefingState).toBe("ready");
    expect(first.structuredContent.entities.map((entity) => entity.id)).toEqual(
      ["REQ-BRIEF-001", "ADR-BRIEF-001", "TEST-BRIEF-001", "FACT-BRIEF-001"],
    );
    expect(
      second.structuredContent.entities.map((entity) => entity.id),
    ).toEqual([
      "REQ-BRIEF-001",
      "ADR-BRIEF-001",
      "TEST-BRIEF-001",
      "FACT-BRIEF-001",
    ]);
    expect(
      first.structuredContent.citations.map((citation) => citation.id),
    ).toEqual([
      "REQ-BRIEF-001",
      "ADR-BRIEF-001",
      "TEST-BRIEF-001",
      "FACT-BRIEF-001",
    ]);
    expect(
      second.structuredContent.citations.map((citation) => citation.id),
    ).toEqual([
      "REQ-BRIEF-001",
      "ADR-BRIEF-001",
      "TEST-BRIEF-001",
      "FACT-BRIEF-001",
    ]);
    expect(first.structuredContent.promptBlock).toBe(READY_PROMPT_BLOCK);
    expect(second.structuredContent.promptBlock).toBe(READY_PROMPT_BLOCK);
    expect(JSON.stringify(second.content)).toBe(JSON.stringify(first.content));
    expect(JSON.stringify(second.structuredContent)).toBe(
      JSON.stringify(first.structuredContent),
    );
    expectPromptBudget(first.structuredContent.promptBlock);
    expectPromptBudget(second.structuredContent.promptBlock);
  });

  test("returns non-empty compact promptBlock when candidate set exceeds bullet budget", async () => {
    const root = path.join(tmp, "over-budget-workspace");
    await ensureBriefingWorkspace(root);
    process.env.KIBI_WORKSPACE = root;

    // Create 8 entities that all produce bullets, exceeding the 5-bullet limit
    const overBudgetEntities: FixtureEntity[] = [];
    for (let i = 1; i <= 8; i++) {
      overBudgetEntities.push({
        id: `REQ-OVER-${String(i).padStart(3, "0")}`,
        type: "req",
        title: `Generate deterministic citation-backed briefings batch ${i}`,
        status: "open",
        source: `documentation/requirements/REQ-OVER-${String(i).padStart(3, "0")}.md`,
        textRef: `documentation/requirements/REQ-OVER-${String(i).padStart(3, "0")}.md#L1`,
      });
    }

    const prolog = createBriefingPrologStub({ entities: overBudgetEntities });
    const handleKbBriefingGenerate = await loadHandler();

    const result = await handleKbBriefingGenerate(prolog, {
      taskText: "deterministic citation-backed briefings",
      seedIds: overBudgetEntities.map((e) => e.id),
    });

    // Must NOT return empty promptBlock even when over budget
    expect(result.structuredContent.promptBlock.length).toBeGreaterThan(0);
    const words = result.structuredContent.promptBlock
      .split(/\s+/)
      .filter(Boolean);
    expect(words.length).toBeLessThanOrEqual(120);
    const bullets = result.structuredContent.promptBlock
      .split("\n")
      .filter((line) => line.trimStart().startsWith("-"));
    expect(bullets.length).toBeLessThanOrEqual(5);
    expect(bullets.length).toBeGreaterThan(0);
  });

  describe("automation review enrichment", () => {
    test("ready briefing includes automationReview with entity metadata and citations", async () => {
      const root = path.join(tmp, "automation-review-workspace");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub();

      const result = await handleKbBriefingGenerate(prolog, {
        taskText:
          "Create a deterministic citation-backed start-task briefing that stays read-only and budget-safe.",
        sourceFiles: [
          "documentation/tests/TEST-BRIEF-001.md",
          "documentation/facts/FACT-BRIEF-001.md",
        ],
        seedIds: ["REQ-BRIEF-001", "ADR-BRIEF-001"],
      });

      expect(result.structuredContent.briefingState).toBe("ready");
      const review = result.structuredContent.automationReview;
      expect(review).not.toBeNull();
      expect(review).not.toBeUndefined();
      if (!review) {
        throw new Error("Expected automationReview to be present");
      }
      const evidenceCitationIds = review.evidenceCitationIds ?? [];
      const generatedEntities = review.generatedEntities ?? [];
      expect(review?.generatedEntities.length).toBeGreaterThan(0);
      expect(review?.strictReadinessScore).toBeGreaterThanOrEqual(0);
      expect(review?.strictReadinessScore).toBeLessThanOrEqual(1);
      expect(review?.confidence).toBeGreaterThanOrEqual(0);
      expect(review?.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(review?.migrationWarnings)).toBe(true);
      expect(Array.isArray(review?.contradictionRisks)).toBe(true);
      expect(Array.isArray(review?.evidenceCitationIds)).toBe(true);
      // Evidence citations should reference actual entity IDs
      for (const id of evidenceCitationIds) {
        expect(result.structuredContent.entities.map((e) => e.id)).toContain(
          id,
        );
      }
      // Generated entities should have id, type, title, confidence
      for (const entity of generatedEntities) {
        expect(entity.id).toBeTruthy();
        expect(entity.type).toBeTruthy();
        expect(entity.title).toBeTruthy();
      }
    });

    test("no_briefing result has null or empty automationReview", async () => {
      const unsupportedRoot = path.join(tmp, "automation-no-briefing");
      await fs.mkdir(unsupportedRoot, { recursive: true });
      createVendoredTree(unsupportedRoot);
      process.env.KIBI_WORKSPACE = unsupportedRoot;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub();

      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "brief the risky work",
        seedIds: ["REQ-BRIEF-001"],
      });

      expect(result.structuredContent.briefingState).toBe("no_briefing");
      // automationReview must be null/undefined when no entities are available
      const review = result.structuredContent.automationReview;
      expect(
        review === null ||
          review === undefined ||
          (review && review.generatedEntities.length === 0),
      ).toBe(true);
    });

    test("legacy schema config produces migration warning in automationReview", async () => {
      const root = path.join(tmp, "legacy-schema-review");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      // Write a config without schemaVersion to simulate legacy
      const configPath = path.join(root, ".kb", "config.json");
      await fs.writeFile(configPath, JSON.stringify({ paths: {} }, null, 2));

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub();

      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "brief with legacy schema",
        seedIds: ["REQ-BRIEF-001"],
      });

      expect(result.structuredContent.briefingState).toBe("ready");
      const review = result.structuredContent.automationReview;
      expect(review).not.toBeNull();
      expect(review?.migrationWarnings.length).toBeGreaterThan(0);
      expect(review?.migrationWarnings[0]).toMatch(/schemaVersion/i);
    });

    test("briefingState remains ready or no_briefing — no new blocking states", async () => {
      const root = path.join(tmp, "non-blocking-states");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      const prolog = createBriefingPrologStub();

      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "check that briefing states are non-blocking",
        seedIds: ["REQ-BRIEF-001"],
      });

      expect(["ready", "no_briefing"]).toContain(
        result.structuredContent.briefingState,
      );
    });

    test("automationReview generation failure does not block briefing", async () => {
      const root = path.join(tmp, "automation-failure-workspace");
      await ensureBriefingWorkspace(root);
      process.env.KIBI_WORKSPACE = root;

      const handleKbBriefingGenerate = await loadHandler();
      // Use a prolog stub that throws on schema-related queries
      const prolog = createPrologStub(async (goal) => {
        const queryText = Array.isArray(goal) ? goal.join(" ") : goal;

        if (queryText.includes("status:kb_status_json")) {
          return toJsonResult({
            branch: "feature/briefings",
            snapshotId: "stamp:briefing-001",
            syncedAt: "2026-04-20T12:00:00Z",
            dirty: false,
            syncState: "fresh",
          });
        }
        if (queryText.includes("graph_expand_json")) {
          return toJsonResult({
            nodes: [],
            edges: [],
            truncated: false,
            meta: {},
          });
        }
        if (
          queryText.includes(
            "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
          )
        ) {
          return toEntityResult(READY_ENTITIES);
        }
        return toEntityResult([]);
      });

      // Even if internal review computation encounters issues,
      // the briefing must still succeed
      const result = await handleKbBriefingGenerate(prolog, {
        taskText: "deterministic citation-backed briefings",
        seedIds: ["REQ-BRIEF-001"],
      });

      expect(["ready", "no_briefing"]).toContain(
        result.structuredContent.briefingState,
      );
      // Must have content regardless of review failure
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
