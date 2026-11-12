import { describe, expect, test } from "bun:test";
import {
  PROLOG_UTF8_STREAMS_GOAL,
  decodeGoalFromEnvGoal,
  encodeGoalForEnv,
  utf8ChunkDecoder,
} from "../../src/prolog/utf8-transport.js";

describe("utf8 transport helpers", () => {
  test("the streams goal sets every stream to UTF-8", () => {
    expect(PROLOG_UTF8_STREAMS_GOAL).toBe(
      "set_prolog_flag(encoding, utf8), set_stream(user_input, encoding(utf8)), set_stream(user_output, encoding(utf8)), set_stream(user_error, encoding(utf8)), set_stream(user_output, newline(posix)), set_stream(user_error, newline(posix))",
    );
  });

  test("encodes goals as base64 of their UTF-8 bytes", () => {
    expect(encodeGoalForEnv("zażółć")).toBe("emHFvMOzxYLEhw==");
    expect(
      Buffer.from(encodeGoalForEnv("漢字"), "base64").toString("utf8"),
    ).toBe("漢字");
  });

  test("decodes the env goal into the named atom", () => {
    expect(decodeGoalFromEnvGoal("KIBI_GOAL", "Goal")).toBe(
      "getenv('KIBI_GOAL', GoalEncoded), base64_encoded(Goal, GoalEncoded, [encoding(utf8), as(atom)])",
    );
  });

  test("keeps characters split across chunks whole", () => {
    const bytes = Buffer.from("a§b", "utf8");
    const decode = utf8ChunkDecoder();
    expect(decode(bytes.subarray(0, 2))).toBe("a");
    expect(decode(bytes.subarray(2))).toBe("§b");
  });
});
