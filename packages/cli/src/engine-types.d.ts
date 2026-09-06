// implements REQ-core-journaled-engine-persistence
export type EngineAttachmentIdentity = Readonly<{
  path: string;
  generation: string;
  dev: number;
  ino: number;
}>;

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

export type EngineRequest = {
  readonly id: number;
  readonly method:
    | "query"
    | "command"
    | "entities"
    | "search"
    | "kbStatus"
    | "status"
    | "checkpoint"
    | "compact"
    | "export"
    | "stop"
    | "cancel";
  readonly protocolVersion?: number;
  readonly packageVersions?: string;
  readonly workspaceRoot?: string;
  readonly branch?: string;
  readonly goal?: string;
  readonly type?: string;
  readonly entityId?: string;
  readonly searchQuery?: string;
  readonly tags?: readonly string[];
  readonly sourceFile?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly targetDirectory?: string;
  readonly cancelOf?: number;
  readonly command?: EngineCommandV1;
};
