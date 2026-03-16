# 🔐 Variables de Entorno para Render

## ⚠️ IMPORTANTE - Variables Nuevas de Seguridad

Debes agregar estas variables en el dashboard de Render:

### 🏦 Datos Bancarios (NUEVAS - REQUERIDAS)

```
BANCO_NOMBRE=Banco Azteca
BANCO_TITULAR=Maria Elena Paredes
BANCO_CUENTA=4027660008924948
BANCO_CLABE=
BANCO_REFERENCIA=RINCONCITO
```

**⚠️ ACCIÓN REQUERIDA:**
- Si Banco Azteca asigna una CLABE interbancaria, agégala en `BANCO_CLABE`

### 📋 Variables Actuales (Ya Configuradas)

Estas ya las tienes, NO cambies nada:

```
# Supabase
SUPABASE_URL=tu_url
SUPABASE_KEY=tu_key

# Twilio
TWILIO_ACCOUNT_SID=tu_sid
TWILIO_AUTH_TOKEN=tu_token
TWILIO_WHATSAPP_NUMBER_CLIENTES=whatsapp:+14155238886

# Admin
ADMIN_PHONE_NUMBER=+523349420820

# Redis
REDIS_URL=tu_redis_url
REDIS_ENABLED=true

# Entorno
NODE_ENV=production
PORT=3000

# Frontend
FRONTEND_URL=tu_frontend_url
```

---

## 🚀 Cómo Agregar en Render

1. Ve a tu servicio en Render
2. Click en **"Environment"** en el menú lateral
3. Click en **"Add Environment Variable"**
4. Agrega cada variable **UNA POR UNA**:
   - **Key:** `BANCO_CUENTA`
   - **Value:** Tu número de cuenta real
5. Click en **"Save Changes"**
6. Render se reiniciará automáticamente

---

## ✅ Por Qué Este Cambio

**ANTES (❌ INSEGURO):**
- Datos bancarios en el código fuente
- Visibles en GitHub
- Cualquiera podía verlos

**AHORA (✅ SEGURO):**
- Datos bancarios en variables de entorno
- NO están en el código
- Solo tú los ves en Render

---

## 🧪 Verificar que Funciona

Después de agregar las variables:

1. Haz un pedido de prueba con el bot
2. Selecciona "Pagar por transferencia"
3. El bot debe mostrar tus datos bancarios correctos

Si vez "undefined" en algún dato:
- Verifica que agregaste todas las variables
- Verifica que NO tienen espacios al inicio/final
- Reinicia el servicio en Render

---

## 📝 Notas

- Las variables opcionales tienen valores por defecto
- `BANCO_NOMBRE` y `BANCO_TITULAR` tienen defaults, pero puedes cambiarlos
- `BANCO_CUENTA` y `BANCO_CLABE` son **REQUERIDAS**
