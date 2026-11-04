:- module(cert_fixture, [
    cert_property/8,
    cert_predicate/4,
    cert_rule/3
]).

% KB facts the certificate search reads: typed property values, ground
% predicate facts and stored rules, each grounded by its own current
% requirement.

:- use_module(library(http/json)).
:- use_module(library(semweb/rdf_db)).
:- use_module('../src/kb.pl').
:- use_module(kb_fixture).

% A claim key unique to the fact.
claim_key(FactId, ClaimKey) :-
    variant_sha1(FactId, Hash),
    sub_atom(Hash, 0, 16, _, Hex),
    upcase_atom(Hex, Upper),
    atom_concat('CLAIM-', Upper, ClaimAtom),
    atom_string(ClaimAtom, ClaimKey).

%% cert_property(+FactId, +ReqId, +Subject, +Property, +Op, +Type, +Value, +Extra)
cert_property(FactId, ReqId, Subject, Property, Operator, Type, Value, Extra) :-
    atom_concat('FACT-SUBJECT-', Subject, SubjectId0),
    upcase_atom(SubjectId0, SubjectId),
    (   kb_entity(SubjectId, fact, _)
    ->  true
    ;   fixture_entity(fact, SubjectId, [fact_kind=subject, subject_key=Subject])
    ),
    atom_concat(value_, Type, ValueKey),
    claim_key(FactId, ClaimKey),
    ValueProp =.. [=, ValueKey, Value],
    append([fact_kind=property_value, subject_key=Subject, property_key=Property, operator=Operator,
            value_type=Type, ValueProp, claim_key=ClaimKey, claim_text="Certificate fixture claim"],
           Extra, Props),
    fixture_entity(fact, FactId, Props),
    fixture_entity(req, ReqId, [status=open]),
    fixture_rel(constrains, ReqId, SubjectId),
    fixture_rel(requires_property, ReqId, FactId).

%% cert_predicate(+FactId, +ReqId, +Args, +Polarity)
% A default:permission_rule fact, a decision predicate keyed on its first
% three arguments.
cert_predicate(FactId, ReqId, Args, Polarity) :-
    claim_key(FactId, ClaimKey),
    atomic_list_concat(Args, ',', ArgsText),
    format(string(CanonicalKey), "permission_rule(~w):~w", [ArgsText, Polarity]),
    fixture_entity(fact, FactId, [
        fact_kind=predicate,
        predicate_name="permission_rule",
        predicate_namespace="default",
        predicate_args=Args,
        polarity=Polarity,
        canonical_key=CanonicalKey,
        claim_key=ClaimKey,
        claim_text="Coaches read analysis requests"
    ]),
    fixture_entity(req, ReqId, [status=open, logic_claims=[ClaimKey]]),
    fixture_rel(requires_predicate, ReqId, FactId).

%% cert_rule(+FactId, +Head, +Body)
% A rule Head :- Body, Body an atom name or not(Name).  Stored raw, past
% the write checks, so a negation cycle reaches the KB.
cert_rule(FactId, Head, Body) :-
    (   Body = not(Name)
    ->  BodyDict = _{kind: not, item: _{kind: atom, name: Name, args: []}}
    ;   BodyDict = _{kind: atom, name: Body, args: []}
    ),
    atom_json_dict(Json, _{version: 'kibi.logic.v1', kind: rule, modality: assert,
                           head: _{kind: atom, name: Head, args: []}, body: BodyDict, variables: []}, []),
    raw_entity(fact, FactId, [title="Certificate rule", status=active, fact_kind=rule, rule_ir=Json]).

raw_entity(Type, Id, Props) :-
    kb:kb_graph(Graph),
    atom_string(Type, TypeString),
    format(atom(EntityUri), 'kb:entity/~w', [Id]),
    kb:with_kb_mutex((
        rdf_retractall(EntityUri, _, _, Graph),
        rdf_assert(EntityUri, kb:type, '^^'(TypeString, 'http://www.w3.org/2001/XMLSchema#string'), Graph),
        forall(member(Key=Value, Props), kb:store_property(EntityUri, Key, Value, Graph))
    )).
