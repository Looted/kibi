import { describe, expect, test } from "bun:test";
import {
  PROLOG_ERROR_TERM_PREFIX,
  extractPrologErrorRecord,
  parsePrologErrorTerm,
} from "../../src/prolog/error-terms.js";

const PID = 2_147_000_000;
const parse = (text: string): unknown => parsePrologErrorTerm(text);
const extract = (text: string): unknown => extractPrologErrorRecord(text);
const STALE = {
  code: "stale_snapshot",
  message:
    "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)",
};
const DENIED = {
  code: "permission_denied",
  message: "Access denied or KB locked",
};
const CONTRADICTION_DEFAULT =
  "Contradiction detected: conflicting requirements without a supersedes relationship";

describe("extractPrologErrorRecord", () => {
  test("uses the sentinel prefix at the start of a line", () => {
    expect(PROLOG_ERROR_TERM_PREFIX).toBe("__KIBI_ERROR__:");
    const term = "error(permission_error(x,y,stale_snapshot),_)";
    expect(extract(`noise\n__KIBI_ERROR__:${term}\nmore`)).toStrictEqual(STALE);
    expect(extract(`x __KIBI_ERROR__:${term}`)).toBeNull();
    expect(extract("__KIBI_ERROR__:")).toBeNull();
    expect(extract(`plain ${term}`)).toBeNull();
    expect(extract(`__KIBI_ERROR__:junk\n__KIBI_ERROR__:${term}`)).toBeNull();
  });
});

describe("parsePrologErrorTerm framing", () => {
  test("accepts surrounding whitespace and needs a whole error/2 term", () => {
    expect(
      parse("  error(permission_error(a,b,stale_snapshot), c)  "),
    ).toStrictEqual(STALE);
    expect(parse("xerror(permission_error(a,b,stale_snapshot),c)")).toBeNull();
    expect(parse("error(permission_error(a,b,stale_snapshot),c) x")).toBeNull();
    expect(parse("error()")).toBeNull();
    expect(parse("error(foo(a),c)")).toBeNull();
    expect(parse("error(Foo(a),c)")).toBeNull();
    expect(
      parse("error(  permission_error(a,b,stale_snapshot)  )"),
    ).toStrictEqual(STALE);
    expect(parse("error(xpermission_error(a,b,stale_snapshot))")).toBeNull();
    expect(parse("error(permission_error(a,b,stale_snapshot)x)")).toBeNull();
    expect(parse("error(perm1ssion_Error_2(a),c)")).toBeNull();
  });
});

describe("permission errors", () => {
  test("classifies by operation, resource and detail", () => {
    expect(
      parse("error(permission_error( x , y , stale_snapshot ),c)"),
    ).toStrictEqual(STALE);
    expect(
      parse("error(permission_error( lock , audit_log ),c)"),
    ).toStrictEqual({
      code: "audit_locked",
      message:
        "Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying",
    });
    for (const term of [
      "permission_error(lock,other)",
      "permission_error(other,audit_log)",
      "permission_error(attach,other)",
      "permission_error(other,kb_store)",
      "permission_error()",
      "permission_error(  )",
    ])
      expect(parse(`error(${term},c)`)).toStrictEqual(DENIED);
  });
});

describe("store_locked errors", () => {
  const locked = (context: string) =>
    parse(`error(permission_error( attach , kb_store ,'/s'),${context})`);
  const message = (holder: string) =>
    `Branch store is locked by ${holder}; close that session or, if it is dead, retry so Kibi can break the stale lock (store_locked)`;

  test("describes every recorded owner field", () => {
    expect(
      locked(
        ` kb_store_locked( '{"pid":${PID},"workspaceRoot":"/ws","bootId":"b","startedAt":"t"}' , ' /lock ' , 'orig' ) `,
      ),
    ).toStrictEqual({
      code: "permission_denied",
      storeLocked: {
        owner: { pid: PID, workspaceRoot: "/ws", bootId: "b", startedAt: "t" },
        lockDirectory: " /lock ",
        originalError: "orig",
      },
      message: message(`pid ${PID} for /ws since t`),
    });
  });

  test("an owner without fields is summarized without them", () => {
    expect(
      locked('kb_store_locked(\'{"pid":"7","bootId":1}\',\'/l\')'),
    ).toStrictEqual({
      code: "permission_denied",
      storeLocked: { owner: {}, lockDirectory: "/l" },
      message: message("pid ?"),
    });
  });

  test("a missing, empty or non-object owner is unidentified", () => {
    for (const owner of ["''", '""', "'  '", "'null'", "'5'", "'{bad'"])
      expect(locked(`kb_store_locked(${owner},'/l','')`)).toStrictEqual({
        code: "permission_denied",
        storeLocked: { owner: null, lockDirectory: "/l" },
        message: message("an unidentified holder"),
      });
  });

  test("missing parts of the context leave empty details", () => {
    const unidentified = (lockDirectory: string) => ({
      code: "permission_denied",
      storeLocked: { owner: null, lockDirectory },
      message: message("an unidentified holder"),
    });
    expect(parse("error(permission_error(attach,kb_store,x))")).toStrictEqual(
      unidentified(""),
    );
    expect(locked("other(x)")).toStrictEqual(unidentified(""));
    expect(locked("xkb_store_locked('','/l')")).toStrictEqual(unidentified(""));
    expect(locked("kb_store_locked('','/l')x")).toStrictEqual(unidentified(""));
    expect(locked("kb_store_locked()")).toStrictEqual(unidentified(""));
    expect(locked("kb_store_locked('{}')")).toStrictEqual({
      code: "permission_denied",
      storeLocked: { owner: {}, lockDirectory: "" },
      message: message("pid ?"),
    });
    expect(locked("kb_store_locked('',  )")).toStrictEqual(unidentified(""));
    expect(locked("kb_store_locked(\n'',\n'/l'\n)")).toStrictEqual(
      unidentified("/l"),
    );
  });
});

describe("entity_not_found errors", () => {
  test("names the role from the context message", () => {
    expect(
      parse(
        "error(existence_error( entity , 'REQ-1' ), context(kb_assert_relationship/3, 'Target entity does not exist: REQ-1'))",
      ),
    ).toStrictEqual({
      code: "entity_not_found",
      entityId: "REQ-1",
      message: "Target entity does not exist: REQ-1",
      role: "target",
    });
    expect(
      parse(
        "error(existence_error(entity,x),' Source entity does not exist: x ')",
      ),
    ).toStrictEqual({
      code: "entity_not_found",
      entityId: "x",
      message: "Source entity does not exist: x",
      role: "source",
    });
  });

  test("without a role message it is a plain entity", () => {
    for (const context of ["", ",_", ",context(p)", ",context()", ",'other'"])
      expect(
        parse(`error(existence_error(entity,"e1")${context})`),
      ).toStrictEqual({
        code: "entity_not_found",
        entityId: "e1",
        message: "Entity does not exist: e1",
      });
  });

  test("other existence errors are not entity errors", () => {
    expect(parse("error(existence_error(procedure,x),c)")).toBeNull();
    expect(parse("error(existence_error(relationship,x),c)")).toBeNull();
    expect(parse("error(type_error(entity,x),c)")).toBeNull();
    expect(parse("error(validation_error('m',x),c)")).toStrictEqual({
      code: "validation_error",
      message: "m",
    });
    expect(parse("error(Xvalidation_error('m'),c)")).toBeNull();
    expect(parse("error(existence_error(entity),c)")).toBeNull();
    expect(parse("error(existence_error(),c)")).toBeNull();
  });
});

describe("invalid_relationship errors", () => {
  const generic = {
    code: "invalid_relationship",
    message: "Invalid relationship type or direction",
  };
  const rel = (context: string) =>
    parse(`error(type_error( relationship , x ),${context})`);

  test("fills the relationship triple from the format arguments", () => {
    expect(
      rel(
        " context(kb_assert/3, 'Invalid relationship: ~w from ~w to ~w'-[ depends_on , 'req' , test ] ) ",
      ),
    ).toStrictEqual({
      code: "invalid_relationship",
      relationship: { relType: "depends_on", fromType: "req", toType: "test" },
      message: "Invalid relationship: depends_on from req to test",
    });
    expect(
      rel("context(p,'Invalid relationship:a  from  b  to  c~w'-[x,y,z])"),
    ).toStrictEqual({
      code: "invalid_relationship",
      relationship: { relType: "a", fromType: "b", toType: "cx" },
      message: "Invalid relationship: a from b to cx",
    });
    expect(
      rel("context(p,'Invalid relationship: ~w from ~w to ~w~w'-[r,f,t])"),
    ).toStrictEqual({
      code: "invalid_relationship",
      relationship: { relType: "r", fromType: "f", toType: "t" },
      message: "Invalid relationship: r from f to t",
    });
  });

  test("falls back to the generic message when the context does not fit", () => {
    for (const context of [
      "",
      ",'Invalid relationship: a from b to c'",
      ",xcontext(p,'Invalid relationship: ~w from ~w to ~w'-[a,b,c])",
      ",context(p,'Invalid relationship: ~w from ~w to ~w'-[a,b,c]) x",
      ",context(p)",
      ",context(p,'Invalid relationship: ~w from ~w to ~w')",
      ",context(p,'Invalid relationship: ~w from ~w to ~w'-[a,b])",
      ",context(p,'Invalid relationship: ~w from ~w to ~w'-[a,b,c]x)",
      ",context(p,'Invalid relationship: ~w from ~w to ~w'-x[a,b,c])",
      ",context(p,'Invalid relationship: ~w from ~w to ~w'-[  ])",
      ",context(p,'Invalid relationship: ~w from ~w to'-[a,b,c])",
      ",context(p,'Invalid relationship: ~w from ~w to ~w x'-[a,b,c])",
      ",context(p,'xInvalid relationship: ~w from ~w to ~w'-[a,b,c])",
      ",context(p,'Invalid relationship: ~w fromx ~w to ~w'-[a,b,c])",
      ",context(p,'Invalid relationship: ~w from ~wto ~w'-[a,b,c])",
      ",context(p,'Invalid relationship: ~w x from ~w to ~w'-[a,b,c])",
      ",context(p,'Invalid relationship: ~w from ~w x to ~w'-[a,b,c])",
      ",context(p,'Invalid relationship: ~w from ~w to c'-[a,b])",
    ])
      expect(rel(context.replace(/^,/, "") || "_")).toStrictEqual(generic);
    expect(parse("error(type_error(relationship,x))")).toStrictEqual(generic);
    expect(parse("error(type_error(integer,x),c)")).toBeNull();
    expect(parse("error(type_error(),c)")).toBeNull();
  });

  test("trailing whitespace inside the format is allowed", () => {
    expect(
      rel("context(p, 'Invalid relationship: ~w from ~w to ~w  '-[a,b,c]  )"),
    ).toStrictEqual({
      code: "invalid_relationship",
      relationship: { relType: "a", fromType: "b", toType: "c" },
      message: "Invalid relationship: a from b to c",
    });
  });
});

describe("contradiction errors", () => {
  test("lists every complete conflict pair", () => {
    expect(
      parse(
        "error(kb_contradiction( [ 'same claim' - 'REQ-2' , \"why\"-'REQ-3', -x, y, '' - z, a - '' , -  ] ), context(p, 'Two requirements conflict'))",
      ),
    ).toStrictEqual({
      code: "contradiction",
      conflicts: [
        { reason: "same claim", otherId: "REQ-2" },
        { reason: "why", otherId: "REQ-3" },
      ],
      message: "Two requirements conflict",
    });
  });

  test("a missing or malformed list has no pairs and the default message", () => {
    for (const term of [
      "kb_contradiction()",
      "kb_contradiction(x)",
      "kb_contradiction([a-b] x)",
      "kb_contradiction(xa-b])",
      "kb_contradiction(a-b])",
      "kb_contradiction([])",
      "kb_contradiction([  ])",
    ])
      for (const context of ["", ",''", ",context(p)", ",context(p,'')"])
        expect(parse(`error(${term}${context})`)).toStrictEqual({
          code: "contradiction",
          conflicts: [],
          message: CONTRADICTION_DEFAULT,
        });
  });
});

describe("validation errors", () => {
  test("carry their unquoted message", () => {
    expect(
      parse("error(validation_error( 'bad \\'x\\' value' ),c)"),
    ).toStrictEqual({
      code: "validation_error",
      message: "bad 'x' value",
    });
    expect(parse("error(validation_error(  ),c)")).toBeNull();
    expect(parse("error(validation_error(),c)")).toBeNull();
  });
});

describe("quoted atoms", () => {
  const message = (atom: string) =>
    parsePrologErrorTerm(`error(validation_error(${atom}),c)`)?.message;

  test("strip matching quotes and unescape", () => {
    expect(message("'a\\nb\\tc\\\\d\\qe'")).toBe("a\nb\tc\\dqe");
    expect(message('"x\\ny"')).toBe("x\ny");
    expect(message("'a\\\nb'")).toBe("a\nb");
    expect(message("''")).toBe("");
    const contextMessage = (context: string) =>
      parsePrologErrorTerm(`error(kb_contradiction([]),${context})`)?.message;
    expect(contextMessage("'a\"")).toBe("'a\"");
    expect(contextMessage("'")).toBe("'");
    expect(contextMessage("xcontext(p,'m')")).toBe("xcontext(p,'m')");
    expect(contextMessage("context(p,'m') x")).toBe("context(p,'m') x");
    expect(contextMessage("\"a'")).toBe("\"a'");
    expect(message("plain")).toBe("plain");
    expect(message("x'y'")).toBe("x'y'");
  });
});
