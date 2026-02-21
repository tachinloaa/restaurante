# 📱 Configuración de Twilio WhatsApp - El Rinconcito

Guía paso a paso para configurar WhatsApp Business con Twilio.

## 📋 Requisitos

- Cuenta de Twilio (gratuita para pruebas)
- Servidor backend accesible públicamente (Railway, ngrok, etc.)
- Número de WhatsApp personal para pruebas

---

## 🚀 PASO 1: Crear Cuenta en Twilio

1. Ve a [https://www.twilio.com](https://www.twilio.com)
2. Haz clic en **Sign Up** (Registrarse)
3. Completa el formulario con:
   - Email
   - Password
   - Datos personales
4. Verifica tu email
5. Verifica tu número de teléfono

---

## 🔧 PASO 2: Configurar WhatsApp Sandbox (Development)

### 2.1 Acceder al Sandbox

1. Inicia sesión en [Twilio Console](https://console.twilio.com)
2. En el menú lateral: **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Verás instrucciones para conectar tu WhatsApp

### 2.2 Conectar tu WhatsApp

1. En la pantalla del Sandbox, verás:
   ```
   join <código-único>
   ```
   Ejemplo: `join coffee-mountain`

2. Abre WhatsApp en tu teléfono
3. Crea un nuevo chat con el número mostrado (generalmente: `+1 415 523 8886`)
4. Envía el mensaje: `join coffee-mountain` (usa tu código)
5. Recibirás confirmación de Twilio

✅ ¡Tu WhatsApp está conectado al Sandbox!

---

## 🔗 PASO 3: Configurar Webhooks

### 3.1 Obtener URL del Servidor

**Opción A: Railway (Producción)**
- Despliega tu backend en Railway
- Copia la URL: `https://tu-proyecto.railway.app`

**Opción B: ngrok (Desarrollo Local)**
```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto 3000
ngrok http 3000

# Copiar URL HTTPS: https://abc123.ngrok.io
```

### 3.2 Configurar Webhook en Twilio

1. En Twilio Console → **Messaging** → **Settings** → **WhatsApp Sandbox settings**

2. En **"WHEN A MESSAGE COMES IN":**
   - Pega tu URL + `/webhook`
   - Ejemplo: `https://restaurante-production-fbf5.up.railway.app/webhook`
   - Método: **POST**

3. En **"STATUS CALLBACK URL"** (opcional):
   - Pega tu URL + `/webhook/status`
   - Ejemplo: `https://el-rinconcito.railway.app/webhook/status`

4. Haz clic en **Save**

---

## 🔑 PASO 4: Obtener Credenciales

### 4.1 Account SID y Auth Token

1. En [Twilio Console](https://console.twilio.com)
2. En el Dashboard principal, encontrarás:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: Haz clic en "Show" para ver

### 4.2 Números de WhatsApp

Para **Development (Sandbox)**:
```
TWILIO_WHATSAPP_NUMBER_CLIENTES=whatsapp:+14155238886
TWILIO_WHATSAPP_NUMBER_ADMIN=whatsapp:+14155238886
```

---

## ⚙️ PASO 5: Configurar Variables de Entorno

Edita `backend/.env.development`:

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui

# WhatsApp Numbers (Sandbox)
TWILIO_WHATSAPP_NUMBER_CLIENTES=whatsapp:+14155238886
TWILIO_WHATSAPP_NUMBER_ADMIN=whatsapp:+14155238886
```

---

## ✅ PASO 6: Probar la Configuración

### 6.1 Iniciar el Backend

```bash
cd backend
npm run dev
```

Deberías ver:
```
✅ Conexión exitosa a Twilio - Cuenta: El Rinconcito
🌐 URL: http://localhost:3000
```

### 6.2 Enviar Mensaje de Prueba

1. Abre WhatsApp
2. Envía "Hola" al número del Sandbox
3. Deberías recibir el menú del restaurante

**Si funciona:** ✅ ¡Configuración exitosa!

**Si no funciona:** Revisa:
- Logs del backend (`backend/logs/combined.log`)
- Configuración de webhooks en Twilio
- URL del webhook sea accesible públicamente
- Credenciales sean correctas

---

## 🏭 PASO 7: Producción (WhatsApp Business API)

Para usar números reales en producción:

### 7.1 Solicitar Acceso a WhatsApp Business API

1. En Twilio Console → **Messaging** → **Senders** → **WhatsApp Senders**
2. Haz clic en **Request Access**
3. Completa el formulario con:
   - Información del negocio
   - Documentos legales
   - Caso de uso
   - Volumen esperado de mensajes

### 7.2 Aprobar Plantillas de Mensajes

WhatsApp requiere plantillas pre-aprobadas para ciertos mensajes:

1. Crear plantilla en Twilio Console
2. Enviar para aprobación
3. Esperar aprobación (24-48 horas)

### 7.3 Configurar Número Real

Una vez aprobado:

```env
# Producción
TWILIO_WHATSAPP_NUMBER_CLIENTES=whatsapp:+521234567890
TWILIO_WHATSAPP_NUMBER_ADMIN=whatsapp:+520987654321
```

---

## 🐛 Troubleshooting

### Error: "Webhook returned 403"
- Verifica que la validación de firma de Twilio esté correcta
- En desarrollo, puedes deshabilitarla temporalmente

### Error: "Cannot POST /webhook"
- Verifica la ruta en el backend
- Asegúrate que el servidor esté corriendo
- Revisa CORS

### Bot no responde
1. Verifica logs: `backend/logs/combined.log`
2. Prueba el endpoint manualmente:
   ```bash
   curl -X POST http://localhost:3000/api/health
   ```
3. Revisa que el webhook esté configurado correctamente

### Mensajes no llegan al admin
- Verifica `TWILIO_WHATSAPP_NUMBER_ADMIN`
- Asegúrate que el número admin esté conectado al Sandbox
- Revisa logs de Twilio Console

---

## 📊 Monitorear Mensajes

1. En [Twilio Console](https://console.twilio.com)
2. **Monitor** → **Logs** → **WhatsApp**
3. Verás todos los mensajes enviados/recibidos

---

## 💰 Costos

### Sandbox (Gratis)
- Ilimitado para desarrollo
- Solo números pre-aprobados
- Mensaje de sandbox en cada mensaje

### Producción
- **Recibir mensajes:** Gratis
- **Enviar mensajes:**
  - Dentro de 24h de respuesta: Gratis
  - Mensajes iniciados por negocio: ~$0.005 USD por mensaje
  - Plantillas pre-aprobadas: Variable por país

Ver precios actuales: [Twilio Pricing](https://www.twilio.com/en-us/whatsapp/pricing)

---

## 📚 Recursos Adicionales

- [Twilio WhatsApp Quickstart](https://www.twilio.com/docs/whatsapp/quickstart/node)
- [WhatsApp Business API Docs](https://www.twilio.com/docs/whatsapp/api)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)

---

## ✅ Checklist de Configuración

- [ ] Cuenta de Twilio creada
- [ ] WhatsApp conectado al Sandbox
- [ ] Credenciales obtenidas (SID y Token)
- [ ] Variables de entorno configuradas
- [ ] Webhooks configurados en Twilio
- [ ] Backend funcionando y accesible
- [ ] Prueba de envío/recepción exitosa
- [ ] Logs funcionando correctamente

---

**El Rinconcito** 🌮 - Sistema de Gestión de Pedidos

¿Necesitas ayuda? Revisa los logs o contacta soporte de Twilio.
