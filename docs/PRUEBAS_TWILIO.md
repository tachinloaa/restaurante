# 🧪 Pruebas de Twilio WhatsApp

## Scripts de prueba disponibles

### 1. Verificar Conexión (`testTwilio.js`)
Verifica que las credenciales de Twilio están configuradas correctamente y muestra mensajes recientes.

```bash
cd backend
node src/testTwilio.js
```

**Qué hace:**
- ✅ Verifica credenciales de Twilio
- ✅ Prueba conexión con la API
- ✅ Muestra últimos 5 mensajes
- ✅ Muestra instrucciones del Sandbox

---

### 2. Enviar Mensaje de Prueba (`testTwilioEnviar.js`)
Envía un mensaje de prueba a un número de WhatsApp.

```bash
cd backend
node src/testTwilioEnviar.js +5215512345678
```

**Requisitos:**
- El número debe tener formato internacional: `+52` (México), `+1` (USA), etc.
- El número debe haber hecho "join" al Sandbox de Twilio

**Ejemplo con número mexicano:**
```bash
node src/testTwilioEnviar.js +5215551234567
```

**Ejemplo con formato whatsapp:**
```bash
node src/testTwilioEnviar.js whatsapp:+5215551234567
```

---

## 🚀 Guía Rápida de Prueba

### Paso 1: Conectar tu WhatsApp al Sandbox

1. **Ve a Twilio Console:**
   - https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

2. **Encuentra tu código de sandbox:**
   - Verás algo como: `join coffee-mountain` (tu código será diferente)

3. **Conecta tu WhatsApp:**
   - Abre WhatsApp en tu teléfono
   - Crea un nuevo chat con: **+1 (415) 523-8886**
   - Envía: `join coffee-mountain` (usa tu código)
   - Espera confirmación de Twilio

✅ ¡Listo! Tu WhatsApp está conectado al Sandbox.

---

### Paso 2: Verificar Conexión de Twilio

```bash
cd backend
node src/testTwilio.js
```

**Salida esperada:**
```
🔍 PRUEBA DE TWILIO - WhatsApp Integration

==================================================

📋 Configuración actual:
  Account SID: AC70bc5a365653056...
  Auth Token: ✅ Configurado
  WhatsApp From: whatsapp:+14155238886
  WhatsApp Admin: whatsapp:+14155238886

🔌 Verificando conexión con Twilio...
✅ Conexión exitosa a Twilio - Cuenta: Your Account Name

📨 Obteniendo últimos 5 mensajes...
  ...

✅ Prueba de conexión completada
```

---

### Paso 3: Enviar Mensaje de Prueba

```bash
cd backend
node src/testTwilioEnviar.js +5215551234567
```

**Reemplaza** `+5215551234567` con tu número de WhatsApp (el que hizo join).

**Salida esperada:**
```
📤 ENVIAR MENSAJE DE PRUEBA - WhatsApp

==================================================

📱 Enviando mensaje a: +5215551234567
⏳ Enviando...

✅ ¡Mensaje enviado exitosamente!

📋 Detalles:
  Message SID: SM12345...
  Destinatario: +5215551234567

💡 Revisa tu WhatsApp para ver el mensaje

⏳ Verificando estado del mensaje en 3 segundos...

📊 Estado del mensaje:
  Estado: delivered
  Fecha enviado: 2026-02-05

==================================================
```

**Revisa tu WhatsApp** - Deberías recibir un mensaje del bot.

---

## ❌ Solución de Problemas

### Error: "No se pudo conectar con Twilio"
**Causa:** Credenciales incorrectas o sin conexión a internet.

**Solución:**
1. Verifica que `.env.development` tenga:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   ```
2. Comprueba conexión a internet
3. Verifica que las credenciales sean correctas en:
   https://console.twilio.com/us1/account/keys-credentials/api-keys

---

### Error: "Error al enviar mensaje - Error 21608"
**Causa:** El número no ha hecho "join" al Sandbox.

**Solución:**
1. Abre WhatsApp
2. Envía `join <tu-código>` al número +1 (415) 523-8886
3. Espera confirmación
4. Vuelve a intentar

---

### Error: "The 'To' number is not a valid phone number"
**Causa:** Formato de número incorrecto.

**Solución:**
Usa formato internacional completo:
```bash
# ✅ Correcto
node src/testTwilioEnviar.js +5215551234567

# ❌ Incorrecto
node src/testTwilioEnviar.js 5551234567
node src/testTwilioEnviar.js +52 55 5123 4567
```

---

### Error: "Cannot find module"
**Causa:** Dependencias no instaladas.

**Solución:**
```bash
cd backend
npm install
```

---

## 🔗 Links Útiles

- **Twilio Console:** https://console.twilio.com
- **WhatsApp Sandbox:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- **API Keys:** https://console.twilio.com/us1/account/keys-credentials/api-keys
- **Messaging Logs:** https://console.twilio.com/us1/monitor/logs/sms
- **Documentación Twilio:** https://www.twilio.com/docs/whatsapp

---

## 📱 Números de Prueba

### Sandbox (Desarrollo)
- **Número de Twilio:** +1 (415) 523-8886
- **Formato en código:** `whatsapp:+14155238886`
- **Tu código join:** Ve a https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

### Producción (Requiere número aprobado)
Para usar un número propio de WhatsApp Business:
1. Ve a: https://console.twilio.com/us1/develop/sms/senders
2. Request Access: WhatsApp Business
3. Sigue el proceso de aprobación de Facebook/Meta
4. Actualiza `TWILIO_WHATSAPP_NUMBER_CLIENTES` en `.env.production`

---

## 🎯 Próximos Pasos

Una vez que verifiques que Twilio funciona:

1. **Probar el webhook completo:**
   - Despliega el backend en Railway
   - Configura el webhook en Twilio Console
   - Envía un mensaje al bot desde WhatsApp

2. **Probar el bot de pedidos:**
   - Envía "menu" al bot
   - Haz un pedido completo
   - Verifica que se cree en la base de datos

3. **Probar notificaciones:**
   - Crea un pedido desde el dashboard
   - Verifica que el cliente reciba notificación

---

## 💡 Tips

- **Sandbox Timeout:** La conexión join expira después de 72 horas de inactividad
- **Límites gratuitos:** La cuenta trial tiene límites. Ve a: https://console.twilio.com/us1/billing/overview
- **Testing:** Usa ngrok para probar webhooks localmente: `ngrok http 3000`
- **Logs:** Revisa logs en tiempo real: https://console.twilio.com/us1/monitor/logs/sms
