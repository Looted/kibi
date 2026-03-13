import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pluginTypesPath = path.resolve(
  import.meta.dir,
  "../../../.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts",
);

const sdkTypesPath = path.resolve(
  import.meta.dir,
  "../../../.opencode/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts",
);

function getHookBlock(content: string, hookName: string): string {
  const escapedHookName = hookName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `"${escapedHookName}"\\?:(?:.|\\n)*?\\) => Promise<void>;`,
    "m",
  );

  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Hook ${hookName} not found in plugin contract`);
  }
  return match[0];
}

describe("OpenCode hook contract", () => {
  test("chat.params is option-level only and cannot carry system prompt text", () => {
    const pluginTypes = fs.readFileSync(pluginTypesPath, "utf8");
    const paramsBlock = getHookBlock(pluginTypes, "chat.params");

    expect(paramsBlock).toContain("temperature: number");
    expect(paramsBlock).toContain("topP: number");
    expect(paramsBlock).toContain("topK: number");
    expect(paramsBlock).toContain("options: Record<string, any>");
    expect(paramsBlock).not.toContain("system: string[]");
    expect(paramsBlock).not.toContain("prompt:");
    expect(paramsBlock).not.toContain("messages:");
  });

  test("experimental.chat.system.transform can inject system guidance", () => {
    const pluginTypes = fs.readFileSync(pluginTypesPath, "utf8");
    const systemTransformBlock = getHookBlock(
      pluginTypes,
      "experimental.chat.system.transform",
    );

    expect(systemTransformBlock).toContain("system: string[]");
    expect(systemTransformBlock).toContain("model: Model");
  });

  test("SDK includes file.edited event type", () => {
    const sdkTypes = fs.readFileSync(sdkTypesPath, "utf8");

    expect(sdkTypes).toContain('type: "file.edited"');
    expect(sdkTypes).toContain("export type EventFileEdited");
  });
});
