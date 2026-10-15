/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { PrologProcess } from "../../src/prolog";
import { utf8ChunkDecoder } from "../../src/prolog/utf8-transport";

// implements REQ-prolog-utf8-text
const TEXT = "§3 ¶2 – zażółć 漢字";

describe("Prolog text transport under a non-UTF-8 locale", () => {
  const saved = {
    LC_ALL: process.env.LC_ALL,
    LANG: process.env.LANG,
    LC_CTYPE: process.env.LC_CTYPE,
  };
  let prolog: PrologProcess | null = null;

  beforeEach(() => {
    process.env.LC_ALL = "C";
    process.env.LANG = "C";
    process.env.LC_CTYPE = "C";
  });

  afterEach(async () => {
    await prolog?.terminate();
    prolog = null;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  for (const oneShot of [false, true]) {
    test(`${oneShot ? "one-shot" : "interactive"} queries keep non-ASCII characters both ways`, async () => {
      prolog = new PrologProcess({ oneShot });
      if (!oneShot) await prolog.start();

      const result = await prolog.query(
        `X = '${TEXT}', atom_codes(X, Codes), length(Codes, Length)`,
      );

      expect(result.success).toBe(true);
      expect(result.bindings.X).toBe(`'${TEXT}'`);
      expect(result.bindings.Length).toBe(String([...TEXT].length));
      expect(result.bindings.X).not.toContain("�");
    });
  }
});

describe("utf8ChunkDecoder", () => {
  test("keeps a character split across two chunks whole", () => {
    const bytes = Buffer.from("a§b", "utf8");
    const decode = utf8ChunkDecoder();
    expect(decode(bytes.subarray(0, 2)) + decode(bytes.subarray(2))).toBe(
      "a§b",
    );
  });
});
