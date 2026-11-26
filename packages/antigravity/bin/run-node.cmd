:<<"::WIN"
@echo off
set "KIBI_NODE="
where node >nul 2>nul && set "KIBI_NODE=node"
if not defined KIBI_NODE if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "KIBI_NODE=%NVM_SYMLINK%\node.exe"
if not defined KIBI_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "KIBI_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined KIBI_NODE (
  echo [kibi-antigravity] node executable not found on PATH >&2
  exit /b 127
)
if "%KIBI_NODE%"=="node" (
  node %*
) else (
  "%KIBI_NODE%" %*
)
exit /b %ERRORLEVEL%
::WIN
exec "$(dirname "$0")/run-node.sh" "$@"
