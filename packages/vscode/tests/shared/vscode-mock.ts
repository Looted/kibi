import { mock } from "bun:test";

type DisposableLike = { dispose: () => void };
type PositionLike = { line: number; character: number };
type MockNamespace = Record<string, unknown>;

type VscodeMockState = {
  EventEmitter: new <T = unknown>() => DefaultEventEmitter<T>;
  ThemeIcon: new (id: string) => DefaultThemeIcon;
  TreeItem: new (label: string, collapsibleState: number) => DefaultTreeItem;
  TreeItemCollapsibleState: {
    None: number;
    Collapsed: number;
    Expanded: number;
  };
  CodeActionKind: { Empty: string };
  TextEditorRevealType: { InCenter: string };
  CodeAction: new (title: string, kind: unknown) => DefaultCodeAction;
  CodeLens: new (range: unknown, command?: unknown) => DefaultCodeLens;
  Position: new (line: number, character: number) => DefaultPosition;
  Range: new (
    startOrLine: number | PositionLike,
    startCharacterOrEnd: number | PositionLike,
    endLine?: number,
    endCharacter?: number,
  ) => DefaultRange;
  Selection: new (
    startOrLine: number | PositionLike,
    startCharacterOrEnd: number | PositionLike,
    endLine?: number,
    endCharacter?: number,
  ) => DefaultSelection;
  RelativePattern: new (
    base: unknown,
    pattern: string,
  ) => DefaultRelativePattern;
  MarkdownString: new (value: string) => DefaultMarkdownString;
  Hover: new (contents: unknown) => DefaultHover;
  Uri: {
    file: (filePath: string) => {
      fsPath: string;
      path: string;
      scheme: string;
    };
  };
  window: MockNamespace;
  workspace: MockNamespace;
  commands: MockNamespace;
  languages: MockNamespace;
};

export type VscodeMockOverrides = {
  EventEmitter?: unknown;
  ThemeIcon?: unknown;
  TreeItem?: unknown;
  CodeAction?: unknown;
  CodeLens?: unknown;
  Position?: unknown;
  Range?: unknown;
  Selection?: unknown;
  RelativePattern?: unknown;
  MarkdownString?: unknown;
  Hover?: unknown;
  TreeItemCollapsibleState?: Partial<
    VscodeMockState["TreeItemCollapsibleState"]
  >;
  CodeActionKind?: Partial<VscodeMockState["CodeActionKind"]>;
  TextEditorRevealType?: Partial<VscodeMockState["TextEditorRevealType"]>;
  Uri?: Partial<VscodeMockState["Uri"]>;
  window?: MockNamespace;
  workspace?: MockNamespace;
  commands?: MockNamespace;
  languages?: MockNamespace;
};

// implements REQ-vscode-traceability
function createDisposable(): DisposableLike {
  return { dispose() {} };
}

// implements REQ-vscode-traceability
function createOutputChannel() {
  return {
    appendLine: mock((_value: string) => {}),
    dispose() {},
  };
}

// implements REQ-vscode-traceability
function createTreeViewCaptureList() {
  return [] as Array<{ id: string; options: unknown }>;
}

// implements REQ-vscode-traceability
function createTextEditor() {
  return {
    selection: undefined as unknown,
    revealRange: mock((_range: unknown, _revealType: unknown) => {}),
  };
}

// implements REQ-vscode-traceability
function mergeNamespace<T extends MockNamespace>(
  base: T,
  overrides?: MockNamespace,
): T {
  return overrides ? ({ ...base, ...overrides } as T) : base;
}

// implements REQ-vscode-traceability
function toPoint(value: PositionLike): PositionLike {
  return { line: value.line, character: value.character };
}

// implements REQ-vscode-traceability
export class DefaultEventEmitter<T = unknown> {
  listeners: Array<(value: T) => void> = [];
  fireCount = 0;
  lastValue: T | undefined;

  event = (listener?: (value: T) => void) => {
    if (listener) {
      this.listeners.push(listener);
    }
    return createDisposable();
  };

  fire(value: T) {
    this.fireCount++;
    this.lastValue = value;
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  dispose() {
    this.listeners = [];
  }
}

// implements REQ-vscode-traceability
export class DefaultThemeIcon {
  constructor(public id: string) {}
}

// implements REQ-vscode-traceability
export class DefaultTreeItem {
  description?: string;
  iconPath?: unknown;
  contextValue?: string;
  tooltip?: string;
  command?: unknown;
  resourceUri?: unknown;

  constructor(
    public label: string,
    public collapsibleState: number,
  ) {}
}

// implements REQ-vscode-traceability
export class DefaultCodeAction {
  command?: unknown;

  constructor(
    public title: string,
    public kind: unknown,
  ) {}
}

// implements REQ-vscode-traceability
export class DefaultCodeLens {
  constructor(
    public range: unknown,
    public command?: unknown,
  ) {}
}

// implements REQ-vscode-traceability
export class DefaultPosition {
  constructor(
    public line: number,
    public character: number,
  ) {}
}

// implements REQ-vscode-traceability
export class DefaultRange {
  start: PositionLike;
  end: PositionLike;

  constructor(
    startOrLine: number | PositionLike,
    startCharacterOrEnd: number | PositionLike,
    endLine?: number,
    endCharacter?: number,
  ) {
    if (
      typeof startOrLine === "number" &&
      typeof startCharacterOrEnd === "number" &&
      typeof endLine === "number" &&
      typeof endCharacter === "number"
    ) {
      this.start = { line: startOrLine, character: startCharacterOrEnd };
      this.end = { line: endLine, character: endCharacter };
      return;
    }

    this.start = toPoint(startOrLine as PositionLike);
    this.end = toPoint(startCharacterOrEnd as PositionLike);
  }
}

// implements REQ-vscode-traceability
export class DefaultSelection extends DefaultRange {}

// implements REQ-vscode-traceability
export class DefaultRelativePattern {
  constructor(
    public base: unknown,
    public pattern: string,
  ) {}
}

// implements REQ-vscode-traceability
export class DefaultMarkdownString {
  isTrusted?: boolean;

  constructor(public value: string) {}
}

// implements REQ-vscode-traceability
export class DefaultHover {
  constructor(public contents: unknown) {}
}

// implements REQ-vscode-traceability
export class DefaultFileSystemWatcher {
  changeListeners: Array<(...args: unknown[]) => void> = [];
  createListeners: Array<(...args: unknown[]) => void> = [];
  deleteListeners: Array<(...args: unknown[]) => void> = [];

  constructor(public pattern?: unknown) {}

  onDidChange(listener: (...args: unknown[]) => void) {
    this.changeListeners.push(listener);
    return createDisposable();
  }

  onDidCreate(listener: (...args: unknown[]) => void) {
    this.createListeners.push(listener);
    return createDisposable();
  }

  onDidDelete(listener: (...args: unknown[]) => void) {
    this.deleteListeners.push(listener);
    return createDisposable();
  }

  emitChange(...args: unknown[]) {
    for (const listener of this.changeListeners) {
      listener(...args);
    }
  }

  emitCreate(...args: unknown[]) {
    for (const listener of this.createListeners) {
      listener(...args);
    }
  }

  emitDelete(...args: unknown[]) {
    for (const listener of this.deleteListeners) {
      listener(...args);
    }
  }

  dispose() {}
}

// implements REQ-vscode-traceability
function createDefaultState(): VscodeMockState {
  const createTreeViewCalls = createTreeViewCaptureList();
  const registerCommandCalls = [] as Array<{
    commandId: string;
    callback: unknown;
  }>;
  const openTextDocumentListeners = [] as Array<(value: unknown) => void>;
  const workspaceFolderChangeListeners = [] as Array<(value: unknown) => void>;

  return {
    EventEmitter: DefaultEventEmitter,
    ThemeIcon: DefaultThemeIcon,
    TreeItem: DefaultTreeItem,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    CodeActionKind: { Empty: "empty-kind" },
    TextEditorRevealType: { InCenter: "in-center" },
    CodeAction: DefaultCodeAction,
    CodeLens: DefaultCodeLens,
    Position: DefaultPosition,
    Range: DefaultRange,
    Selection: DefaultSelection,
    RelativePattern: DefaultRelativePattern,
    MarkdownString: DefaultMarkdownString,
    Hover: DefaultHover,
    Uri: {
      file: (filePath: string) => ({
        fsPath: filePath,
        path: filePath,
        scheme: "file",
      }),
    },
    window: {
      showInformationMessage: mock(async (_message: string) => undefined),
      showWarningMessage: mock(async (_message: string) => undefined),
      showErrorMessage: mock(async (_message: string) => undefined),
      showQuickPick: mock(async (_items: unknown[]) => undefined),
      showTextDocument: mock(async (_doc: unknown) => createTextEditor()),
      createOutputChannel: mock((_name: string) => createOutputChannel()),
      createTreeViewCalls,
      createTreeView: mock((id: string, options: unknown) => {
        createTreeViewCalls.push({ id, options });
        return createDisposable();
      }),
    },
    workspace: {
      createFileSystemWatcher: mock(
        (pattern: unknown) => new DefaultFileSystemWatcher(pattern),
      ),
      openTextDocument: mock(async (uri: unknown) => ({ uri, lineCount: 1 })),
      getConfiguration: mock((_section?: string) => ({
        get: <T>(_key: string, defaultValue?: T) => defaultValue as T,
      })),
      workspaceFolders: undefined,
      openTextDocumentListeners,
      workspaceFolderChangeListeners,
      onDidOpenTextDocument: mock((listener: (value: unknown) => void) => {
        openTextDocumentListeners.push(listener);
        return createDisposable();
      }),
      onDidChangeWorkspaceFolders: mock((listener: (value: unknown) => void) => {
        workspaceFolderChangeListeners.push(listener);
        return createDisposable();
      }),
      emitOpenTextDocument(value: unknown) {
        for (const listener of openTextDocumentListeners) {
          listener(value);
        }
      },
      emitWorkspaceFoldersChange(value: unknown) {
        for (const listener of workspaceFolderChangeListeners) {
          listener(value);
        }
      },
    },
    commands: {
      registerCommandCalls,
      registerCommand: mock((commandId: string, callback: unknown) => {
        registerCommandCalls.push({ commandId, callback });
        return createDisposable();
      }),
      executeCommand: mock(
        async (_command: string, ..._args: unknown[]) => undefined,
      ),
    },
    languages: {
      registerCodeActionsProvider: mock(
        (_selector: unknown, _provider: unknown, _metadata?: unknown) =>
          createDisposable(),
      ),
      registerCodeLensProvider: mock((_selector: unknown, _provider: unknown) =>
        createDisposable(),
      ),
      registerHoverProvider: mock((_selector: unknown, _provider: unknown) =>
        createDisposable(),
      ),
    },
  };
}

let state = createDefaultState();

const vscodeMockModule = {
  get EventEmitter() {
    return state.EventEmitter;
  },
  get ThemeIcon() {
    return state.ThemeIcon;
  },
  get TreeItem() {
    return state.TreeItem;
  },
  get TreeItemCollapsibleState() {
    return state.TreeItemCollapsibleState;
  },
  get CodeActionKind() {
    return state.CodeActionKind;
  },
  get TextEditorRevealType() {
    return state.TextEditorRevealType;
  },
  get CodeAction() {
    return state.CodeAction;
  },
  get CodeLens() {
    return state.CodeLens;
  },
  get Position() {
    return state.Position;
  },
  get Range() {
    return state.Range;
  },
  get Selection() {
    return state.Selection;
  },
  get RelativePattern() {
    return state.RelativePattern;
  },
  get MarkdownString() {
    return state.MarkdownString;
  },
  get Hover() {
    return state.Hover;
  },
  get Uri() {
    return state.Uri;
  },
  get window() {
    return state.window;
  },
  get workspace() {
    return state.workspace;
  },
  get commands() {
    return state.commands;
  },
  get languages() {
    return state.languages;
  },
};

// implements REQ-vscode-traceability
export function getVscodeMockModule() {
  return vscodeMockModule;
}

// implements REQ-vscode-traceability
export function resetVscodeMock(overrides: VscodeMockOverrides = {}): void {
  const base = createDefaultState();
  state = {
    ...base,
    EventEmitter:
      (overrides.EventEmitter as VscodeMockState["EventEmitter"] | undefined) ??
      base.EventEmitter,
    ThemeIcon:
      (overrides.ThemeIcon as VscodeMockState["ThemeIcon"] | undefined) ??
      base.ThemeIcon,
    TreeItem:
      (overrides.TreeItem as VscodeMockState["TreeItem"] | undefined) ??
      base.TreeItem,
    CodeAction:
      (overrides.CodeAction as VscodeMockState["CodeAction"] | undefined) ??
      base.CodeAction,
    CodeLens:
      (overrides.CodeLens as VscodeMockState["CodeLens"] | undefined) ??
      base.CodeLens,
    Position:
      (overrides.Position as VscodeMockState["Position"] | undefined) ??
      base.Position,
    Range:
      (overrides.Range as VscodeMockState["Range"] | undefined) ?? base.Range,
    Selection:
      (overrides.Selection as VscodeMockState["Selection"] | undefined) ??
      base.Selection,
    RelativePattern:
      (overrides.RelativePattern as
        | VscodeMockState["RelativePattern"]
        | undefined) ?? base.RelativePattern,
    MarkdownString:
      (overrides.MarkdownString as
        | VscodeMockState["MarkdownString"]
        | undefined) ?? base.MarkdownString,
    Hover:
      (overrides.Hover as VscodeMockState["Hover"] | undefined) ?? base.Hover,
    TreeItemCollapsibleState: {
      ...base.TreeItemCollapsibleState,
      ...(overrides.TreeItemCollapsibleState ?? {}),
    },
    CodeActionKind: {
      ...base.CodeActionKind,
      ...(overrides.CodeActionKind ?? {}),
    },
    TextEditorRevealType: {
      ...base.TextEditorRevealType,
      ...(overrides.TextEditorRevealType ?? {}),
    },
    Uri: mergeNamespace(base.Uri, overrides.Uri),
    window: mergeNamespace(base.window, overrides.window),
    workspace: mergeNamespace(base.workspace, overrides.workspace),
    commands: mergeNamespace(base.commands, overrides.commands),
    languages: mergeNamespace(base.languages, overrides.languages),
  };
}
