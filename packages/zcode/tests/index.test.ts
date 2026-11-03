// implements REQ-zcode-kibi-plugin-v1
import { expect, test } from "bun:test";

import zcodePlugin, { adapterKind, packageName } from "../src/index";

test("the default export names the package and adapter kind", () => {
  expect(packageName).toBe("kibi-zcode");
  expect(adapterKind).toBe("zcode-plugin");
  expect(zcodePlugin).toStrictEqual({
    name: "kibi-zcode",
    adapterKind: "zcode-plugin",
  });
});
