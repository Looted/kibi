import { describe, expect, it } from "bun:test";
import {
  declarationTitleAliases,
  matchDeclarationTitle,
} from "../../src/extractors/symbol-title-match.js";

const span = (startLine: number, endLine: number) => ({
  startLine,
  startColumn: 0,
  endLine,
  endColumn: 1,
});

// The shapes kibi-plugin-treesitter returns for OS.java.
const javaOs = [
  {
    name: "OS",
    qualifiedName: "ox.OS",
    kind: "class",
    containerName: "ox",
    ...span(5, 20),
  },
  {
    name: "OS_Type",
    qualifiedName: "ox.OS.OS_Type",
    kind: "enum",
    containerName: "OS",
    ...span(6, 9),
  },
  {
    name: "OS",
    qualifiedName: "ox.OS.OS()",
    kind: "method",
    containerName: "OS",
    ...span(13, 14),
  },
  {
    name: "OS",
    qualifiedName: "ox.OS.OS(String)",
    kind: "method",
    containerName: "OS",
    ...span(15, 16),
  },
];

// The shapes kibi-plugin-treesitter returns for a Terraform file.
const terraform = [
  {
    name: "region",
    qualifiedName: 'terraform:variable["region"]',
    ...span(9, 13),
  },
  {
    name: "this",
    qualifiedName: 'terraform:resource["aws_s3_bucket","this"]',
    ...span(15, 17),
  },
  {
    name: "this",
    qualifiedName: 'terraform:resource["aws_s3_bucket_versioning","this"]',
    ...span(19, 24),
  },
  {
    name: "current",
    qualifiedName: 'terraform:data["aws_caller_identity","current"]',
    ...span(26, 26),
  },
  { name: "vpc", qualifiedName: 'terraform:module["vpc"]', ...span(28, 30) },
  {
    name: "bucket_arn",
    qualifiedName: 'terraform:output["bucket_arn"]',
    ...span(32, 34),
  },
  {
    name: "name_prefix",
    qualifiedName: 'terraform:local["name_prefix"]',
    kind: "variable",
    containerName: "locals",
    ...span(37, 37),
  },
];

function placed(title: string, declared: readonly (typeof javaOs)[number][]) {
  const match = matchDeclarationTitle(title, declared, "src/ox/OS.java");
  return "symbol" in match ? match.symbol.startLine : match.failure;
}

describe("symbol title matching", () => {
  it("places a Java class named like its constructors on the class lines", () => {
    expect(placed("OS", javaOs)).toBe(5);
    expect(placed("ox.OS", javaOs)).toBe(5);
    expect(placed("ox.OS.OS()", javaOs)).toBe(13);
    expect(placed("OS_Type", javaOs)).toBe(6);
    // Overloaded constructors without their class stay ambiguous.
    expect(placed("OS", javaOs.slice(2))).toBe(
      "'OS' matches 2 declarations in src/ox/OS.java (ox.OS.OS() on lines 13-14, ox.OS.OS(String) on lines 15-16); use one of those titles",
    );
  });

  it("places Terraform blocks by their address", () => {
    const line = (title: string) => {
      const match = matchDeclarationTitle(title, terraform, "main.tf");
      return "symbol" in match ? match.symbol.startLine : match.failure;
    };
    expect(line("aws_s3_bucket.this")).toBe(15);
    expect(line("resource.aws_s3_bucket.this")).toBe(15);
    expect(line("aws_s3_bucket_versioning.this")).toBe(19);
    expect(line("data.aws_caller_identity.current")).toBe(26);
    expect(line("module.vpc")).toBe(28);
    expect(line("var.region")).toBe(9);
    expect(line("variable.region")).toBe(9);
    expect(line("region")).toBe(9);
    expect(line("output.bucket_arn")).toBe(32);
    expect(line("local.name_prefix")).toBe(37);
    expect(line('terraform:resource["aws_s3_bucket","this"]')).toBe(15);
    expect(line("this")).toBe(
      "'this' matches 2 declarations in main.tf (aws_s3_bucket.this on lines 15-17, aws_s3_bucket_versioning.this on lines 19-24); use one of those titles",
    );
    expect(line("aws_s3_bucket.other")).toBe(
      "no declaration titled 'aws_s3_bucket.other' found in main.tf (declarations there: var.region, aws_s3_bucket.this, aws_s3_bucket_versioning.this, data.aws_caller_identity.current, module.vpc, output.bucket_arn, local.name_prefix)",
    );
  });

  it("derives addresses only from well-formed locators", () => {
    expect(
      declarationTitleAliases({
        qualifiedName: 'hcl:["source","ebs","ubuntu"]',
      }),
    ).toEqual(["source.ebs.ubuntu"]);
    expect(declarationTitleAliases({ qualifiedName: 'hcl:["job"]' })).toEqual(
      [],
    );
    expect(
      declarationTitleAliases({ qualifiedName: 'terraform:resource["a"]' }),
    ).toEqual([]);
    expect(
      declarationTitleAliases({ qualifiedName: "terraform:module[not json]" }),
    ).toEqual([]);
    expect(declarationTitleAliases({ qualifiedName: "ox.OS" })).toEqual([]);
    expect(declarationTitleAliases({})).toEqual([]);
  });

  it("says why a title places nothing", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      name: `f${index}`,
      ...span(index + 1, index + 1),
    }));
    const missing = matchDeclarationTitle("nope", many, "a.go");
    expect("failure" in missing && missing.failure).toBe(
      "no declaration titled 'nope' found in a.go (declarations there: f0, f1, f2, f3, f4, f5, f6, f7, and 2 more)",
    );
    const empty = matchDeclarationTitle("nope", [], "a.go");
    expect("failure" in empty && empty.failure).toBe(
      "no declaration titled 'nope' found in a.go (the extractor found no declarations there)",
    );
    // Declared, but only in a range the analysis could not read.
    const hidden = matchDeclarationTitle("f3", [], "a.go", many);
    expect("failure" in hidden && hidden.failure).toBe(
      "'f3' is declared in a part of a.go the source analysis could not read",
    );
  });
});
