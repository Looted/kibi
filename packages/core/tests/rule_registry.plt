:- use_module(library(plunit)).
:- use_module(library(http/json)).
:- use_module('../src/rule_registry.pl').

% rule_registry.pl is generated from schema/rule-registry.json; every table
% must list exactly what the schema declares, in schema order.

:- prolog_load_context(directory, Dir),
   directory_file_path(Dir, '../schema/rule-registry.json', Path),
   assertz(rule_registry_schema_path(Path)).

schema_rules(Rules) :-
    rule_registry_schema_path(Path),
    setup_call_cleanup(open(Path, read, Stream, [encoding(utf8)]),
                       json_read_dict(Stream, Schema, [value_string_as(atom)]),
                       close(Stream)),
    Rules = Schema.rules.

prolog_rules(Rules, PrologRules) :-
    include([Rule]>>get_dict(implementation, Rule, prolog), Rules, PrologRules).

% Name-Value for every rule, in schema order.
rule_pairs(Key, Rules, Pairs) :-
    findall(Name-Value,
            ( member(Rule, Rules), get_dict(name, Rule, Name), get_dict(Key, Rule, Value) ),
            Pairs).

:- begin_tests(rule_registry).

test(known_rules_follow_the_schema) :-
    schema_rules(Rules),
    findall(Name, (member(Rule, Rules), get_dict(name, Rule, Name)), Expected),
    findall(Name, known_rule(Name), Actual),
    Actual == Expected.

test(enforcement_classes_follow_the_schema) :-
    schema_rules(Rules),
    rule_pairs(enforcementClass, Rules, Expected),
    findall(Name-Class, rule_enforcement_class(Name, Class), Actual),
    Actual == Expected.

test(implementations_follow_the_schema) :-
    schema_rules(Rules),
    rule_pairs(implementation, Rules, Expected),
    findall(Name-Impl, rule_implementation(Name, Impl), Actual),
    Actual == Expected.

test(prolog_predicates_follow_the_schema) :-
    schema_rules(Rules),
    prolog_rules(Rules, PrologRules),
    rule_pairs(prologPredicate, PrologRules, Expected),
    findall(Name-Predicate, rule_predicate(Name, Predicate), Actual),
    Actual == Expected.

test(prolog_predicate_arities_follow_the_schema) :-
    schema_rules(Rules),
    prolog_rules(Rules, PrologRules),
    rule_pairs(prologPredicateArity, PrologRules, Expected),
    findall(Name-Arity, rule_predicate_arity(Name, Arity), Actual),
    Actual == Expected.

test(descriptions_follow_the_schema) :-
    schema_rules(Rules),
    rule_pairs(description, Rules, Expected),
    findall(Name-Description, rule_description(Name, Description), Actual),
    Actual == Expected.

test(the_schema_is_not_empty) :-
    schema_rules(Rules),
    length(Rules, Count),
    Count > 0.

:- end_tests(rule_registry).
