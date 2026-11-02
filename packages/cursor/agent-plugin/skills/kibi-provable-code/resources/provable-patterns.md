# Provable Patterns

Before-and-after examples for the practices in `kibi-provable-code`. Each
"after" is a change worth making without Kibi; the note says what Kibi can
then read. Keep the "before" when the dynamic form is the design (plugins,
serialization, registries, generated code).

## One source of truth for a decision

```ts
// Before: the limit lives in two conditions.
if (files.length > 20) throw new Error("too many files");
// ...elsewhere
const remaining = 20 - files.length;

// After: one named constant that both read.
export const UPLOAD_POLICY = { maxFiles: 20 } as const;
if (files.length > UPLOAD_POLICY.maxFiles) throw new TooManyFilesError();
```

Kibi reads `UPLOAD_POLICY.maxFiles` as a `value_source` with a dotted export.
Do not add a second `MAX_FILES` export just for the proof.

```py
# Before: allowed roles spread over checks.
if role == "owner" or role == "admin": ...

# After: one set, read by the check.
INVITER_ROLES = frozenset({"owner", "admin"})
if role in INVITER_ROLES: ...
```

## Dispatch through a table, not a computed name

```py
# Before: any attribute name can be called.
handler = getattr(self, f"handle_{event.kind}")
# or: globals()[f"handle_{event.kind}"]

# After: the handled kinds are listed.
HANDLERS = {"created": handle_created, "deleted": handle_deleted}
handler = HANDLERS[event.kind]
```

```php
// Before
$$name = $value;          // variable variables
$this->$method($arg);     // computed method name

// After
$settings[$name] = $value;
match ($method) { 'archive' => $this->archive($arg), 'restore' => $this->restore($arg) };
```

```ts
// Before: the loaded module depends on run-time text.
const exporter = await import(`./exporters/${format}.js`);

// After: the supported formats are a literal map.
const EXPORTERS = {
  csv: () => import("./exporters/csv.js"),
  pdf: () => import("./exporters/pdf.js"),
} as const;
const exporter = await EXPORTERS[format]();
```

The table is also the list of supported values: Kibi's `exhaustive` kind or
an `Object.keys(EXPORTERS)` domain proves "only CSV and PDF are supported".

## Configuration at one boundary

```ts
// Before: environment reads spread through the code, some computed.
const url = process.env[`${service.toUpperCase()}_URL`];

// After: config.ts reads every variable by name and exports a typed object.
export const config = {
  billingUrl: process.env.BILLING_URL,
  searchUrl: process.env.SEARCH_URL,
};
```

```go
// After: one function reads the environment; the rest receives Config.
func LoadConfig() Config {
	return Config{Port: os.Getenv("PORT"), DatabaseURL: os.Getenv("DATABASE_URL")}
}
```

`extract: env` over `config.ts` (or the Go file) proves "the service reads
only these variables". Code elsewhere that reads the environment directly is
then a review finding in its own right.

## Pure deciders, effects at the edge

```ts
// Before: the decision reads the database and the session itself.
async function invite(req) {
  const me = await db.members.find(req.user);
  if (me.role !== "owner" && !(me.role === "admin" && req.body.role !== "owner")) throw ...
  await db.invites.insert(...);
}

// After: the decision is a pure function over finite inputs.
export function canInvite(inviter: Role, invitee: Role): boolean {
  return inviter === "owner" || (inviter === "admin" && invitee !== "owner");
}
async function invite(req) {
  const me = await db.members.find(req.user);
  if (!canInvite(me.role, req.body.role)) throw new ForbiddenError();
  await db.invites.insert(...);
}
```

Kibi's `rule` kind calls `canInvite` on every pair of roles.

## Explicit state

```ts
// Before: several flags imply a state, and impossible pairs are possible.
{ sent: true, paid: false, cancelled: true }

// After: one status and its transitions.
export const INVOICE_TRANSITIONS = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
} as const;
```

`state_machine` proves "a cancelled invoice can never become paid".

## Named failures

```java
// Before
throw new RuntimeException("quota " + kind + " exceeded");
// After
throw new QuotaExceededException(kind);
```

The `thrown` read lists `QuotaExceededException`; callers catch it by type.

## Accepted dynamic code

Keep reflection, open registries and dynamic loading where they are the
design, and fence them:

- One loader module discovers plugins; the rest of the code calls the
  plugin interface statically.
- An ORM or serializer maps fields by reflection; claims about the fields
  are proved over the schema or validator, not over the mapper.
- A dependency-injection container wires by key; the bindings sit in one
  module with literal keys where the container allows it.
- Built-in entries of an open registry live in a literal table, so a claim
  about the built-ins is provable while the open part stays `tested`.

## Generated and vendored code

- Keep the generator header and list the paths in `.gitattributes`:

  ```gitattributes
  src/gen/** linguist-generated
  third_party/** linguist-vendored
  ```

- Change the generator input and regenerate; never hand-edit the output.
- Prove claims over the input (`openapi`, `schema`, `json`/`yaml`,
  `validator` readers) and over the thin hand-written wrapper.
- Cover behaviour of the output with tests or snapshots, plus a CI step
  that regenerates and fails on a diff.
