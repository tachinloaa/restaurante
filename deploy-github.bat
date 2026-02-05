@echo off
REM ================================================================
REM Script para subir el código a GitHub y configurar Railway
REM ================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         SUBIR CÓDIGO A GITHUB Y DESPLEGAR EN RAILWAY          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Configurar Git si no está inicializado
if not exist .git (
    echo [1/6] Inicializando repositorio Git...
    git init
    git branch -M main
    git remote add origin https://github.com/tachinloaa/restaurante.git
) else (
    echo [1/6] Repositorio Git ya existe
    git remote set-url origin https://github.com/tachinloaa/restaurante.git
)

echo.
echo [2/6] Añadiendo archivos...
git add .

echo.
echo [3/6] Creando commit con optimizaciones...
git commit -m "feat: optimización dashboard + pruebas Twilio + webhooks configurados"

echo.
echo [4/6] Subiendo a GitHub...
git push -u origin main --force

echo.
echo ════════════════════════════════════════════════════════════════
echo ✅ Código subido a GitHub exitosamente
echo ════════════════════════════════════════════════════════════════
echo.

echo [5/6] Ahora configura las variables de entorno en Railway:
echo.
echo   Ve a: https://railway.app/project/tu-proyecto/settings
echo.
echo   Variables requeridas:
echo   -------------------
echo   NODE_ENV=production
echo   PORT=3000
echo.
echo   SUPABASE_URL=https://tu-proyecto.supabase.co
echo   SUPABASE_KEY=tu_supabase_anon_key_aqui
echo.
echo   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
echo   TWILIO_AUTH_TOKEN=tu_auth_token_aqui
echo   TWILIO_WHATSAPP_NUMBER_CLIENTES=whatsapp:+14155238886
echo   TWILIO_WHATSAPP_NUMBER_ADMIN=whatsapp:+14155238886
echo.
echo   FRONTEND_URL=https://tu-frontend.netlify.app
echo   SESSION_SECRET=tu_clave_secreta_super_segura_123
echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo [6/6] Una vez configuradas las variables, Railway redesplegará automáticamente
echo.
echo Después configura el webhook en Twilio:
echo   URL: https://web-production-dceae.up.railway.app/webhook/whatsapp
echo   Method: POST
echo.
echo ════════════════════════════════════════════════════════════════
echo.
pause
