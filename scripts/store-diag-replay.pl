% Store integrity diagnostics (diagnostic branch only): rebuild a branch
% store from its snapshot (.trp) and journal (.jrn) in a fresh process and
% print the counts the live engine is compared against.
:- use_module(library(semweb/rdf_db)).

:- dynamic replay_graph/1.

apply_entry(start(_)) :- !.
apply_entry(end(_)) :- !.
apply_entry(assert(S, P, O)) :- !, replay_graph(G), rdf_assert(S, P, O, G).
apply_entry(assert(S, P, O, _)) :- !, replay_graph(G), rdf_assert(S, P, O, G).
apply_entry(retract(S, P, O)) :- !, rdf_retractall(S, P, O).
apply_entry(retract(S, P, O, _)) :- !, rdf_retractall(S, P, O).
apply_entry(Entry) :- throw(error(domain_error(journal_entry, Entry), _)).

replay_journal(File) :-
    setup_call_cleanup(
        open(File, read, Stream),
        replay_stream(Stream),
        close(Stream)).

replay_stream(Stream) :-
    read_term(Stream, Term, []),
    (   Term == end_of_file
    ->  true
    ;   apply_entry(Term),
        replay_stream(Stream)
    ).

main :-
    current_prolog_flag(argv, [Snapshot, Journal|_]),
    (   Snapshot \== '-' -> rdf_load_db(Snapshot) ; true ),
    (   rdf_graph(G0) -> assertz(replay_graph(G0)) ; assertz(replay_graph(replay)) ),
    (   Journal \== '-' -> replay_journal(Journal) ; true ),
    store_counts(Counts),
    format("~w~n", [Counts]).

store_counts(json{triples: Triples, relationships: Relationships, duplicates: Dups}) :-
    aggregate_all(count, rdf(_, _, _), Triples),
    aggregate_all(count,
                  ( rdf(S, _, O), atom(O),
                    sub_atom(S, 0, _, _, 'kb:entity/'),
                    sub_atom(O, 0, _, _, 'kb:entity/') ),
                  Relationships),
    aggregate_all(count,
                  ( rdf(S1, P1, _), sub_atom(P1, 0, _, _, 'kb:'), P1 \== 'kb:tags',
                    aggregate_all(count, rdf(S1, P1, _), C), C > 1 ),
                  Dups).
