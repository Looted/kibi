import { describe, expect, test } from "bun:test";

import {
  isStopToken,
  signalTokens,
  singular,
  stem,
  words,
} from "../src/retrieval-tokens";

describe("singular", () => {
  test("short plurals meet their singular", () => {
    expect(singular("tags")).toBe("tag");
    expect(singular("keys")).toBe("key");
    expect(singular("docs")).toBe("doc");
    expect(singular("ids")).toBe("id");
  });

  test("endings that are not plurals stay", () => {
    for (const token of ["status", "class", "analysis", "has", "bus"])
      expect(singular(token)).toBe(token);
  });

  test("-ies plurals are left to stem", () => {
    expect(singular("policies")).toBe("policies");
    expect(stem(singular("policies"))).toBe("policy");
  });
});

describe("stem", () => {
  test("strips one suffix and a trailing e from long words", () => {
    expect(stem("detached")).toBe("detach");
    expect(stem("contradiction")).toBe("contradict");
    expect(stem("validate")).toBe("validat");
    expect(stem("applied")).toBe("apply");
  });

  test("leaves short words and words with digits alone", () => {
    expect(stem("tagged")).toBe("tagg");
    expect(stem("timed")).toBe("timed");
    expect(stem("utf8ing")).toBe("utf8ing");
  });

  test("keeps a stem of at least four letters", () => {
    expect(stem("lation")).toBe("lation");
  });
});

describe("words and signal tokens", () => {
  test("identifiers split into their words", () => {
    expect(words("MAX_TAGS_PER_ORGANIZATION")).toEqual([
      "max",
      "tag",
      "per",
      "organiz",
    ]);
    expect(words("getUserMaxOrganizationCount")).toEqual([
      "get",
      "user",
      "max",
      "organiz",
      "count",
    ]);
    expect(words("HTTPServer")).toEqual(["http", "server"]);
  });

  test("question scaffolding is dropped and each token kept once", () => {
    expect(
      signalTokens("What must stay true when tags and tag change?"),
    ).toEqual(["tag", "chang"]);
    expect(isStopToken("govern")).toBe(true);
    expect(isStopToken("tag")).toBe(false);
  });
});
