// implements REQ-kibi-query-fact-filters
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of typed fact questions: a small roles-and-permissions model
 * authored as Kibi documents, then asked through `kibi query` and `kibi
 * search` on the built CLI exactly as an agent's MCP host would.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

function predicateFact(
  id: string,
  title: string,
  name: string,
  args: readonly string[],
  polarity: "assert" | "deny",
  namespace = "default",
): string {
  return doc(
    `
id: ${id}
title: ${title}
type: fact
status: active
fact_kind: predicate
predicate_namespace: ${namespace}
predicate_name: ${name}
predicate_args: [${args.join(", ")}]
canonical_key: ${name}(${args.join(",")})
polarity: ${polarity}
`,
    title,
  );
}

type FactQuery = {
  mode: string;
  schema?: { argumentNames?: string[]; builtin?: boolean } | null;
  distinct?: {
    argument: string;
    values: { value: string; count: number }[];
  } | null;
  suggestions?: Record<string, string[]> | null;
  warnings: string[];
  next: { call: string; why: string }[];
};

function payload(result: Json): Json {
  return (result.data ?? result) as Json;
}

describe("typed fact questions through the kibi CLI", () => {
  test("answers predicate, property and catalog questions and names the next call", () => {
    const ws = createConsumerWorkspace("kibi-query-facts-");
    workspace = ws;

    ws.write(
      ".kb/facts/FACT-SCHEMA-HAS-ROLE.md",
      doc(
        `
id: FACT-SCHEMA-HAS-ROLE
title: has_role schema
type: fact
status: active
fact_kind: predicate_schema
predicate_namespace: access
predicate_name: has_role
predicate_arity: 2
argument_names: [user, role]
argument_types: [user, role]
argument_constants:
  role: [admin, coach, viewer, auditor]
examples:
  - has_role(alice,admin)
`,
        "A user holds a role.",
      ),
    );
    ws.write(
      ".kb/facts/FACT-ROLE-ALICE-ADMIN.md",
      predicateFact(
        "FACT-ROLE-ALICE-ADMIN",
        "alice is admin",
        "has_role",
        ["alice", "admin"],
        "assert",
        "access",
      ),
    );
    ws.write(
      ".kb/facts/FACT-ROLE-ALICE-AUDITOR.md",
      predicateFact(
        "FACT-ROLE-ALICE-AUDITOR",
        "alice is auditor",
        "has_role",
        ["alice", "auditor"],
        "assert",
        "access",
      ),
    );
    ws.write(
      ".kb/facts/FACT-ROLE-BOB-COACH.md",
      predicateFact(
        "FACT-ROLE-BOB-COACH",
        "bob is coach",
        "has_role",
        ["bob", "coach"],
        "assert",
        "access",
      ),
    );
    ws.write(
      ".kb/facts/FACT-PERM-ADMIN-READ.md",
      predicateFact(
        "FACT-PERM-ADMIN-READ",
        "admin reads analysis requests",
        "permission_rule",
        ["admin", "read", "analysis_request", "allow"],
        "assert",
      ),
    );
    ws.write(
      ".kb/facts/FACT-PERM-VIEWER-DELETE.md",
      predicateFact(
        "FACT-PERM-VIEWER-DELETE",
        "viewer cannot delete analysis requests",
        "permission_rule",
        ["viewer", "delete", "analysis_request", "deny"],
        "deny",
      ),
    );
    ws.write(
      ".kb/facts/FACT-ROLE-SUBJECT.md",
      doc(
        `
id: FACT-ROLE-SUBJECT
title: Role assignment
type: fact
status: active
fact_kind: subject
subject_key: user.role_assignment
`,
        "A user's role assignment.",
      ),
    );
    ws.write(
      ".kb/facts/FACT-ROLE-LIMIT.md",
      doc(
        `
id: FACT-ROLE-LIMIT
title: At most two roles per user
type: fact
status: active
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: lte
value_type: int
value_int: 2
`,
        "A user holds at most two roles.",
      ),
    );
    ws.write(
      ".kb/requirements/REQ-ROLE-LIMIT.md",
      doc(
        `
id: REQ-ROLE-LIMIT
title: A user holds at most two roles
type: req
status: open
priority: must
links:
  - type: constrains
    target: FACT-ROLE-SUBJECT
  - type: requires_property
    target: FACT-ROLE-LIMIT
  - type: requires_predicate
    target: FACT-ROLE-ALICE-ADMIN
  - type: requires_predicate
    target: FACT-PERM-ADMIN-READ
`,
        "A user holds at most two roles, and admins read analysis requests.",
      ),
    );
    ws.sync();

    // How many roles does alice have? One call, named arguments, a count.
    const roles = payload(
      ws.json(["query"], {
        predicate: "has_role",
        where: { user: "alice" },
        distinct: "role",
      }),
    );
    const rolesQuery = roles.factQuery as FactQuery;
    expect(roles.count).toBe(2);
    expect((roles.entities as Json[]).map((row) => row.id).sort()).toEqual([
      "FACT-ROLE-ALICE-ADMIN",
      "FACT-ROLE-ALICE-AUDITOR",
    ]);
    expect(rolesQuery.mode).toBe("predicate");
    expect(
      rolesQuery.distinct?.values.map((entry) => entry.value).sort(),
    ).toEqual(["admin", "auditor"]);
    expect(rolesQuery.schema?.argumentNames).toEqual(["user", "role"]);
    expect(rolesQuery.warnings).toEqual([]);

    // What may an admin do? Each rule carries its effective decision.
    const admin = payload(
      ws.json(["query"], {
        predicate: "permission_rule",
        where: { actor: "admin" },
      }),
    );
    expect(admin.count).toBe(1);
    const [rule] = admin.entities as Json[];
    expect(rule?.effect).toBe("allow");
    expect(rule?.arguments).toEqual({
      actor: "admin",
      action: "read",
      resource: "analysis_request",
      decision: "allow",
    });
    expect((admin.factQuery as FactQuery).schema?.builtin).toBe(true);
    expect(((rule?.requirements as Json[]) ?? []).map((req) => req.id)).toEqual(
      ["REQ-ROLE-LIMIT"],
    );

    // A wrong value lists the values that exist; a wrong name lists the names.
    const miss = payload(
      ws.json(["query"], {
        predicate: "permission_rule",
        where: { actor: "superuser" },
      }),
    );
    expect(miss.count).toBe(0);
    const missQuery = miss.factQuery as FactQuery;
    expect(missQuery.suggestions?.actor).toEqual(["admin", "viewer"]);
    expect(missQuery.next[0]?.call).toBe(
      'kb_query({"predicate":"permission_rule","where":{"actor":"admin"}})',
    );
    const wrongName = payload(
      ws.json(["query"], { predicate: "has_role", where: { who: "alice" } }),
    );
    expect(wrongName.count).toBe(0);
    expect((wrongName.factQuery as FactQuery).warnings[0]).toContain(
      "declared arguments: user, role",
    );

    // What is the role limit? Operator and value, not prose.
    const limit = payload(
      ws.json(["query"], {
        subjectKey: "user.role_assignment",
        propertyKey: "max_roles",
      }),
    );
    expect(limit.count).toBe(1);
    const [limitRow] = limit.entities as Json[];
    expect(limitRow?.operator).toBe("lte");
    expect(limitRow?.value).toBe(2);
    expect((limit.factQuery as FactQuery).mode).toBe("property");

    // Which predicates can I ask about? The catalog names the arguments.
    const catalog = payload(
      ws.json(["query"], { factKind: "predicate_schema" }),
    );
    const names = (catalog.entities as Json[]).map((row) => row.name);
    expect(names).toContain("has_role");
    expect(names).toContain("permission_rule");
    expect((catalog.factQuery as FactQuery).mode).toBe("schemas");

    // The plain lookup path is unchanged.
    const exact = payload(ws.json(["query"], { id: "REQ-ROLE-LIMIT" }));
    expect(exact.count).toBe(1);
    expect(exact.factQuery).toBeUndefined();

    // kb_search answers point at the same typed facts with their claim and ask call.
    const search = payload(
      ws.json(["search"], { query: "user holds at most two roles" }),
    );
    const governing = ((search.answer as Json | undefined)?.governing ??
      []) as Json[];
    const req = governing.find((row) => row.id === "REQ-ROLE-LIMIT");
    expect(req).toBeDefined();
    const facts = (req?.facts ?? []) as Json[];
    const limitFact = facts.find((fact) => fact.id === "FACT-ROLE-LIMIT");
    expect(limitFact).toMatchObject({
      factKind: "property_value",
      claim: "user.role_assignment max_roles lte 2",
      ask: 'kb_query({"subjectKey":"user.role_assignment","propertyKey":"max_roles"})',
    });
    const roleFact = facts.find((fact) => fact.id === "FACT-ROLE-ALICE-ADMIN");
    expect(roleFact).toMatchObject({
      claim: "has_role(alice, admin)",
      ask: 'kb_query({"predicate":"has_role"})',
    });
  });
});
