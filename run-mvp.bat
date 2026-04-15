@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-mvp.ps1"
