# 🔐 Variables de Entorno para Render - Seguridad

## ✅ Commit subido exitosamente a GitHub
**Commit:** `54de993` - feat: implementar autenticación JWT, rate limiting y autorización por roles

Render detectará automáticamente el nuevo código y comenzará a desplegarlo.

---

## 🔒 Variables OBLIGATORIAS a agregar en Render

Ve a tu dashboard de Render: **Web Service → Environment**

### 1️⃣ JWT Secret (Autenticación)
```
JWT_SECRET
```
**Valor:**
```
7fdf08036adda3570373953eeffc057c17924372fa7953a54dd0ad44001d8c573c7a2d9544d6a1bd2e3362b5bdf302bc0f0a480a371ac888f2c2a9f588b588d0
```

### 2️⃣ JWT Expiración
```
JWT_EXPIRES_IN
```
**Valor:**
```
24h
```

### 3️⃣ Usuario Admin
```
ADMIN_USERNAME
```
**Valor:**
```
admin@elrinconcito.com
```

### 4️⃣ Hash de Contraseña Admin
```
ADMIN_PASSWORD_HASH
```
**Valor:**
```
$2a$10$FzfasebuiVAfmLRbPg4aFODOyw.18SVrueL8hM1YjuCuREXr221Yy
```

### 📝 Credenciales de Login (MISMAS que Supabase)
```
Email: admin@elrinconcito.com
Password: Admin123!
```

✅ **Ahora usas las MISMAS credenciales para todo**

---

## 🔄 Redis (Muy recomendado para producción)

### Opción A: Crear Redis en Render (Recomendado)

1. **Dashboard Render** → **New** → **Redis**
2. **Name:** `el-rinconcito-redis`
3. **Plan:** Free (25MB - suficiente)
4. **Create Redis**

Una vez creado, copia la **Internal Redis URL** (algo como: `redis://red-xxxxx:6379`)

Luego agrega estas variables en tu **Web Service**:

```
REDIS_URL
```
**Valor:** `redis://red-xxxxx:6379` (la URL interna que copiaste)

```
REDIS_ENABLED
```
**Valor:** `true`

### Opción B: Sin Redis (No recomendado)

Si no agregas Redis, el rate limiting funcionará en memoria, pero:
- ⚠️ Se perderá al reiniciar el servidor
- ⚠️ No funcionará correctamente con múltiples instancias

Agrega solo:
```
REDIS_ENABLED
```
**Valor:** `false`

---

## 🚀 Pasos en Render

### 1. Agregar Variables de Entorno

1. Ve a tu **Web Service** en Render dashboard
2. Click en **Environment** (menú izquierdo)
3. Click en **Add Environment Variable**
4. Copia y pega una por una las variables de arriba
5. Click en **Save Changes**

### 2. Crear Redis (si elegiste Opción A)

1. Dashboard → **New** → **Redis**
2. Name: `el-rinconcito-redis`
3. Region: **Igual que tu Web Service**
4. Plan: **Free**
5. **Create Redis**
6. Copia la **Internal Redis URL**
7. Ve a tu Web Service → Environment
8. Agrega `REDIS_URL` con la URL copiada
9. Agrega `REDIS_ENABLED` = `true`
10. **Save Changes**

### 3. Verificar Despliegue

El despliegue se hace automáticamente después de agregar las variables.

**Monitorea en:** Web Service → **Logs**

Deberías ver:
```
✅ Configuración cargada correctamente
✅ Rate limiting: Redis conectado
✅ Servidor iniciado en puerto 3000
```

---

## 🧪 Probar en Producción

Una vez desplegado, prueba el login:

```bash
curl -X POST https://tu-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@elrinconcito.com","password":"Admin123!"}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "admin-001",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

---

## ⚠️ Variables Existentes (NO tocar)

Estas ya las tienes configuradas:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_KEY`
- ✅ `TWILIO_ACCOUNT_SID`
- ✅ `TWILIO_AUTH_TOKEN`
- ✅ `TWILIO_WHATSAPP_NUMBER_CLIENTES`
- ✅ `ADMIN_PHONE_NUMBER`
- ✅ `FRONTEND_URL`
- ✅ `NODE_ENV=production`

**NO** las borres ni modifiques.

---

## 📋 Checklist Final

- [ ] JWT_SECRET agregado
- [ ] JWT_EXPIRES_IN agregado
- [ ] ADMIN_USERNAME agregado
- [ ] ADMIN_PASSWORD_HASH agregado
- [ ] Redis creado en Render (opcional pero recomendado)
- [ ] REDIS_URL agregado (si creaste Redis)
- [ ] REDIS_ENABLED=true agregado (si creaste Redis)
- [ ] Variables guardadas en Render
- [ ] Deployment exitoso (ver logs)
- [ ] Login probado en producción
- [ ] Credenciales guardadas en lugar seguro

---

## 🎯 Resumen

### Variables a agregar en Render:

```env
# Seguridad JWT (4 variables OBLIGATORIAS)
JWT_SECRET=7fdf08036adda3570373953eeffc057c17924372fa7953a54dd0ad44001d8c573c7a2d9544d6a1bd2e3362b5bdf302bc0f0a480a371ac888f2c2a9f588b588d0
JWT_EXPIRES_IN=24h
ADMIN_USERNAME=admin@elrinconcito.com
ADMIN_PASSWORD_HASH=$2a$10$FzfasebuiVAfmLRbPg4aFODOyw.18SVrueL8hM1YjuCuREXr221Yy

# Redis (2 variables opcionales pero recomendadas)
REDIS_URL=redis://red-xxxxx:6379
REDIS_ENABLED=true
```

### Login de Producción:
```
Email: admin@elrinconcito.com
Password: Admin123!
```
**✅ Las MISMAS credenciales que usas en Supabase**

---

## 💡 Troubleshooting

### Error: "JWT_SECRET no está configurado"
- Verifica que agregaste JWT_SECRET en Environment
- Verifica que guardaste los cambios
- Espera a que Render redesplegue (1-2 minutos)

### Error: "ADMIN_PASSWORD_HASH no está configurado"
- Verifica que agregaste ADMIN_PASSWORD_HASH
- Copia el hash COMPLETO (incluye el `$2a$10$...`)

### Error: "Redis connection failed"
- Si NO agregaste Redis: Configura `REDIS_ENABLED=false`
- Si SÍ agregaste Redis: Verifica que `REDIS_URL` tenga la URL interna correcta

### Login 401 Unauthorized
- Verifica email: `admin@elrinconcito.com`
- Verifica contraseña: `Admin123!`
- Verifica que ADMIN_PASSWORD_HASH coincida con esa contraseña

---

✅ **Una vez configurado, tu API estará 100% protegida con autenticación JWT y rate limiting distribuido.**
