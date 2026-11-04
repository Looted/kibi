import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_SETUP_CHOICES,
  SETUP_CHOICE_NAMES,
  SETUP_FILE,
  autoSyncEnabled,
  readSetupChoices,
  serializeJson,
  writeSetupChoices,
} from "../../src/commands/setup-choices.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempRoot(): string {
  const root = createTempDir("kibi-setup-choices-");
  roots.push(root);
  mkdirSync(path.join(root, ".kb"));
  return root;
}

const read = (root: string, file: string) =>
  readFileSync(path.join(root, file)).toString();

describe("setup choice constants", () => {
  test("name every choice and default all but the CI gate on", () => {
    expect(SETUP_CHOICE_NAMES).toStrictEqual([
      "autoSync",
      "prepareHooks",
      "agentInstructions",
      "ciGate",
    ]);
    expect(DEFAULT_SETUP_CHOICES).toStrictEqual({
      autoSync: true,
      prepareHooks: true,
      agentInstructions: true,
      ciGate: false,
    });
    expect(SETUP_FILE).toBe(path.join(".kb", "setup.json"));
  });
});

describe("readSetupChoices", () => {
  test("falls back to the defaults", () => {
    const root = tempRoot();
    expect(readSetupChoices(root)).toStrictEqual({
      ...DEFAULT_SETUP_CHOICES,
      source: "defaults",
      recorded: {},
    });
  });

  test("reads package.json kibi.setup, keeping only boolean choices", () => {
    const root = tempRoot();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        kibi: {
          setup: {
            autoSync: false,
            prepareHooks: "no",
            agentInstructions: false,
            ciGate: true,
            other: false,
          },
        },
      }),
    );
    writeFileSync(path.join(root, SETUP_FILE), '{"autoSync": true}');
    expect(readSetupChoices(root)).toStrictEqual({
      autoSync: false,
      prepareHooks: true,
      agentInstructions: false,
      ciGate: true,
      source: "package.json",
      recorded: { autoSync: false, agentInstructions: false, ciGate: true },
    });
  });

  test("a package.json setup block that is not an object records nothing", () => {
    for (const setup of [null, [], "x", 1]) {
      const root = tempRoot();
      writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({ kibi: { setup } }),
      );
      expect(readSetupChoices(root)).toStrictEqual({
        ...DEFAULT_SETUP_CHOICES,
        source: "package.json",
        recorded: {},
      });
    }
  });

  test("ignores a package.json without a usable kibi block", () => {
    for (const manifest of [
      "{",
      "[]",
      "null",
      '{"kibi": []}',
      '{"kibi": null}',
      '{"kibi": {}}',
      '{"name": "x"}',
    ]) {
      const root = tempRoot();
      writeFileSync(path.join(root, "package.json"), manifest);
      writeFileSync(path.join(root, SETUP_FILE), '{"ciGate": true}');
      expect(readSetupChoices(root)).toStrictEqual({
        ...DEFAULT_SETUP_CHOICES,
        ciGate: true,
        source: "setup.json",
        recorded: { ciGate: true },
      });
    }
  });

  test("reads .kb/setup.json and tolerates a broken one", () => {
    const root = tempRoot();
    writeFileSync(path.join(root, SETUP_FILE), '{"prepareHooks": false}');
    expect(readSetupChoices(root)).toStrictEqual({
      ...DEFAULT_SETUP_CHOICES,
      prepareHooks: false,
      source: "setup.json",
      recorded: { prepareHooks: false },
    });
    writeFileSync(path.join(root, SETUP_FILE), "not json");
    expect(readSetupChoices(root)).toStrictEqual({
      ...DEFAULT_SETUP_CHOICES,
      source: "setup.json",
      recorded: {},
    });
  });
});

describe("writeSetupChoices", () => {
  test("writes nothing for no changes", () => {
    const root = tempRoot();
    expect(writeSetupChoices(root, {})).toBeNull();
    expect(existsSync(path.join(root, SETUP_FILE))).toBe(false);
  });

  test("records into package.json kibi.setup, keeping other keys", () => {
    const root = tempRoot();
    writeFileSync(
      path.join(root, "package.json"),
      '{\n\t"name": "x",\n\t"kibi": {"plugins": ["a"], "setup": {"ciGate": true}}\n}\n',
    );
    expect(writeSetupChoices(root, { autoSync: false })).toBe("package.json");
    expect(read(root, "package.json")).toBe(
      '{\n\t"name": "x",\n\t"kibi": {\n\t\t"plugins": [\n\t\t\t"a"\n\t\t],\n\t\t"setup": {\n\t\t\t"ciGate": true,\n\t\t\t"autoSync": false\n\t\t}\n\t}\n}\n',
    );
    expect(writeSetupChoices(root, { autoSync: false })).toBeNull();
    expect(existsSync(path.join(root, SETUP_FILE))).toBe(false);
  });

  test("starts a kibi block and a setup block in package.json", () => {
    for (const kibi of [undefined, [], { setup: [] }]) {
      const root = tempRoot();
      writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({ name: "x", kibi }),
      );
      expect(writeSetupChoices(root, { ciGate: true })).toBe("package.json");
      expect(JSON.parse(read(root, "package.json"))).toStrictEqual({
        name: "x",
        kibi: { setup: { ciGate: true } },
      });
    }
  });

  test("records into .kb/setup.json without a package.json", () => {
    const root = tempRoot();
    expect(writeSetupChoices(root, { autoSync: true })).toBe(SETUP_FILE);
    expect(read(root, SETUP_FILE)).toBe('{\n  "autoSync": true\n}\n');
    expect(writeSetupChoices(root, { autoSync: true })).toBeNull();
    expect(writeSetupChoices(root, { ciGate: false })).toBe(SETUP_FILE);
    expect(JSON.parse(read(root, SETUP_FILE))).toStrictEqual({
      autoSync: true,
      ciGate: false,
    });
    expect(existsSync(path.join(root, "package.json"))).toBe(false);
  });

  test("replaces a broken or non-object setup.json", () => {
    for (const content of ["broken", "[]", "{}"]) {
      const root = tempRoot();
      writeFileSync(path.join(root, SETUP_FILE), content);
      expect(writeSetupChoices(root, { ciGate: true })).toBe(SETUP_FILE);
      expect(read(root, SETUP_FILE)).toBe('{\n  "ciGate": true\n}\n');
    }
  });
});

describe("serializeJson", () => {
  test("keeps the indentation, line endings and final newline", () => {
    const value = { a: [1] };
    expect(serializeJson(value, '{\n    "x": 1\n}\n')).toBe(
      '{\n    "a": [\n        1\n    ]\n}\n',
    );
    expect(serializeJson(value, '{\r\n\t"x": 1\r\n}')).toBe(
      '{\r\n\t"a": [\r\n\t\t1\r\n\t]\r\n}',
    );
    expect(serializeJson(value, "")).toBe('{\n  "a": [\n    1\n  ]\n}\n');
    expect(serializeJson(value, '{"x": 1}')).toBe('{\n  "a": [\n    1\n  ]\n}');
    expect(serializeJson(value, ' {\n  "x": 1}')).toBe(
      '{\n  "a": [\n    1\n  ]\n}',
    );
    expect(serializeJson(value, '{\n"x": 1}\n')).toBe(
      '{\n  "a": [\n    1\n  ]\n}\n',
    );
    expect(serializeJson(value, '[{\n\t"x": 1}]')).toBe(
      '{\n  "a": [\n    1\n  ]\n}',
    );
    expect(serializeJson(value, "{\n   x\n}\n")).toBe(
      '{\n  "a": [\n    1\n  ]\n}\n',
    );
  });
});

describe("autoSyncEnabled", () => {
  test("the environment opt-out wins over the recorded choice", () => {
    const root = tempRoot();
    expect(autoSyncEnabled(root, {})).toBe(true);
    expect(autoSyncEnabled(root, { KIBI_AUTO_SYNC: "0" })).toBe(false);
    expect(autoSyncEnabled(root, { KIBI_AUTO_SYNC: "1" })).toBe(true);
    writeFileSync(path.join(root, SETUP_FILE), '{"autoSync": false}');
    expect(autoSyncEnabled(root, { KIBI_AUTO_SYNC: "1" })).toBe(false);
  });

  test("reads the process environment by default", () => {
    const root = tempRoot();
    const previous = process.env.KIBI_AUTO_SYNC;
    try {
      process.env.KIBI_AUTO_SYNC = "0";
      expect(autoSyncEnabled(root)).toBe(false);
      process.env.KIBI_AUTO_SYNC = "1";
      expect(autoSyncEnabled(root)).toBe(true);
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_AUTO_SYNC");
      else process.env.KIBI_AUTO_SYNC = previous;
    }
  });
});
