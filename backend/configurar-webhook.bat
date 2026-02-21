@echo off
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         CONFIGURAR WEBHOOK DE TWILIO                         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Tu servidor backend ya está desplegado en Railway:
echo.
echo   https://restaurante-production-fbf5.up.railway.app
echo.
echo Para que el bot de WhatsApp funcione, configura el webhook en Twilio:
echo.
echo ════════════════════════════════════════════════════════════════
echo PASO 1: Ve a Twilio Console
echo ════════════════════════════════════════════════════════════════
echo.
echo   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
echo.
echo ════════════════════════════════════════════════════════════════
echo PASO 2: Configura el Webhook
echo ════════════════════════════════════════════════════════════════
echo.
echo En "WHEN A MESSAGE COMES IN":
echo   URL: https://restaurante-production-fbf5.up.railway.app/webhook
echo   Method: POST
echo.
echo ════════════════════════════════════════════════════════════════
echo PASO 3: Guarda la configuración
echo ════════════════════════════════════════════════════════════════
echo.
echo Haz clic en "Save" en la parte inferior de la página
echo.
echo ════════════════════════════════════════════════════════════════
echo PASO 4: Prueba el bot
echo ════════════════════════════════════════════════════════════════
echo.
echo En WhatsApp, envía un mensaje al bot:
echo   - "menu" para ver el menú
echo   - "pedir" para hacer un pedido
echo   - "hola" para saludar
echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo Presiona cualquier tecla para abrir Twilio Console...
pause > nul
start https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
echo.
echo ¡Listo! Configura el webhook y prueba el bot.
echo.
pause
