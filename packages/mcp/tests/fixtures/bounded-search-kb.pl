:- module(kb, [kb_attach/1, kb_detach/0, kb_entity/3]).

kb_attach(_).
kb_detach.

kb_entity(Id, req, [title="skillopt transport fixture xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", status=open]) :-
    getenv('KIBI_TEST_ENTITY_COUNT', CountAtom),
    atom_number(CountAtom, Count),
    between(1, Count, Index),
    maybe_stderr(Index),
    maybe_delay(Index),
    atom_concat('REQ-skillopt-', Index, Id).

maybe_delay(1) :-
    getenv('KIBI_TEST_DELAY_SECONDS', DelayAtom),
    atom_number(DelayAtom, Delay),
    Delay > 0,
    !,
    sleep(Delay).
maybe_delay(_).

maybe_stderr(1) :-
    getenv('KIBI_TEST_STDERR_BYTES', BytesAtom),
    atom_number(BytesAtom, Bytes),
    Bytes > 0,
    !,
    format(user_error, '~*c', [Bytes, 120]),
    flush_output(user_error).
maybe_stderr(_).
