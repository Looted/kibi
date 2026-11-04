import { describe } from "bun:test";
import * as inference from "../../../src/operations/modeling/predicate-inference-2.js";
import { pinSentenceRows } from "./golden-rows.js";

describe("predicate-inference-2 argument inference", () => {
  pinSentenceRows(inference, "predicate-inference-2.golden.json");
});
