import Lake
open Lake DSL

package kibiIntervals

@[default_target]
lean_lib KibiIntervals

@[default_target]
lean_exe «kibi-intervals» where
  root := `Main
