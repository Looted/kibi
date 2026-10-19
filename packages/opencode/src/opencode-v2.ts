/**
 * OpenCode v2 plugin API bridge.
 *
 * OpenCode v2 loads a plugin module only when its default export is a
 * definition object shaped `{ id, setup }` (or `{ id, effect }`). `setup`
 * receives a domain-based `Context` and returns an optional cleanup function;
 * it no longer receives the v1 `PluginInput` nor returns a `Hooks` object.
 *
 * OpenCode v1 (>= 1.4) loads `{ id, server }` definitions. This module builds
 * a single definition object that satisfies both loaders: v1 calls `server`
 * with the legacy input, v2 calls `setup` with the domain context. The v2 path
 * re-synthesizes the legacy `PluginInput` from the context, runs the existing
 * v1 plugin to obtain its hooks, and registers each hook on the matching v2
 * domain.
 *
 * Hook mapping:
 * - `experimental.chat.system.transform` -> `session.hook("context")`
 * - `tool.execute.after`                 -> `tool.hook("execute.after")`
 * - `event` (tool + file lifecycle)      -> `tool.hook("execute.after")`
 *   (v2 publishes no `file.*` bus events, so file lifecycle events are derived
 *   from completed `edit`, `write`, and `patch` tool calls)
 * - `config` (bootstrap command)         -> `command.transform(editor.add)`
 * - `chat.params`                        -> dropped (the v1 hook only logs)
 *
 * Toasts and `client.app.log` have no v2 Context equivalent; the plugin already
 * treats a missing `client` as "no UI/log transport" and degrades to its local
 * logger without toasts.
 *
 * The v2 types below are deliberately structural and minimal so the package
 * does not need a dependency on the v2 plugin SDK.
 */
// implements REQ-opencode-v2-plugin-api
import path from "node:path";
import type { Hooks, Plugin, PluginInput } from "./plugin.js";

export const KIBI_OPENCODE_PLUGIN_ID = "kibi-opencode";

export interface V2Registration {
  readonly dispose: () => Promise<void> | void;
}

export interface V2SystemPart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface V2SessionContextHookInput {
  readonly sessionID: string;
  readonly agent?: string;
  system: V2SystemPart[];
  [key: string]: unknown;
}

export type V2ToolExecuteAfterInput = {
  readonly tool: string;
  readonly sessionID: string;
  readonly agent?: string;
  readonly messageID?: string;
  readonly id?: string;
  readonly input: unknown;
} & (
  | { readonly status: "completed"; result?: unknown }
  | { readonly status: "error"; error?: unknown }
);

export interface V2CommandInvocation {
  readonly sessionID: string;
  readonly delivery?: unknown;
  readonly prompt?: unknown;
}

export interface V2CommandDefinition {
  readonly name: string;
  readonly description?: string;
  readonly execute: (input: V2CommandInvocation) => Promise<void>;
}

export interface V2CommandEditor {
  add(definition: V2CommandDefinition): void;
}

/** Subset of the OpenCode v2 plugin `Context` used by kibi-opencode. */
export interface V2PluginContext {
  readonly location: {
    readonly directory: string;
    readonly project?: { readonly directory?: string };
  };
  readonly session?: {
    hook(
      name: "context",
      callback: (input: V2SessionContextHookInput) => Promise<void> | void,
    ): Promise<V2Registration>;
    prompt?(input: {
      sessionID: string;
      text: string;
      delivery?: unknown;
    }): Promise<unknown>;
  };
  readonly tool?: {
    hook(
      name: "execute.after",
      callback: (input: V2ToolExecuteAfterInput) => Promise<void> | void,
    ): Promise<V2Registration>;
  };
  readonly command?: {
    transform(
      callback: (editor: V2CommandEditor) => void,
    ): Promise<V2Registration>;
  };
}

export type V2Cleanup = () => Promise<void> | void;

export interface KibiOpencodePluginDefinition {
  readonly id: string;
  /** OpenCode v1 entrypoint (`{ id, server }` definition). */
  readonly server: Plugin;
  /** OpenCode v2 entrypoint (`{ id, setup }` definition). */
  readonly setup: (context: V2PluginContext) => Promise<V2Cleanup>;
}

type FileLifecycleEventType = "file.created" | "file.edited" | "file.deleted";

type LegacyEvent = { type: string; properties: Record<string, unknown> };

/** Builds the legacy v1 `PluginInput` from a v2 domain context. */
export function legacyInputFromV2Context(
  context: V2PluginContext,
): PluginInput {
  const directory = context.location.directory;
  const worktree = context.location.project?.directory ?? directory;
  return { worktree, directory };
}

function stringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.length > 0 ? field : undefined;
}

const PATCH_MARKERS: ReadonlyArray<readonly [string, FileLifecycleEventType]> =
  [
    ["*** Add File: ", "file.created"],
    ["*** Update File: ", "file.edited"],
    ["*** Delete File: ", "file.deleted"],
    ["*** Move to: ", "file.created"],
  ];

/** Extracts file lifecycle operations from an OpenCode `patch` tool body. */
export function extractPatchFileOperations(
  patchText: string,
): Array<{ type: FileLifecycleEventType; file: string }> {
  const operations: Array<{ type: FileLifecycleEventType; file: string }> = [];
  for (const rawLine of patchText.split(/\r?\n/)) {
    const line = rawLine.trim();
    for (const [marker, type] of PATCH_MARKERS) {
      if (line.startsWith(marker)) {
        const file = line.slice(marker.length).trim();
        if (file) operations.push({ type, file });
        break;
      }
    }
  }
  return operations;
}

/**
 * Translates a v2 `tool.execute.after` hook payload into the legacy bus events
 * the v1 `event` hook understands.
 */
export function legacyEventsFromToolExecution(
  input: V2ToolExecuteAfterInput,
  directory: string,
): LegacyEvent[] {
  const events: LegacyEvent[] = [
    {
      type: "tool.execute.after",
      properties: {
        tool: input.tool,
        sessionID: input.sessionID,
        ...(input.id !== undefined ? { callID: input.id } : {}),
        status: input.status,
      },
    },
  ];
  if (input.status !== "completed") return events;

  const resolve = (file: string) =>
    path.isAbsolute(file) ? file : path.resolve(directory, file);

  if (input.tool === "edit" || input.tool === "write") {
    const file =
      stringField(input.input, "path") ?? stringField(input.input, "filePath");
    if (file) {
      events.push({ type: "file.edited", properties: { file: resolve(file) } });
    }
  } else if (input.tool === "patch" || input.tool === "apply_patch") {
    const patchText = stringField(input.input, "patchText");
    if (patchText) {
      for (const op of extractPatchFileOperations(patchText)) {
        events.push({ type: op.type, properties: { file: resolve(op.file) } });
      }
    }
  }
  return events;
}

function systemText(parts: readonly V2SystemPart[]): string[] {
  return parts.map((part) => (typeof part.text === "string" ? part.text : ""));
}

async function registerSystemTransform(
  context: V2PluginContext,
  hook: NonNullable<Hooks["experimental.chat.system.transform"]>,
): Promise<V2Registration | undefined> {
  if (!context.session) return undefined;
  return context.session.hook("context", async (request) => {
    const existing = systemText(request.system);
    const output = { system: [...existing] };
    await hook({}, output);
    for (const text of output.system.slice(existing.length)) {
      if (typeof text === "string" && text.length > 0) {
        request.system.push({ type: "text", text });
      }
    }
  });
}

/** Legacy v1 `tool.execute.after` output synthesized from a v2 payload. */
export function legacyToolOutput(
  input: V2ToolExecuteAfterInput,
): Record<string, unknown> {
  return input.status === "completed"
    ? { status: "completed", result: input.result }
    : { status: "error", error: input.error };
}

async function registerToolBridge(
  context: V2PluginContext,
  hooks: Pick<Hooks, "event" | "tool.execute.after">,
  directory: string,
): Promise<V2Registration | undefined> {
  if (!context.tool) return undefined;
  const eventHook = hooks.event;
  const afterHook = hooks["tool.execute.after"];
  return context.tool.hook("execute.after", async (execution) => {
    if (afterHook) {
      await afterHook(
        {
          tool: execution.tool,
          sessionID: execution.sessionID,
          args: execution.input,
        },
        legacyToolOutput(execution),
      );
    }
    if (eventHook) {
      for (const event of legacyEventsFromToolExecution(execution, directory)) {
        await eventHook({ event } as unknown as Parameters<
          typeof eventHook
        >[0]);
      }
    }
  });
}

type LegacyCommandEntry = { template?: unknown; description?: unknown };

async function registerCommands(
  context: V2PluginContext,
  hook: NonNullable<Hooks["config"]>,
): Promise<V2Registration | undefined> {
  if (!context.command) return undefined;
  const scratch: { command: Record<string, LegacyCommandEntry> } = {
    command: {},
  };
  await hook(scratch as unknown as Parameters<typeof hook>[0]);
  const entries: Array<[string, string, string | undefined]> = [];
  for (const [name, entry] of Object.entries(scratch.command)) {
    if (typeof entry?.template !== "string") continue;
    const description =
      typeof entry.description === "string" ? entry.description : undefined;
    entries.push([name, entry.template, description]);
  }
  if (entries.length === 0) return undefined;
  const session = context.session;
  return context.command.transform((editor) => {
    for (const [name, template, description] of entries) {
      editor.add({
        name,
        ...(description !== undefined ? { description } : {}),
        execute: async (invocation) => {
          if (!session?.prompt) return;
          await session.prompt({
            sessionID: invocation.sessionID,
            text: template,
            ...(invocation.delivery !== undefined
              ? { delivery: invocation.delivery }
              : {}),
          });
        },
      });
    }
  });
}

/**
 * Creates the OpenCode v2 `setup` function for a v1-style plugin.
 * A registration failure on one domain does not prevent the others.
 */
export function createV2Setup(
  plugin: Plugin,
): (context: V2PluginContext) => Promise<V2Cleanup> {
  return async (context) => {
    const input = legacyInputFromV2Context(context);
    const hooks = await plugin(input);
    const registrations: V2Registration[] = [];
    const attempt = async (
      register: () => Promise<V2Registration | undefined>,
    ) => {
      try {
        const registration = await register();
        if (registration) registrations.push(registration);
      } catch {
        // Missing or incompatible domain: keep the remaining hooks working.
      }
    };

    const systemTransform = hooks["experimental.chat.system.transform"];
    if (systemTransform) {
      await attempt(() => registerSystemTransform(context, systemTransform));
    }
    if (hooks.event || hooks["tool.execute.after"]) {
      await attempt(() => registerToolBridge(context, hooks, input.directory));
    }
    const configHook = hooks.config;
    if (configHook) {
      await attempt(() => registerCommands(context, configHook));
    }

    return async () => {
      for (const registration of registrations.reverse()) {
        try {
          await registration.dispose();
        } catch {
          // best-effort cleanup
        }
      }
    };
  };
}

/**
 * Builds a plugin definition accepted by both OpenCode v1 (`server`) and
 * OpenCode v2 (`setup`).
 */
export function createPluginDefinition(
  plugin: Plugin,
): KibiOpencodePluginDefinition {
  return {
    id: KIBI_OPENCODE_PLUGIN_ID,
    server: plugin,
    setup: createV2Setup(plugin),
  };
}
