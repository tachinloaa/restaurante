# Actualizar Variables de Entorno en Render

## ✅ El sistema ya está configurado para funcionar automáticamente

El código ya tiene configurado el número del admin por defecto: **+5215519060013**

Solo necesitas asegurarte de que estas variables de entorno estén en Render:

### Variables necesarias en Render:

```bash
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://oppjntxqwpalnjwtrpjz.supabase.co
SUPABASE_KEY=tu-supabase-anon-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Frontend
FRONTEND_URL=https://el-rinconcito.pages.dev
```

---

## 📱 Importante: Unir tu número al Sandbox de Twilio

Para que te lleguen las notificaciones a **+5215519060013**, necesitas:

1. Desde tu WhatsApp personal, envía un mensaje al número de Twilio: **+1 415 523 8886**
2. Escribe: `join [codigo-sandbox]`
3. Recibirás: "You are all set!"

💡 **¿Dónde encuentro el código?**
- Ve a: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- Verás algo como: "join happy-tiger" o "join cool-cat"

---

## 🎯 Opcional: Cambiar número del admin

Si quieres usar otro número, agrega en Render:

```bash
ADMIN_PHONE_NUMBER=+5215512345678
```

(Recuerda: formato internacional con +52 para México)

---

## ✅ Verificar que funcione:

1. Entra a WhatsApp y escribe `hola` al bot de Twilio
2. Haz un pedido completo
3. Deberías recibir una notificación en el número del admin

Si no llega, revisa en Render > Logs:
- Busca: "Mensaje enviado a admin" 
- O errores de Twilio (21606 = número no verificado en sandbox)
