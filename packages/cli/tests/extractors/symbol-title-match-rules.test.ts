import { describe, expect, test } from "bun:test";
import {
  type TitledDeclaration,
  declarationTitleAliases,
  matchDeclarationTitle,
} from "../../src/extractors/symbol-title-match.js";

const at = (
  fields: Partial<TitledDeclaration> & { name: string },
  startLine = 1,
  endLine = startLine,
): TitledDeclaration => ({
  startLine,
  startColumn: 1,
  endLine,
  endColumn: 2,
  ...fields,
});

const aliases = (qualifiedName?: string) =>
  declarationTitleAliases({ qualifiedName });

describe("declarationTitleAliases", () => {
  test("a declaration without a locator has no aliases", () => {
    expect(aliases()).toEqual([]);
    expect(aliases("plain.name")).toEqual([]);
  });

  test("terraform blocks alias their address", () => {
    expect(aliases('terraform:resource["aws_s3_bucket","this"]')).toEqual([
      "aws_s3_bucket.this",
      "resource.aws_s3_bucket.this",
    ]);
    expect(aliases('terraform:data["aws_ami","x"]')).toEqual([
      "data.aws_ami.x",
    ]);
    expect(aliases('terraform:variable["region"]')).toEqual([
      "var.region",
      "variable.region",
    ]);
    expect(aliases('terraform:module["m"]')).toEqual(["module.m"]);
    expect(aliases('terraform:output["o"]')).toEqual(["output.o"]);
    expect(aliases('terraform:local["l"]')).toEqual(["local.l"]);
  });

  test("terraform blocks with the wrong label count have no alias", () => {
    for (const locator of [
      'terraform:resource["only"]',
      'terraform:resource["a","b","c"]',
      'terraform:data["only"]',
      'terraform:variable["a","b"]',
      'terraform:module["a","b"]',
      "terraform:module[]",
    ]) {
      expect(aliases(locator)).toEqual([]);
    }
  });

  test("terraform labels must be JSON strings", () => {
    expect(aliases('terraform:module["m",1]')).toEqual([]);
    expect(aliases("terraform:module[1]")).toEqual([]);
    expect(aliases("terraform:module[m]")).toEqual([]);
    expect(aliases('terraform:other["m"]')).toEqual([]);
  });

  test("the terraform locator must span the whole qualified name", () => {
    expect(aliases('xterraform:module["m"]')).toEqual([]);
    expect(aliases('terraform:module["m"]x')).toEqual([]);
    expect(aliases('terraform:module["m"]]')).toEqual([]);
  });

  test("generic HCL blocks alias their dotted labels", () => {
    expect(aliases('hcl:["source","amazon-ebs","ubuntu"]')).toEqual([
      "source.amazon-ebs.ubuntu",
    ]);
    expect(aliases('hcl:["a","b"]')).toEqual(["a.b"]);
    expect(aliases('hcl:["single"]')).toEqual([]);
    expect(aliases('hcl:["a",2]')).toEqual([]);
    expect(aliases("hcl:[a,b]")).toEqual([]);
    expect(aliases('xhcl:["a","b"]')).toEqual([]);
    expect(aliases('hcl:["a","b"]x')).toEqual([]);
  });
});

describe("matchDeclarationTitle", () => {
  test("a qualified name wins over a bare name", () => {
    const method = at({
      name: "run",
      qualifiedName: "Job.run",
      kind: "method",
    });
    const fn = at(
      { name: "Job.run", qualifiedName: "X.Job.run", kind: "function" },
      5,
    );
    expect(matchDeclarationTitle("Job.run", [method, fn], "a.ts")).toEqual({
      symbol: method,
    });
    expect(matchDeclarationTitle("run", [method, fn], "a.ts")).toEqual({
      symbol: method,
    });
  });

  test("an alias wins over a bare name", () => {
    const block = at({
      name: "this",
      qualifiedName: 'terraform:module["m"]',
    });
    const other = at({ name: "module.m", qualifiedName: "Z.module.m" }, 3);
    expect(matchDeclarationTitle("module.m", [block, other], "a.tf")).toEqual({
      symbol: block,
    });
  });

  test("a type named like its constructors is the match", () => {
    const type = at({ name: "OS", kind: "class" }, 1, 9);
    const ctor = at({ name: "OS", kind: "method", containerName: "OS" }, 2, 3);
    expect(matchDeclarationTitle("OS", [ctor, type], "OS.java")).toEqual({
      symbol: type,
    });
  });

  test("only a method in the type of its own name is a constructor", () => {
    const type = at({ name: "OS", kind: "class" }, 1, 9);
    for (const other of [
      at({ name: "OS", kind: "function", containerName: "OS" }, 2),
      at({ name: "OS", kind: "method", containerName: "Other" }, 2),
      at({ name: "OS", kind: "method" }, 2),
    ]) {
      expect(
        "failure" in matchDeclarationTitle("OS", [type, other], "OS.java"),
      ).toBe(true);
    }
  });

  test("a constructor is not one of another method or function", () => {
    const ctor = at({ name: "OS", kind: "method", containerName: "OS" }, 2);
    for (const kind of ["method", "function"]) {
      const other = at({ name: "OS", kind, containerName: "X" }, 5);
      expect(
        "failure" in matchDeclarationTitle("OS", [other, ctor], "OS.java"),
      ).toBe(true);
    }
  });

  test("a constructor must share the other declaration's name", () => {
    const ctor = at(
      { name: "OS", qualifiedName: "T", kind: "method", containerName: "OS" },
      2,
    );
    const type = at({ name: "Y", qualifiedName: "T", kind: "class" }, 5);
    expect(matchDeclarationTitle("T", [ctor, type], "a.java")).toEqual({
      failure:
        "'T' matches 2 declarations in a.java (OS on line 2, Y on line 5); use one of those titles",
    });
  });

  test("ambiguous bare names list qualified titles with their lines", () => {
    const first = at({ name: "run", qualifiedName: "A.run" }, 2, 4);
    const second = at({ name: "run", qualifiedName: "B.run" }, 7);
    expect(matchDeclarationTitle("run", [first, second], "a.ts")).toEqual({
      failure:
        "'run' matches 2 declarations in a.ts (A.run on lines 2-4, B.run on line 7); use one of those titles",
    });
  });

  test("declarations no title tells apart say so", () => {
    const first = at({ name: "run" }, 2);
    const second = at({ name: "run" }, 7, 8);
    expect(matchDeclarationTitle("run", [first, second], "a.ts")).toEqual({
      failure:
        "'run' matches 2 declarations in a.ts (run on line 2, run on lines 7-8); no title tells them apart",
    });
  });

  test("ambiguous aliased declarations are listed by alias", () => {
    const first = at({ name: "m", qualifiedName: 'terraform:module["m"]' }, 1);
    const second = at({ name: "m2", qualifiedName: 'hcl:["module","m"]' }, 4);
    expect(matchDeclarationTitle("module.m", [first, second], "a.tf")).toEqual({
      failure:
        "'module.m' matches 2 declarations in a.tf (module.m on line 1, module.m on line 4); no title tells them apart",
    });
  });

  test("a title declared only outside what was read is reported as unreadable", () => {
    const failure = (title: string) =>
      matchDeclarationTitle(title, [], "a.ts", [
        at({ name: "hidden" }),
        at({ name: "x", qualifiedName: "Q.x" }),
        at({ name: "y", qualifiedName: 'terraform:output["o"]' }),
      ]);
    for (const title of ["hidden", "Q.x", "output.o"]) {
      expect(failure(title)).toEqual({
        failure: `'${title}' is declared in a part of a.ts the source analysis could not read`,
      });
    }
  });

  test("an unknown title lists the declarations that exist", () => {
    expect(matchDeclarationTitle("nope", [], "a.ts")).toEqual({
      failure:
        "no declaration titled 'nope' found in a.ts (the extractor found no declarations there)",
    });
    const declared = [
      at({ name: "a", qualifiedName: "One.a" }),
      at({ name: "b", qualifiedName: "One.b" }),
      at({ name: "b", qualifiedName: "Two.b" }),
      at({ name: "b", qualifiedName: "Two.b" }),
      at({ name: "c", qualifiedName: 'terraform:local["c"]' }),
    ];
    expect(matchDeclarationTitle("nope", declared, "a.ts")).toEqual({
      failure:
        "no declaration titled 'nope' found in a.ts (declarations there: a, One.b, Two.b, local.c)",
    });
  });

  test("the listing names eight declarations and counts the rest", () => {
    const named = (count: number) =>
      Array.from({ length: count }, (_, index) => at({ name: `d${index}` }));
    expect(matchDeclarationTitle("nope", named(8), "a.ts")).toEqual({
      failure:
        "no declaration titled 'nope' found in a.ts (declarations there: d0, d1, d2, d3, d4, d5, d6, d7)",
    });
    expect(matchDeclarationTitle("nope", named(10), "a.ts")).toEqual({
      failure:
        "no declaration titled 'nope' found in a.ts (declarations there: d0, d1, d2, d3, d4, d5, d6, d7, and 2 more)",
    });
  });
});
