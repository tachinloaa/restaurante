# Actualizar Variables de Entorno en Render

## Variables necesarias para notificaciones al admin

Después de hacer push, ve a Render y agrega esta variable de entorno:

### Panel de Render:
1. Ve a: https://dashboard.render.com/
2. Selecciona tu servicio: **el-rinconcito-backend**
3. Click en **Environment** (en el menú lateral)
4. Click en **Add Environment Variable**

### Variable a agregar:

```
ADMIN_PHONE_NUMBER=+5215519060013
```

**IMPORTANTE:** 
- Usar el formato internacional: `+52` (México) + `número sin espacios`
- NO incluir `whatsapp:` al principio
- Ejemplo: `+5215519060013`

### Después de agregar:
El servicio se redesplegará automáticamente en 2-3 minutos.

---

## Variables de entorno completas requeridas:

Para referencia, estas son TODAS las variables necesarias en Render:

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

# Admin
ADMIN_PHONE_NUMBER=+5215519060013

# Frontend
FRONTEND_URL=https://el-rinconcito.pages.dev
```

---

## Verificar que funcione:

1. Entra a WhatsApp y escribe `hola` al bot de Twilio
2. Haz un pedido completo
3. Deberías recibir una notificación en el número: **+5215519060013**

Si no llega la notificación, revisa los logs en Render:
- Dashboard > el-rinconcito-backend > Logs
- Busca: "Mensaje enviado a admin" o errores de Twilio
