:- use_module(library(plunit)).
:- use_module('../src/units.pl').
:- use_module(test_helpers).

% canonical_quantity/6 must answer exactly once, with these outputs.
canon(ValueType, Value, Unit, Type, Canonical, CanonUnit) :-
    deterministic(canonical_quantity(ValueType, Value, Unit, Type0, Canonical0, CanonUnit0)),
    Type0 == Type,
    Canonical0 == Canonical,
    CanonUnit0 == CanonUnit.

:- begin_tests(units_table).

% Every alias, in clause order: symbols first, then words.
test(lists_every_unit_with_its_base_and_factor) :-
    findall(Unit-Base-Factor, unit_base(Unit, Base, Factor), Units),
    Units == [
        ns-s-1.0e-9, us-s-1.0e-6, ms-s-1.0e-3, s-s-1, sec-s-1, secs-s-1,
        min-s-60, mins-s-60, h-s-3600, hr-s-3600, hrs-s-3600, d-s-86400,
        wk-s-604800,
        'B'-byte-1, kB-byte-1000, 'MB'-byte-1000000, 'GB'-byte-1000000000,
        'TB'-byte-1000000000000, 'KiB'-byte-1024, 'MiB'-byte-1048576,
        'GiB'-byte-1073741824, 'TiB'-byte-1099511627776,
        '%'-percent-1,
        nanosecond-s-1.0e-9, nanoseconds-s-1.0e-9,
        microsecond-s-1.0e-6, microseconds-s-1.0e-6,
        millisecond-s-1.0e-3, milliseconds-s-1.0e-3,
        second-s-1, seconds-s-1, minute-s-60, minutes-s-60,
        hour-s-3600, hours-s-3600, day-s-86400, days-s-86400,
        week-s-604800, weeks-s-604800,
        byte-byte-1, bytes-byte-1,
        kilobyte-byte-1000, kilobytes-byte-1000,
        megabyte-byte-1000000, megabytes-byte-1000000,
        gigabyte-byte-1000000000, gigabytes-byte-1000000000,
        terabyte-byte-1000000000000, terabytes-byte-1000000000000,
        kibibyte-byte-1024, kibibytes-byte-1024,
        mebibyte-byte-1048576, mebibytes-byte-1048576,
        gibibyte-byte-1073741824, gibibytes-byte-1073741824,
        tebibyte-byte-1099511627776, tebibytes-byte-1099511627776,
        percent-percent-1, percentage-percent-1, pct-percent-1,
        basis_point-percent-0.01, basis_points-percent-0.01
    ].

test(ambiguous_spellings_are_absent) :-
    forall(member(Unit, ['KB', 'Mb', bps, month, year]),
           \+ unit_base(Unit, _, _)).

:- end_tests(units_table).

:- begin_tests(units_canonical).

test(converts_an_integer_to_the_base_unit) :-
    canon(int, 30, min, int, 1800, s).

test(number_type_with_integral_result_becomes_int) :-
    canon(number, 2, h, int, 7200, s).

test(rounds_float_noise_before_deciding_integrality) :-
    canon(number, 0.1, h, int, 360, s).

test(fractional_result_stays_a_float) :-
    canon(number, 1500, ms, number, 1.5, s).

test(integral_float_result_becomes_int) :-
    canon(number, 1000, ms, int, 1, s).

test(rounds_a_fractional_float_to_nine_places) :-
    canon(number, 0.1234567891234, s, number, 0.123456789, s).

test(symbols_match_case_sensitively) :-
    canon(int, 3, 'MB', int, 3000000, byte),
    canon(int, 3, mb, int, 3, mb).

test(words_match_case_insensitively) :-
    canon(int, 2, 'Minutes', int, 120, s),
    canon(int, 5, 'BASIS_POINTS', number, 0.05, percent).

test(unknown_unit_passes_through_with_a_canonical_number) :-
    canon(int, 5, furlong, int, 5, furlong),
    canon(number, 2.0, furlong, int, 2, furlong),
    canon(number, 2.5, furlong, number, 2.5, furlong).

test(big_integers_stay_exact) :-
    Big is 10^30,
    Expected is Big * 1024,
    canon(int, Big, 'KiB', int, Expected, byte).

test(float_too_large_to_round_stays_as_is) :-
    canon(number, 1.0e300, furlong, number, 1.0e300, furlong).

test(non_atom_unit_is_not_converted) :-
    canon(int, 2, "minute", int, 2, "minute").

test(empty_unit_passes_through) :-
    canon(int, 2, '', int, 2, '').

test(non_numeric_type_passes_through) :-
    canon(string, 3, min, string, 3, min),
    canon(bool, true, min, bool, true, min).

test(non_number_value_passes_through) :-
    canon(int, abc, min, int, abc, min).

:- end_tests(units_canonical).
