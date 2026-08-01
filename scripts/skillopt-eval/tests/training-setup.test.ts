import { describe, expect, test } from "bun:test";
import { skilloptModuleArgv } from "../training-setup";

describe("SkillOpt trainer module argv", () => {
  test("runs kibi_skillopt from the tools/skillopt project directory", () => {
    expect(
      skilloptModuleArgv([
        "train",
        "--request",
        "/tmp/request.json",
        "--result",
        "/tmp/result.json",
      ]),
    ).toEqual([
      "uv",
      "run",
      "--directory",
      "tools/skillopt",
      "python",
      "-m",
      "kibi_skillopt",
      "train",
      "--request",
      "/tmp/request.json",
      "--result",
      "/tmp/result.json",
    ]);
  });
});
