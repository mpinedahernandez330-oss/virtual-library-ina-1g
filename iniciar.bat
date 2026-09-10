@echo off
echo Iniciando Virtual Library...
cd backend
start "Virtual Library Backend" node server.js
timeout /t 2 /nobreak > nul
start http://localhost:3000
echo Backend corriendo en http://localhost:3000
