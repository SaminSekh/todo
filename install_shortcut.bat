@echo off
set SCRIPT_PATH=%~dp0index.html
set ICON_PATH=%~dp0logo.svg
set SHORTCUT_NAME=Todo App
set DESKTOP_PATH=%USERPROFILE%\Desktop

echo Creating Desktop Shortcut...

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESKTOP_PATH%\%SHORTCUT_NAME%.lnk');$s.TargetPath='msedge.exe';$s.Arguments='--app=\"%SCRIPT_PATH%\"';$s.Save()"

if %ERRORLEVEL% EQU 0 (
    echo Shortcut created successfully on your Desktop!
    echo You can now "install" the app by double-clicking the shortcut.
) else (
    echo Failed to create shortcut.
)
pause
