@echo off
setlocal

if not exist "%~dp0runtime\node.exe" (
  echo Extract all files from SAKYRO-Windows.zip before starting.
  pause
  exit /b 1
)

pushd "%~dp0app" || (
  echo The app folder is missing. Extract the entire archive before starting.
  pause
  exit /b 1
)
set "SAKYRO_PORT=4177"
if exist "%~dp0settings.bat" call "%~dp0settings.bat"
set "HOSTNAME=127.0.0.1"
set "PORT=%SAKYRO_PORT%"
set "NEXT_TELEMETRY_DISABLED=1"
set "SAKYRO_DATA_DIR=%~dp0data"

echo Open http://127.0.0.1:%PORT% after the server starts.
echo Keep this window open while using SAKYRO.
"%~dp0runtime\node.exe" server.js
set "SAKYRO_EXIT_CODE=%ERRORLEVEL%"
popd

if not "%SAKYRO_EXIT_CODE%"=="0" pause
exit /b %SAKYRO_EXIT_CODE%
