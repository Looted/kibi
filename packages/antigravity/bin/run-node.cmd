:<<"::WIN"
@echo off
where node >nul 2>nul && goto :run_path
if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" goto :run_nvm
if exist "%ProgramFiles%\nodejs\node.exe" goto :run_pf
echo [kibi-antigravity] node executable not found on PATH >&2
exit /b 127
:run_path
node %*
exit /b %ERRORLEVEL%
:run_nvm
"%NVM_SYMLINK%\node.exe" %*
exit /b %ERRORLEVEL%
:run_pf
"%ProgramFiles%\nodejs\node.exe" %*
exit /b %ERRORLEVEL%
::WIN
exec "$(dirname "$0")/run-node.sh" "$@"
