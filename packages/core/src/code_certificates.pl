% Module: code_certificates
% implements REQ-kibi-code-proof-kinds
%
% Re-checks the kibi.code-certificate.v1 a certificate-kind proof contract
% leaves in its receipt.  A receipt counts as proved only when its
% certificate re-checks here, so a test that claims to have covered every
% case cannot earn proved by saying so.  The checks never search:
%
%   exhaustive  The domain lists at least one member, no member twice, and
%               the results name every member exactly once, each passed.
%               (Kibi checks at ingest that the proof imported the domain
%               from its source instead of hand-listing it.)
%   typecheck   The witness names a file and its sha256 and the compiler
%               that accepted it; the outcome is passed.  (Kibi checks at
%               ingest that the witness is the file in the workspace and
%               imports the domain.)
%   arithmetic  The assumptions on one variable are satisfiable and entail
%               the claim, decided exactly by intervals.pl: the assumptions
%               plus the negated claim admit no value.
%   smt         The query asks (check-sat) and the solver answered unsat.
%               (Kibi re-runs the solver on the query at ingest.)
%
% The digest a receipt records is the sha256 of the certificate's canonical
% JSON as canonical_json/2 below spells it. The CLI records the digest this
% module returns at ingest, so ingest and every later re-check hash the
% certificate the same way.

:- module(code_certificates, [
    code_certificate_check/2,
    code_certificate_digest/2,
    code_certificate_check_json/2
]).

:- use_module(library(http/json)).
:- use_module(library(crypto)).
:- use_module(library(apply)).
:- use_module(library(lists)).
:- use_module('intervals.pl', [
    numeric_constraints_satisfiable/2,
    numeric_constraint_entailed/3
]).

code_certificate_version("kibi.code-certificate.v1").

%% code_certificate_check(+Certificate, -Result)
% Result is ok or rejected(Reason) with Reason a string naming what failed.
code_certificate_check(Certificate, Result) :-
    (   catch(certificate_problem(Certificate, Reason), _, (Reason = "the certificate is malformed"))
    ->  Result = rejected(Reason)
    ;   Result = ok
    ).

%% code_certificate_digest(+Certificate, -Digest)
code_certificate_digest(Certificate, Digest) :-
    canonical_json(Certificate, Json),
    crypto_data_hash(Json, Digest, [algorithm(sha256), encoding(utf8)]).

%% code_certificate_check_json(+CertificateJson, -ResultJson)
% Entry point for the CLI: {"accepted": true, "digest": D} or
% {"accepted": false, "reason": R}.
code_certificate_check_json(CertificateJson, ResultJson) :-
    (   catch(atom_json_dict(CertificateJson, Certificate, [value_string_as(string)]), _, fail),
        is_dict(Certificate)
    ->  code_certificate_check(Certificate, Result),
        code_certificate_digest(Certificate, Digest),
        (   Result == ok
        ->  Out = _{accepted: true, digest: Digest}
        ;   Result = rejected(Reason),
            Out = _{accepted: false, digest: Digest, reason: Reason}
        )
    ;   Out = _{accepted: false, reason: "the certificate is not a JSON object"}
    ),
    with_output_to(string(ResultJson), json_write_dict(current_output, Out, [width(0)])).

% certificate_problem(+Certificate, -Reason) succeeds with the first problem.
certificate_problem(Certificate, Reason) :-
    \+ is_dict(Certificate), !,
    Reason = "the certificate is not an object".
certificate_problem(Certificate, Reason) :-
    code_certificate_version(Version),
    \+ get_dict(version, Certificate, Version), !,
    format(string(Reason), "the certificate version is not ~w", [Version]).
certificate_problem(Certificate, Reason) :-
    \+ (get_dict(test_id, Certificate, TestId), nonempty_string(TestId)), !,
    Reason = "the certificate names no test_id".
certificate_problem(Certificate, Reason) :-
    (   get_dict(kind, Certificate, KindString), string(KindString)
    ->  atom_string(Kind, KindString)
    ;   Kind = none
    ),
    (   kind_problem(Kind, Certificate, Reason0)
    ->  Reason = Reason0
    ;   \+ memberchk(Kind, [exhaustive, typecheck, arithmetic, smt])
    ->  Reason = "the certificate kind is not exhaustive, typecheck, arithmetic or smt"
    ).

kind_problem(exhaustive, Certificate, Reason) :-
    field(Certificate, domain, Domain),
    field(Domain, symbol_id, Symbol),
    field(Domain, members, Members),
    field(Certificate, results, Results),
    (   \+ is_dict(Domain)
    ->  Reason = "the certificate has no domain"
    ;   \+ nonempty_string(Symbol)
    ->  Reason = "the domain names no symbol_id"
    ;   \+ (is_list(Members), Members \== [])
    ->  Reason = "the domain lists no members"
    ;   \+ maplist(nonempty_string, Members)
    ->  Reason = "every domain member must be a non-empty string"
    ;   msort(Members, Sorted), sort(Members, Unique), Sorted \== Unique
    ->  Reason = "the domain lists a member twice"
    ;   \+ is_list(Results)
    ->  Reason = "the certificate has no results"
    ;   \+ maplist(result_row, Results)
    ->  Reason = "every result must name a member and an outcome"
    ;   findall(M, (member(Row, Results), get_dict(member, Row, M)), Named),
        msort(Named, NamedSorted),
        msort(Members, MembersSorted),
        NamedSorted \== MembersSorted
    ->  Reason = "the results do not name every domain member exactly once"
    ;   member(Row, Results),
        get_dict(outcome, Row, Outcome),
        Outcome \== "passed"
    ->  get_dict(member, Row, Failed),
        format(string(Reason), "member ~w did not pass", [Failed])
    ).
kind_problem(typecheck, Certificate, Reason) :-
    field(Certificate, witness, Witness),
    field(Witness, path, Path),
    field(Witness, sha256, Hash),
    field(Certificate, domain, Domain),
    field(Domain, symbol_id, Symbol),
    field(Certificate, compiler, Compiler),
    field(Compiler, name, Name),
    field(Compiler, version, CompilerVersion),
    field(Certificate, outcome, Outcome),
    (   \+ nonempty_string(Path)
    ->  Reason = "the certificate names no witness path"
    ;   \+ sha256_string(Hash)
    ->  Reason = "the witness has no sha256"
    ;   \+ nonempty_string(Symbol)
    ->  Reason = "the certificate names no domain symbol_id"
    ;   \+ (nonempty_string(Name), nonempty_string(CompilerVersion))
    ->  Reason = "the certificate names no compiler and version"
    ;   Outcome \== "passed"
    ->  Reason = "the type checker did not accept the witness"
    ).
kind_problem(arithmetic, Certificate, Reason) :-
    field(Certificate, variable, Variable),
    field(Certificate, value_type, Type),
    field(Certificate, assumptions, Assumptions),
    field(Certificate, claim, Claim),
    (   \+ nonempty_string(Variable)
    ->  Reason = "the certificate names no variable"
    ;   \+ memberchk(Type, ["int", "real"])
    ->  Reason = "value_type must be int or real"
    ;   \+ (is_list(Assumptions), Assumptions \== [])
    ->  Reason = "the certificate states no assumptions"
    ;   \+ maplist(arithmetic_constraint(_), Assumptions, _)
    ->  Reason = "every assumption must be {operator, value} with a comparison operator and a number"
    ;   \+ arithmetic_constraint(_, Claim, _)
    ->  Reason = "the claim must be {operator, value} with a comparison operator and a number"
    ;   maplist(arithmetic_constraint(X), Assumptions, Premises),
        arithmetic_constraint(X, Claim, Goal),
        integer_variables(Type, X, Integers),
        (   \+ numeric_constraints_satisfiable(Premises, Integers)
        ->  Reason = "the assumptions admit no value, so the claim holds vacuously"
        ;   \+ numeric_constraint_entailed(Premises, Goal, Integers)
        ->  Reason = "the assumptions do not entail the claim: some value satisfies them and breaks it"
        )
    ).
kind_problem(smt, Certificate, Reason) :-
    field(Certificate, solver, Solver),
    field(Solver, name, Name),
    field(Solver, version, SolverVersion),
    field(Certificate, query, Query),
    field(Certificate, result, Result),
    (   \+ (nonempty_string(Name), nonempty_string(SolverVersion))
    ->  Reason = "the certificate names no solver and version"
    ;   \+ nonempty_string(Query)
    ->  Reason = "the certificate has no query"
    ;   \+ sub_string(Query, _, _, _, "(check-sat)")
    ->  Reason = "the query never asks (check-sat)"
    ;   Result \== "unsat"
    ->  Reason = "the solver did not answer unsat"
    ).

% field(+Dict, +Key, -Value): the value, or '$missing' when absent.
field(Dict, Key, Value) :-
    (   is_dict(Dict), get_dict(Key, Dict, Value0)
    ->  Value = Value0
    ;   Value = '$missing'
    ).

result_row(Row) :-
    is_dict(Row),
    get_dict(member, Row, _),
    get_dict(outcome, Row, _).

arithmetic_constraint(X, Row, c(Op, X, Value)) :-
    is_dict(Row),
    get_dict(operator, Row, OpString),
    string(OpString),
    atom_string(Op, OpString),
    memberchk(Op, [eq, neq, lt, lte, gt, gte]),
    get_dict(value, Row, Value),
    number(Value).

integer_variables("int", X, [X]).
integer_variables("real", _, []).

nonempty_string(Value) :-
    string(Value),
    Value \== "".

sha256_string(Value) :-
    string(Value),
    string_length(Value, 64),
    string_codes(Value, Codes),
    forall(member(C, Codes), (code_type(C, digit) ; between(0'a, 0'f, C))).

% The canonical JSON is spelled out here rather than left to json_write, so
% it does not depend on the stream encoding or on how a key was read (a YAML
% key and a JSON key for the same text are the same key): object keys sorted
% by code point, no whitespace, ", \ and the JSON control escapes, other
% control characters and every non-ASCII character as \u escapes of their
% UTF-16 code units, integers in decimal.
canonical_json(Value, Json) :-
    is_dict(Value), !,
    dict_pairs(Value, _, Pairs0),
    maplist(string_keyed, Pairs0, Pairs1),
    keysort(Pairs1, Pairs),
    maplist(canonical_pair, Pairs, Parts),
    atomics_to_string(Parts, ",", Body),
    format(string(Json), "{~s}", [Body]).
canonical_json(Value, Json) :-
    is_list(Value), !,
    maplist(canonical_json, Value, Parts),
    atomics_to_string(Parts, ",", Body),
    format(string(Json), "[~s]", [Body]).
canonical_json(Value, Json) :-
    string(Value), !,
    canonical_string(Value, Json).
canonical_json(Value, Json) :-
    integer(Value), !,
    format(string(Json), "~d", [Value]).
canonical_json(Value, Json) :-
    memberchk(Value, [true, false, null]), !,
    atom_string(Value, Json).
canonical_json(Value, Json) :-
    atom(Value), !,
    atom_string(Value, String),
    canonical_string(String, Json).
canonical_json(Value, Json) :-
    with_output_to(string(Json), json_write(current_output, Value, [width(0)])).

% Keys as code lists, so keysort orders them by code point whatever the
% reader made of them (an atom, or a small integer for a numeric key).
string_keyed(Key-Value, Codes-Value) :-
    format(string(String), "~w", [Key]),
    string_codes(String, Codes).

canonical_pair(Codes-Value, Json) :-
    string_codes(Key, Codes),
    canonical_string(Key, KeyJson),
    canonical_json(Value, ValueJson),
    format(string(Json), "~s:~s", [KeyJson, ValueJson]).

canonical_string(String, Json) :-
    string_codes(String, Codes),
    phrase(escaped_codes(Codes), Escaped),
    string_codes(Body, Escaped),
    format(string(Json), "\"~s\"", [Body]).

escaped_codes([]) --> [].
escaped_codes([C|Cs]) --> escaped_code(C), escaped_codes(Cs).

escaped_code(0'") --> !, "\\\"".
escaped_code(0'\\) --> !, "\\\\".
escaped_code(0'\b) --> !, "\\b".
escaped_code(0'\f) --> !, "\\f".
escaped_code(0'\n) --> !, "\\n".
escaped_code(0'\r) --> !, "\\r".
escaped_code(0'\t) --> !, "\\t".
escaped_code(C) --> { C >= 0x20, C =< 0x7e }, !, [C].
escaped_code(C) -->
    { C > 0xffff }, !,
    { V is C - 0x10000,
      High is 0xd800 + (V >> 10),
      Low is 0xdc00 + (V /\ 0x3ff) },
    unit_escape(High),
    unit_escape(Low).
escaped_code(C) --> unit_escape(C).

unit_escape(Unit) -->
    { format(codes(Codes), "\\u~|~`0t~16r~4+", [Unit]) },
    Codes.
