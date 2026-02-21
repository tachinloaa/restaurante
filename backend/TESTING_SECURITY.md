# 🧪 Tests Rápidos - Sistema de Seguridad

## 📋 Checklist Pre-Testing

```bash
# 1. Instalar dependencias nuevas
npm install

# 2. Configurar .env (copia .env.example)
# - JWT_SECRET
# - ADMIN_USERNAME
# - ADMIN_PASSWORD_HASH

# 3. Iniciar servidor
npm run dev
```

---

## ✅ Test 1: Generar Hash de Password

```bash
# Método 1: API (servidor debe estar corriendo)
curl -X POST http://localhost:3000/api/auth/hash-password \
  -H "Content-Type: application/json" \
  -d '{"password":"MiPassword123"}'

# Método 2: Node directamente
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('MiPassword123', 10).then(console.log)"
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Hash generado (copia esto a ADMIN_PASSWORD_HASH en .env)",
  "data": {
    "hash": "$2a$10$..."
  }
}
```

✅ Copia el hash a `.env` → `ADMIN_PASSWORD_HASH=...`

---

## ✅ Test 2: Login Exitoso

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MiPassword123"}'
```

**Resultado esperado (200):**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "username": "admin",
      "role": "admin"
    },
    "expiresIn": "24h"
  }
}
```

✅ **Guarda el token** para los siguientes tests:
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## ✅ Test 3: Login Fallido

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"PasswordIncorrecto"}'
```

**Resultado esperado (401):**
```json
{
  "success": false,
  "message": "Usuario o contraseña incorrectos"
}
```

---

## ✅ Test 4: Verificar Token

```bash
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "admin-1",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

---

## ✅ Test 5: Acceso a Ruta Pública (sin token)

```bash
# Listar productos (GET = público)
curl http://localhost:3000/api/products
```

**Resultado esperado (200):**
```json
{
  "success": true,
  "data": [
    { "id": "...", "nombre": "Taco", "precio": 15 }
  ]
}
```

✅ **Funciona sin token** (rutas GET son públicas)

---

## ✅ Test 6: Acceso a Ruta Protegida SIN Token

```bash
# Intentar crear producto sin token
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Taco Nuevo","precio":20,"categoria_id":"xxx"}'
```

**Resultado esperado (401):**
```json
{
  "success": false,
  "message": "Token de autenticación requerido"
}
```

✅ **Bloqueado** (POST requiere auth)

---

## ✅ Test 7: Acceso a Ruta Protegida CON Token

```bash
# Crear producto con token
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nombre":"Taco Test","precio":20,"categoria_id":"4f97841a-66d4-4e8a-b12c-801c078eab9a"}'
```

**Resultado esperado (201):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "nombre": "Taco Test",
    "precio": 20
  }
}
```

✅ **Permitido** (admin con token válido)

---

## ✅ Test 8: Rate Limiting en Login

```bash
# Ejecutar 6 veces seguidas (límite es 5)
for i in {1..6}; do
  echo "Intento $i:"
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
done
```

**Resultado esperado:**
- Intentos 1-5: **401** (password incorrecto)
- Intento 6: **429** (rate limit excedido)

```json
{
  "success": false,
  "message": "Demasiados intentos de login. Intenta de nuevo en 15 minutos."
}
```

✅ **Rate limiting funciona**

---

## ✅ Test 9: Rate Limiting en API Pública

```bash
# Ejecutar 101 requests (límite es 100 por 15min)
for i in {1..101}; do
  curl -s http://localhost:3000/api/products > /dev/null
  echo "Request $i"
done

# El request 101
curl http://localhost:3000/api/products
```

**Resultado esperado (429):**
```json
{
  "success": false,
  "message": "Demasiadas peticiones al API. Intenta de nuevo en 15 minutos."
}
```

✅ **Rate limiting API funciona**

---

## ✅ Test 10: Webhook de Twilio (sin cambios)

```bash
# Webhook debe funcionar SIN token (por diseño)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+5215512345678&Body=hola"
```

**Resultado esperado (200):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>¡Hola! 👋 Bienvenido a *El Rinconcito* 🌮...</Message>
</Response>
```

✅ **Webhook funciona sin token** (no debe cambiar)

---

## ✅ Test 11: Dashboard (requiere admin)

```bash
curl http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado (200):**
```json
{
  "success": true,
  "data": {
    "pedidosHoy": 5,
    "ventasHoy": 450,
    ...
  }
}
```

---

## ✅ Test 12: Header de Rate Limit

```bash
curl -i http://localhost:3000/api/products
```

**Headers esperados:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1677777777
```

---

## 🏁 Resumen de Tests

| # | Test | Esperado | Status |
|---|------|----------|--------|
| 1 | Generar hash | Hash bcrypt | ⬜ |
| 2 | Login exitoso | Token JWT + 200 | ⬜ |
| 3 | Login fallido | 401 | ⬜ |
| 4 | Verificar token | User data + 200 | ⬜ |
| 5 | Ruta pública sin token | 200 | ⬜ |
| 6 | Ruta protegida sin token | 401 | ⬜ |
| 7 | Ruta protegida con token | 200/201 | ⬜ |
| 8 | Rate limit login | 429 después de 5 | ⬜ |
| 9 | Rate limit API | 429 después de 100 | ⬜ |
| 10 | Webhook sin token | 200 (TwiML) | ⬜ |
| 11 | Dashboard con token | 200 | ⬜ |
| 12 | Headers rate limit | Presentes | ⬜ |

---

## 🚨 Troubleshooting

### Test 1 falla: "Cannot find module 'bcryptjs'"
```bash
npm install
```

### Test 2 falla: "ADMIN_PASSWORD_HASH no configurado"
- Ejecuta Test 1 para generar hash
- Copia hash a `.env` → `ADMIN_PASSWORD_HASH=...`
- Reinicia servidor

### Test 2 falla: "Usuario o contraseña incorrectos"
- Verifica que username en `.env` sea `ADMIN_USERNAME=admin`
- Verifica que password usado en Test 1 sea el mismo que usas aquí
- Regenera hash si es necesario

### Test 4 falla: "Token inválido"
- Verifica que copiaste el token completo (incluye puntos finales)
- Token expira en 24h, regenera con Test 2
- Verifica JWT_SECRET en `.env`

### Test 7 falla: "categoria_id inválido"
- Obtén categorías válidas: `curl http://localhost:3000/api/categories`
- Usa un `id` real en el test

### Test 10 falla: "Cannot POST /webhook"
- Verifica que el servidor esté corriendo
- Webhook debe estar en `/webhook` (raíz), no `/api/webhook`

---

## 🎯 Test de Integración Completa

```bash
#!/bin/bash
# test-security.sh

echo "🧪 Testing Sistema de Seguridad..."
echo ""

# 1. Login
echo "1️⃣ Login..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MiPassword123"}')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login falló"
  exit 1
fi
echo "✅ Token obtenido"
echo ""

# 2. Verificar token
echo "2️⃣ Verificando token..."
curl -s http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN" | grep -q "success.*true"

if [ $? -eq 0 ]; then
  echo "✅ Token válido"
else
  echo "❌ Token inválido"
  exit 1
fi
echo ""

# 3. Acceso público
echo "3️⃣ Acceso público (GET sin token)..."
curl -s http://localhost:3000/api/products | grep -q "success.*true"

if [ $? -eq 0 ]; then
  echo "✅ GET público funciona"
else
  echo "❌ GET público falló"
fi
echo ""

# 4. POST sin token (debe fallar)
echo "4️⃣ POST sin token (debe fallar)..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test"}')

if [ "$RESPONSE" == "401" ]; then
  echo "✅ POST sin token bloqueado (401)"
else
  echo "❌ POST sin token no bloqueado (código: $RESPONSE)"
fi
echo ""

# 5. POST con token (debe funcionar)
echo "5️⃣ POST con token..."
curl -s -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nombre":"Test","precio":10,"categoria_id":"4f97841a-66d4-4e8a-b12c-801c078eab9a"}' \
  | grep -q "success.*true"

if [ $? -eq 0 ]; then
  echo "✅ POST con token funciona"
else
  echo "⚠️ POST con token falló (verifica categoria_id)"
fi
echo ""

echo "✅ Tests completados!"
```

Ejecutar:
```bash
chmod +x test-security.sh
./test-security.sh
```

---

## 📚 Siguiente Paso

Después de verificar que todos los tests pasen:

1. ✅ Commit de cambios
2. ✅ Push a GitHub
3. ✅ Configurar variables en Render
4. ✅ Deploy automático
5. ✅ Actualizar frontend para usar autenticación

Ver [SECURITY.md](./SECURITY.md) para detalles de integración.
