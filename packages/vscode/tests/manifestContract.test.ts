import { describe, expect, test } from "bun:test";
import {
  KIBI_CONTAINER_ID,
  KIBI_FOCUS_KB_COMMAND,
  KIBI_REFRESH_TREE_COMMAND,
  KIBI_SHOW_LATEST_BRIEF_COMMAND,
  KIBI_VIEW_ID,
} from "../src/extensionIds";

const packageJson = await Bun.file(
  new URL("../package.json", import.meta.url),
).json();

describe("VS Code manifest contract", () => {
  test("runtime IDs match manifest contributions", () => {
    expect(packageJson.main).toBe("./dist/extension.js");

    expect(packageJson.activationEvents).toEqual(
      expect.arrayContaining([
        `onView:${KIBI_VIEW_ID}`,
        `onCommand:${KIBI_FOCUS_KB_COMMAND}`,
        `onCommand:${KIBI_SHOW_LATEST_BRIEF_COMMAND}`,
      ]),
    );

    expect(packageJson.contributes.viewsContainers.activitybar).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: KIBI_CONTAINER_ID }),
      ]),
    );

    expect(packageJson.contributes.views[KIBI_CONTAINER_ID]).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: KIBI_VIEW_ID })]),
    );

    expect(packageJson.contributes.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: KIBI_REFRESH_TREE_COMMAND }),
        expect.objectContaining({ command: KIBI_FOCUS_KB_COMMAND }),
        expect.objectContaining({ command: KIBI_SHOW_LATEST_BRIEF_COMMAND }),
      ]),
    );
  });
});
