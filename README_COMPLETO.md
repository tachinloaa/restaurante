# 🌮 El Rinconcito - Sistema de Pedidos por WhatsApp

Sistema completo para gestionar pedidos de restaurante vía WhatsApp con panel de administración web.

## 🚀 Stack Tecnológico

### Frontend
- **React** + **Vite** - UI moderna y rápida
- **Tailwind CSS** - Diseño responsive
- **Cloudflare Pages** - Hosting con bandwidth ilimitado

### Backend
- **Node.js** + **Express** - API REST
- **Render** - Hosting con requests ilimitados
- **Twilio** - WhatsApp Business API

### Base de Datos
- **Supabase** - PostgreSQL con 2GB transferencia/mes

---

## 🎯 Características

### Bot de WhatsApp
- ✅ Menú interactivo por categorías
- ✅ Carrito de compras
- ✅ Validación en tiempo real
- ✅ Múltiples tipos de pedido (domicilio, restaurante, para llevar)
- ✅ Notificaciones automáticas al admin

### Panel de Administración
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de productos, categorías y subcategorías
- ✅ Seguimiento de pedidos
- ✅ Base de datos de clientes
- ✅ Analytics y reportes
- ✅ Modo oscuro
- ✅ Notificaciones en tiempo real

---

## 💰 Costos con 1000 usuarios/mes

```
✅ Frontend (Cloudflare):     $0 - Bandwidth ILIMITADO
✅ Backend (Render):          $0 - Requests ILIMITADOS
✅ Base de datos (Supabase):  $0 - 2GB transferencia
❌ Twilio (WhatsApp):         ~$20-30/mes (único costo)
─────────────────────────────────────────────────────
TOTAL:                        ~$25/mes
```

**Solo pagas Twilio.** Todo lo demás es gratis sin límites. 💪

---

## 🚀 Despliegue

### Opción 1: Despliegue Automático (Recomendado)

```bash
# 1. Clona el repositorio
git clone https://github.com/tachinloaa/restaurante.git
cd restaurante

# 2. Ejecuta el script de despliegue
deploy-cloudflare-render.bat
```

Luego sigue la guía: [DEPLOY_CLOUDFLARE_RENDER.md](DEPLOY_CLOUDFLARE_RENDER.md)

### Opción 2: Despliegue Manual

1. **Backend en Render:**
   - Conecta tu repo de GitHub
   - Configura variables de entorno
   - Deploy automático

2. **Frontend en Cloudflare Pages:**
   - Conecta tu repo de GitHub
   - Framework: Vite
   - Build: `npm run build`
   - Output: `dist`

Documentación completa: [DEPLOY_CLOUDFLARE_RENDER.md](DEPLOY_CLOUDFLARE_RENDER.md)

---

## 🔧 Desarrollo Local

### Requisitos
- Node.js 18+
- npm o pnpm
- Cuenta en Supabase
- Cuenta en Twilio (WhatsApp Sandbox)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configura las variables de entorno
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Configura las variables de entorno
npm run dev
```

---

## 📁 Estructura del Proyecto

```
restaurante/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuración (DB, Twilio, etc.)
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── models/         # Modelos de datos
│   │   ├── routes/         # Rutas de la API
│   │   ├── services/       # Servicios (Bot, Twilio, etc.)
│   │   ├── middlewares/    # Middlewares
│   │   └── utils/          # Utilidades
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas
│   │   ├── context/        # Context API (Auth, Theme, etc.)
│   │   ├── services/       # Servicios API
│   │   ├── config/         # Configuración
│   │   └── styles/         # Estilos globales
│   ├── .env.example
│   └── package.json
│
├── docs/                   # Documentación adicional
├── DEPLOY_CLOUDFLARE_RENDER.md
└── README.md
```

---

## 🌐 Variables de Entorno

### Backend (.env)

```env
NODE_ENV=production
PORT=10000

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key

# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=tu_numero
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_CLIENTES=whatsapp:+52tu_numero
TWILIO_WHATSAPP_ADMIN=whatsapp:+52tu_numero

# Frontend
FRONTEND_URL=https://tu-sitio.pages.dev

# Logging
LOG_LEVEL=info
```

### Frontend (.env)

```env
VITE_API_URL=https://tu-backend.onrender.com/api
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

---

## 🔐 Configuración de Supabase

### 1. Crear proyecto en Supabase

1. Ve a https://supabase.com
2. Crea un nuevo proyecto
3. Copia URL y Anon Key

### 2. Ejecutar SQL

Ejecuta los scripts en este orden:
1. `docs/DATABASE.sql` - Tablas principales
2. `docs/SUPABASE_RLS.sql` - Políticas de seguridad
3. `docs/NOTIFICACIONES.sql` - Sistema de notificaciones

---

## 📱 Configuración de Twilio

### 1. Crear cuenta

1. Ve a https://www.twilio.com
2. Crea cuenta gratuita ($15 de crédito)
3. Verifica tu número de teléfono

### 2. Configurar WhatsApp Sandbox

1. Ve a: Console → Messaging → Try it out → WhatsApp
2. Envía mensaje de activación a tu WhatsApp
3. Copia las credenciales

### 3. Configurar Webhook

Una vez desplegado el backend:
```
URL: https://tu-backend.onrender.com/api/webhooks/whatsapp
Method: POST
```

Documentación completa: [docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md)

---

## ✅ Verificar Despliegue

### Backend (Render)
```bash
node backend/check-render.js https://tu-backend.onrender.com
```

### Frontend (Cloudflare)
```bash
node frontend/check-cloudflare.js https://tu-sitio.pages.dev
```

---

## 📊 Límites del Plan Gratuito

### Cloudflare Pages ✅
- ✅ **Bandwidth: ILIMITADO**
- ✅ **Requests: ILIMITADOS**
- ✅ Builds: 500/mes
- ✅ Proyectos: 100

### Render ✅
- ✅ **Requests: ILIMITADOS**
- ✅ Horas: 750/mes (24/7)
- ✅ Bandwidth: 100GB/mes
- ⚠️ Sleep después de 15min inactivo

### Supabase ✅
- ✅ Almacenamiento: 500MB
- ✅ Transferencia: 2GB/mes
- ✅ Usuarios: 50,000 MAU
- ✅ Queries: Ilimitadas

### Twilio ❌
- ❌ $1/mes por número
- ❌ $0.005 por mensaje enviado
- ❌ $0.004 por mensaje recibido
- 💳 **~$20-30/mes** con uso moderado

---

## 🔄 Despliegues Automáticos

Cada `git push` a `main`:
- ✅ Render redesplega el backend automáticamente
- ✅ Cloudflare redesplega el frontend automáticamente

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

¡Y listo! Ambos servicios se actualizan solos en 3-5 minutos.

---

## 🐛 Solución de Problemas

### El backend se duerme (Render)

**Solución:** Configura UptimeRobot (gratis)
- URL: https://uptimerobot.com
- Monitor: https://tu-backend.onrender.com/api/health
- Intervalo: 5 minutos

### Errores de CORS

Verifica en Render:
```env
FRONTEND_URL=https://tu-sitio.pages.dev
```
Sin barra final `/`

### Webhook de Twilio no funciona

1. Verifica la URL en Twilio Console
2. Debe ser: `https://tu-backend.onrender.com/api/webhooks/whatsapp`
3. Método: POST
4. Revisa logs en Render

### Build falla en Cloudflare

1. Verifica `VITE_API_URL` en variables de entorno
2. Prueba `npm run build` localmente
3. Revisa logs del build en Cloudflare

---

## 📚 Documentación Adicional

- [Despliegue Cloudflare + Render](DEPLOY_CLOUDFLARE_RENDER.md)
- [Configuración de Base de Datos](docs/DATABASE.md)
- [Setup de Twilio](docs/TWILIO_SETUP.md)
- [Sistema de Notificaciones](docs/NOTIFICACIONES.md)
- [Modo Oscuro](DARK_MODE_GUIDE.md)

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 👨‍💻 Autor

**Tu Nombre**
- GitHub: [@tachinloaa](https://github.com/tachinloaa)

---

## 🌟 Características Destacadas

### ♾️ Sin Límites
- Bandwidth ilimitado (Cloudflare)
- Requests ilimitados (Render)
- Queries ilimitadas (Supabase)

### ⚡ Performance
- CDN global (Cloudflare)
- HTTP/3 y Brotli
- Caché inteligente
- Tiempo de respuesta <100ms

### 🔒 Seguridad
- HTTPS automático
- Row Level Security (Supabase)
- Validación de webhooks (Twilio)
- CORS configurado

### 📱 Mobile First
- Diseño responsive
- Bot conversacional intuitivo
- Panel admin optimizado para móvil

---

## 🎉 ¿Por qué esta stack?

**Antes (Netlify + Railway):**
- ⚠️ 125k requests/mes límite
- ⚠️ 100GB bandwidth límite
- ⚠️ $5/mes Railway después de 500h
- ❌ Se "acaba" con tráfico alto

**Ahora (Cloudflare + Render):**
- ✅ Requests ILIMITADOS
- ✅ Bandwidth ILIMITADO
- ✅ 750h gratis/mes
- ✅ NUNCA se acaba

**Tu aplicación puede crecer sin preocuparte por costos.** 🚀

---

Made with ❤️ for restaurants
