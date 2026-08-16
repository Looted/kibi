/**
 * Runtime-owned engine boundary. Adapters receive commands, never Prolog
 * goals; the implementation remains free to translate these commands into
 * its private reasoning language.
 */
export type EngineCommandV1 =
  | Readonly<{ version: 1; kind: "status" }>
  | Readonly<{
      version: 1;
      kind: "entities";
      type?: string;
      id?: string;
      tags?: readonly string[];
      sourceFile?: string;
      limit: number;
      offset: number;
    }>
  | Readonly<{
      version: 1;
      kind: "search";
      query: string;
      type?: string;
      limit: number;
      offset: number;
    }>
  | Readonly<{ version: 1; kind: "checkpoint" }>
  | Readonly<{ version: 1; kind: "compact" }>
  | Readonly<{ version: 1; kind: "save" }>
  | Readonly<{ version: 1; kind: "check"; rule?: string }>
  | Readonly<{
      version: 1;
      kind: "relationship";
      action: "assert" | "retract";
      type: string;
      from: string;
      to: string;
    }>
  | Readonly<{
      version: 1;
      kind: "persistence";
      action: "checkpoint" | "compact" | "save" | "export";
      targetDirectory?: string;
    }>
  | Readonly<{
      version: 1;
      kind: "lifecycle";
      action: "stop" | "cancel";
      requestId?: number;
    }>
  | Readonly<{ version: 1; kind: "stop" }>
  | Readonly<{ version: 1; kind: "cancel"; requestId: number }>;

export interface EnginePort {
  execute<T = unknown>(
    command: EngineCommandV1,
    signal?: AbortSignal,
  ): Promise<T>;
}
