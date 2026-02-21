# 🔒 Sistema de Seguridad - El Rinconcito API

## ✅ Implementado

### 1. **Autenticación JWT** ✅
- Login con usuario y contraseña
- Token JWT con expiración configurable (default: 24h)
- Refresh automático vía frontend

### 2. **Autorización por Roles** ✅
- **Admin**: Acceso total (CRUD productos, pedidos, dashboard, analytics)
- **User**: Solo lectura (futuro: para clientes web)
- **Bot**: Solo WhatsApp webhook (sin cambios en el flujo actual)

### 3. **Rate Limiting** ✅
- **API Pública**: 100 req/15min (GET sin auth)
- **API Autenticada**: 300 req/15min (con token)
- **Login**: 5 intentos/15min (previene brute force)
- **Webhooks**: 30 req/min (ya existía, sin cambios)
- **Redis**: Store compartido entre instancias (producción)

### 4. **Validación de Inputs** ✅
- Sanitización automática (escape HTML/XSS)
- Validación de tipos (números, emails, UUIDs)
- Límites de longitud
- Express-validator en todas las rutas

---

## 📋 Configuración

### 1. **Instalar dependencias**
```bash
npm install
```

Dependencias nuevas agregadas:
- `jsonwebtoken` - Generación y verificación de JWT
- `bcryptjs` - Hashing de passwords
- `rate-limit-redis` - Rate limiting distribuido con Redis

### 2. **Generar hash de password**

**Opción A: En desarrollo (servidor corriendo)**
```bash
# POST http://localhost:3000/api/auth/hash-password
curl -X POST http://localhost:3000/api/auth/hash-password \
  -H "Content-Type: application/json" \
  -d '{"password":"tu-password-seguro"}'
```

Respuesta:
```json
{
  "success": true,
  "message": "Hash generado (copia esto a ADMIN_PASSWORD_HASH en .env)",
  "data": {
    "hash": "$2a$10$..."
  }
}
```

**Opción B: Con Node.js**
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('tu-password', 10).then(console.log)"
```

### 3. **Configurar variables de entorno**

Copia `.env.example` a `.env.development` y configura:

```env
# JWT
JWT_SECRET=genera-clave-aleatoria-de-64-caracteres-minimo
JWT_EXPIRES_IN=24h

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$tu.hash.generado.aqui

# Redis (opcional en dev, requerido en prod con múltiples instancias)
REDIS_URL=redis://default:password@host:6379
REDIS_ENABLED=true
```

**⚠️ IMPORTANTE: Genera JWT_SECRET aleatorio**
```bash
# Linux/Mac
openssl rand -base64 64

# Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🔑 Uso del API

### 1. **Login (obtener token)**

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "tu-password"
}
```

Respuesta exitosa (200):
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "username": "admin",
      "role": "admin"
    },
    "expiresIn": "24h"
  }
}
```

Errores comunes:
- **401**: Usuario o contraseña incorrectos
- **429**: Demasiados intentos (espera 15min)

### 2. **Verificar token**

```http
GET /api/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Respuesta (200):
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

### 3. **Usar token en requests protegidos**

Todas las rutas POST/PUT/DELETE y rutas de admin requieren el header:

```http
GET /api/dashboard/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 🛡️ Rutas Protegidas

### Sin autenticación (Públicas)
```
GET  /api/products          - Listar productos
GET  /api/products/:id      - Ver producto
GET  /api/categories        - Listar categorías
GET  /api/categories/:id    - Ver categoría
GET  /api/subcategories     - Listar subcategorías
POST /webhook               - Webhook Twilio (sin cambios)
```

### Con autenticación Admin
```
# Productos
POST   /api/products        - Crear producto
PUT    /api/products/:id    - Editar producto
DELETE /api/products/:id    - Eliminar producto

# Pedidos
GET    /api/orders          - Listar pedidos
POST   /api/orders          - Crear pedido
PUT    /api/orders/:id/status - Cambiar estado
DELETE /api/orders/:id      - Cancelar pedido

# Categorías
POST   /api/categories      - Crear categoría
PUT    /api/categories/:id  - Editar categoría
DELETE /api/categories/:id  - Eliminar categoría

# Dashboard
GET    /api/dashboard/*     - Todas las rutas

# Analytics
GET    /api/analytics/*     - Todas las rutas

# Notificaciones
GET    /api/notifications/* - Todas las rutas

# Clientes
GET    /api/customers/*     - Todas las rutas
```

---

## 🚨 Rate Limiting

| Ruta | Límite | Ventana | ID |
|------|--------|---------|-----|
| `/api/auth/login` | 5 req | 15 min | IP |
| `/api/*` (público) | 100 req | 15 min | IP |
| `/api/*` (autenticado) | 300 req | 15 min | User ID |
| `/webhook` | 30 req | 1 min | Teléfono |

**Respuesta cuando se excede:**
```json
{
  "success": false,
  "message": "Demasiadas peticiones. Intenta de nuevo en X minutos."
}
```

Headers de rate limit:
```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1677777777
```

---

## 🔄 Integración Frontend

### 1. **Login**
```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'tu-password'
  })
});

const { data } = await response.json();

// Guardar token
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

### 2. **Usar token en requests**
```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ nombre: 'Taco', precio: 15 })
});
```

### 3. **Verificar token al cargar app**
```javascript
const verifyAuth = async () => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const response = await fetch('http://localhost:3000/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};
```

### 4. **Manejo de errores 401/403**
```javascript
// Interceptor para Axios / fetch wrapper
if (response.status === 401) {
  // Token expirado o inválido
  localStorage.removeItem('token');
  window.location.href = '/login';
}

if (response.status === 403) {
  // Sin permisos
  alert('No tienes permisos para esta acción');
}
```

---

## 🏭 Producción (Render)

### 1. **Variables de entorno en Render**

Dashboard → Environment → Environment Variables:

```
JWT_SECRET=<tu-clave-aleatoria-64-chars>
JWT_EXPIRES_IN=24h
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<tu-hash-bcrypt>
REDIS_URL=<url-de-redis-render>
REDIS_ENABLED=true
```

### 2. **Redis en Render**

Dashboard → Create → Redis:
- Plan: Free (25MB, suficiente)
- Copia la "Internal Redis URL"
- Pégala en `REDIS_URL`

**¿Por qué Redis en producción?**
- Sin Redis: Rate limiting en memoria → bypass con múltiples instancias
- Con Redis: Rate limiting compartido → seguridad real

### 3. **Primer deploy**
```bash
git add .
git commit -m "feat: implement JWT auth + rate limiting + roles"
git push origin main
```

Render auto-despliega (~2-3 min).

### 4. **Verificar**
```bash
# Health check
curl https://tu-app.onrender.com/api/health

# Login
curl -X POST https://tu-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"tu-password"}'
```

---

## 📊 Logs de Seguridad

Los logs incluyen eventos de seguridad:

```
✅ Usuario autenticado: admin (admin)
✅ Autorización exitosa para admin (admin)
❌ Intento de login fallido para usuario: hacker
❌ Acceso denegado para user (user). Requiere: admin
⚠️ Rate limit excedido para: 192.168.1.1
```

---

## ⚠️ Importante

### ✅ NO cambiar:
- Webhooks de Twilio (`/webhook`) - Sin autenticación por diseño
- Bot service - Funciona igual que antes
- Flujo de pedidos por WhatsApp - Sin cambios

### ⚠️ Cambios requeridos en Frontend:
1. Agregar pantalla de login
2. Guardar token en localStorage
3. Enviar token en header de requests protegidos
4. Manejar errores 401 (redirect a login)

### 🔐 Seguridad:
- **NUNCA** commitear `.env` o `.env.production` al repositorio
- Rotaciónar JWT_SECRET periódicamente (cada 3-6 meses)
- Usar HTTPS en producción (Render lo maneja)
- Monitorear logs de intentos de login fallidos

---

## 🐛 Troubleshooting

### "Token inválido o expirado"
- Verifica que JWT_SECRET sea igual en todas las instancias
- Regenera token con POST /api/auth/login
- Verifica que el header sea: `Authorization: Bearer <token>`

### "No tienes permisos para esta acción"
- Tu usuario no es admin
- Token no contiene rol correcto
- Verifica con GET /api/auth/verify

### Rate limit constante
- Redis no configurado → usando memoria (bypass fácil)
- Configura REDIS_URL en producción
- En dev es normal (memoria local)

### Login no funciona después de deploy
- ADMIN_PASSWORD_HASH mal configurado en Render
- Regenera hash y actualiza variable
- Verifica logs: "ADMIN_PASSWORD_HASH no configurado"

---

## 📚 Referencias

- [JWT.io](https://jwt.io/) - Debug tokens
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [Bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
