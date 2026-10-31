# SWI-Prolog Code Proofs

Kibi reads code models from SWI-Prolog files (`.pl`, `.plt`) with the
SWI-Prolog it runs on (KIBI_SWIPL, the bundled runtime, then `swipl` on
PATH). It loads the file a symbol names (a module, or a plain file into
`user`) and reads a predicate named by its indicator, the symbol's title
(`operator/2`, `lists:append/3`, `greeting//1`) or `export`.

- A domain (`exhaustive`, `domains`, `value_source` with `measure: count`)
  is the distinct solutions of one argument. A one-argument predicate needs
  nothing more; for more arguments set `arg` (1-based) to the one that names
  each member: `domain_source: {symbol_id: SYM-operator, arg: 1}` lists every
  `Name` of `operator(Name, Description)`. A solution that leaves that
  argument unbound refuses the read.
- A value (`value_source`) is the single number a constant holds:
  `hard_limit_seconds(10).` Zero or several solutions refuse the read.
- A `rule` predicate is called once per row of its argument domains; success
  is true, failure false, an exception an error row (which rejects).
- A `state_machine` transition table is a `Name/2` (from, to) or `Name/3`
  (from, event, to) fact table: every solution is an edge. With `domains:
  {state, event}` a `Name/3` next-state predicate is called on every state
  and event. `initial_source` names an `initial/1`-style fact.
- A `regex` reads an atom or string constant as a `type: string` pattern;
  Kibi decides string facts on it. Patterns for `library(pcre)` are not read.

Loading a module runs its directives, the same trust a JavaScript import
gives. The proof file must name the predicate and load its file
(`use_module`, `ensure_loaded`, `consult`, a `:- [..]` load list, or
`library(X)` for a pack's `prolog/X.pl`), or be the plunit `.plt` file
beside it; otherwise Kibi treats the domain as hand-listed. `arg` on a
TypeScript, JavaScript or Python export is refused, and so is `field` on a
Prolog predicate.

## Writing the certificate

A Prolog test writes the `kibi.code-certificate.v1` JSON into the directory
`kibi prove` sets in `KIBI_PROOF_CERTIFICATES`. Copy this module into the
project's test directory (for example `test/kibi_certificate.pl`) and call it
from the proof. Read members from the code with `findall/3` over the domain
predicate; never list them by hand.

```prolog
:- module(kibi_certificate,
          [ kibi_exhaustive_certificate/5,  % +TestId, +SymbolId, +Members, :Check, -Certificate
            kibi_rule_certificate/4,        % +TestId, +Domains, +Predicates, -Certificate
            kibi_machine_certificate/5,     % +TestId, +SymbolId, +Edges, +Initial, -Certificate
            kibi_pattern_certificate/4,     % +TestId, +SymbolId, +Text, -Certificate
            kibi_write_certificate/1        % +Certificate
          ]).
:- use_module(library(http/json)).
:- use_module(library(apply)).
:- use_module(library(lists)).

:- meta_predicate
    kibi_exhaustive_certificate(+, +, +, 1, -).

% Members as Kibi reads them: atoms and strings as text, numbers as written,
% other terms quoted.
kibi_text(Value, Text) :- string(Value), !, Text = Value.
kibi_text(Value, Text) :- atom(Value), !, atom_string(Value, Text).
kibi_text(Value, Text) :- number(Value), !, number_string(Value, Text).
kibi_text(Value, Text) :- format(string(Text), "~q", [Value]).

%!  kibi_exhaustive_certificate(+TestId, +SymbolId, +Members, :Check, -Certificate)
%
%   Run Check on every member of the domain and record each outcome. Read
%   Members from the code (findall over the domain predicate), never list
%   them by hand: Kibi re-reads the predicate and rejects a different set.
kibi_exhaustive_certificate(TestId, SymbolId, Members, Check, Certificate) :-
    maplist(kibi_text, Members, Texts),
    maplist(exhaustive_result(Check), Members, Texts, Results),
    Certificate = _{version: "kibi.code-certificate.v1", kind: "exhaustive",
                    test_id: TestId,
                    domain: _{symbol_id: SymbolId, members: Texts},
                    results: Results}.

exhaustive_result(Check, Member, Text, Result) :-
    catch(( call(Check, Member)
          -> Result = _{member: Text, outcome: "passed"}
          ;  Result = _{member: Text, outcome: "failed", message: "the check failed"}
          ),
          Error,
          ( message_to_text(Error, Message),
            Result = _{member: Text, outcome: "failed", message: Message} )).

%!  kibi_rule_certificate(+TestId, +Domains, +Predicates, -Certificate)
%
%   Domains is a list of domain(Type, SymbolId, Members); Predicates a list
%   of predicate(Name, SymbolId, ArgTypes, Goal), where Goal is called with
%   one argument per type appended and decides the row by success or
%   failure.
kibi_rule_certificate(TestId, Domains, Predicates, Certificate) :-
    findall(Type-_{symbol_id: SymbolId, members: Texts},
            ( member(domain(Type, SymbolId, Members), Domains), maplist(kibi_text, Members, Texts) ),
            DomainPairs),
    dict_pairs(DomainDict, _, DomainPairs),
    findall(Name-_{symbol_id: SymbolId, arg_types: ArgTypes, rows: Rows},
            ( member(predicate(Name, SymbolId, ArgTypes, Goal), Predicates),
              maplist(domain_members(Domains), ArgTypes, Lists),
              findall(Row, (maplist(member, Tuple, Lists), rule_row(Goal, Tuple, Row)), Rows)
            ),
            PredicatePairs),
    dict_pairs(PredicateDict, _, PredicatePairs),
    Certificate = _{version: "kibi.code-certificate.v1", kind: "rule",
                    test_id: TestId, domains: DomainDict, predicates: PredicateDict}.

domain_members(Domains, Type, Members) :-
    memberchk(domain(Type, _, Members), Domains).

rule_row(Goal, Tuple, Row) :-
    maplist(kibi_text, Tuple, Args),
    Call =.. [call, Goal|Tuple],
    catch(( once(Call) -> Row = _{args: Args, value: true} ; Row = _{args: Args, value: false} ),
          Error,
          ( message_to_text(Error, Message), Row = _{args: Args, error: Message} )).

%!  kibi_machine_certificate(+TestId, +SymbolId, +Edges, +Initial, -Certificate)
%
%   Edges is the list of From-To pairs of the transition table (findall over
%   it); Initial is the list of initial states, or [] when the contract names
%   no initial_source.
kibi_machine_certificate(TestId, SymbolId, Edges, Initial, Certificate) :-
    findall([F, T], (member(From-To, Edges), kibi_text(From, F), kibi_text(To, T)), Pairs0),
    sort(Pairs0, Pairs),
    findall(S, (member([A, B], Pairs), member(S, [A, B])), Ends),
    sort(Ends, States),
    Machine0 = _{symbol_id: SymbolId, states: States, transitions: Pairs},
    (   Initial == []
    ->  Machine = Machine0
    ;   maplist(kibi_text, Initial, InitialTexts0),
        sort(InitialTexts0, InitialTexts),
        Machine = Machine0.put(initial, InitialTexts)
    ),
    Certificate = _{version: "kibi.code-certificate.v1", kind: "state_machine",
                    test_id: TestId, machine: Machine}.

%!  kibi_pattern_certificate(+TestId, +SymbolId, +Text, -Certificate)
%
%   The string or atom constant a string claim is about.
kibi_pattern_certificate(TestId, SymbolId, Value, Certificate) :-
    kibi_text(Value, Text),
    Certificate = _{version: "kibi.code-certificate.v1", kind: "regex", test_id: TestId,
                    pattern: _{symbol_id: SymbolId, type: "string", value: Text}}.

%!  kibi_write_certificate(+Certificate)
%
%   Leave the certificate where kibi prove reads it (the directory in
%   KIBI_PROOF_CERTIFICATES). Does nothing outside a kibi prove run.
kibi_write_certificate(Certificate) :-
    (   getenv('KIBI_PROOF_CERTIFICATES', Directory), Directory \== ''
    ->  make_directory_path(Directory),
        format(atom(Name), "~w.json", [Certificate.test_id]),
        directory_file_path(Directory, Name, File),
        setup_call_cleanup(open(File, write, Out, [encoding(utf8)]),
                           json_write_dict(Out, Certificate, [width(0)]),
                           close(Out))
    ;   true
    ).

message_to_text(Error, Text) :-
    catch(message_to_codes(Error, Text), _, fail), !.
message_to_text(Error, Text) :- format(string(Text), "~q", [Error]).

message_to_codes(Error, Text) :-
    '$messages':translate_message(Error, Lines, []),
    with_output_to(string(Raw), print_message_lines(current_output, '', Lines)),
    split_string(Raw, "", "\n ", [Text]).
```

A proof that the operators are exactly the claimed set:

```prolog
:- use_module('../prolog/operators').
:- use_module(kibi_certificate).
:- initialization(main, main).

main :-
    findall(Name, operator(Name, _), Names0),
    list_to_set(Names0, Names),
    kibi_exhaustive_certificate('TEST-operator-set', 'SYM-operator', Names,
                                [Name]>>operator(Name, _), Certificate),
    kibi_write_certificate(Certificate).
```

Its contract: `kind: exhaustive`, `domain_source: {symbol_id: SYM-operator,
arg: 1}`, `proves: [CLAIM-...]`. A rule proof passes
`[domain(status, 'SYM-status', Statuses)]` and
`[predicate(detected, 'SYM-detected', [status], detected)]`; its contract
names `predicate_source: {detected: {symbol_id: SYM-detected}}` and
`domains: {status: {symbol_id: SYM-status}}`.

## Source proofs over Prolog code

A `source` proof needs no certificate: Kibi reads the Prolog files itself,
term by term, and never runs them. Use the `references` reader on `.pl` and
`.plt` files for what modules load (`extract: imports`, members as written:
`library(lists)`, `helpers`), call (`calls`, `Name/Arity` or
`Module:Name/Arity`), read from the environment (`env`, `getenv/2`), pass as
a first argument (`string_args` with `callee`) and throw (`thrown`: the error
of `error(type_error(...), _)` is `type_error`). Use the `prolog` reader for
facts: `{reader: prolog, file: pack.pl, functor: requires/1}` lists a pack's
requirements, and `arg` picks the argument of a fact with several. A goal or
closure held in a variable (`call(Goal)`, `maplist(G, L)`), a goal with a
variable module, a clause asserted from a variable and `:- if(...)` fail the
read with their place: name the predicate instead, or narrow `files` to the
modules the claim is about.
