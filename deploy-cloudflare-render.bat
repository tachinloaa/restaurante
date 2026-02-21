@echo off
echo ========================================
echo   Desplegando a Cloudflare + Render
echo ========================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "frontend" (
    echo ERROR: Debes ejecutar este script desde la raiz del proyecto
    pause
    exit /b 1
)

echo 1. Agregando archivos al staging...
git add .

echo.
echo 2. Creando commit...
set /p commit_msg="Mensaje del commit: "
if "%commit_msg%"=="" set commit_msg=Deploy: Actualizacion automatica

git commit -m "%commit_msg%"

echo.
echo 3. Subiendo a GitHub...
git push origin main

echo.
echo ========================================
echo   DESPLIEGUE INICIADO
echo ========================================
echo.
echo Los servicios detectaran los cambios:
echo.
echo   - Render (Backend):
echo     https://dashboard.render.com
echo.
echo   - Cloudflare Pages (Frontend):
echo     https://dash.cloudflare.com
echo.
echo Tiempo estimado: 3-5 minutos
echo.
echo ========================================
pause
