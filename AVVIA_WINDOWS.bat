@echo off
chcp 65001 >nul
title Prato Textile - Sito finale
where node >nul 2>&1
if errorlevel 1 (echo Node.js non installato: https://nodejs.org/ & pause & exit /b 1)
cd /d "%~dp0"
if not exist node_modules (echo Installazione dipendenze... & call npm install || (pause & exit /b 1))
echo Apertura sito: leggere indirizzo locale qui sotto.
call npm run dev
pause
