# 🌮 El Rinconcito - Sistema de Gestión de Pedidos

Sistema completo de gestión de pedidos para restaurante con WhatsApp Business integrado mediante Twilio.

## 🎯 Características Principales

✅ **Dashboard Administrativo Web (React)**
- Estadísticas en tiempo real
- Gestión de productos con categorías/subcategorías
- Gestión de pedidos con actualización de estados
- Gestión de clientes
- Gráficos y reportes de ventas

✅ **Bot de WhatsApp (Twilio)**
- Menú interactivo automático
- Toma de pedidos conversacional
- Pedidos a domicilio y restaurante
- Notificaciones en tiempo real al admin
- Sistema de sesiones por usuario

✅ **API REST (Node.js + Express)**
- Arquitectura MVC limpia
- Endpoints completos CRUD
- Integración con Supabase
- Webhooks de Twilio
- Logging y manejo de errores

✅ **Base de Datos (Supabase PostgreSQL)**
- Sistema de categorías y subcategorías
- Gestión de productos y stock
- Registro de pedidos y clientes
- Índices optimizados para performance

## 📋 Stack Tecnológico

### Backend
- Node.js 18+
- Express.js
- Twilio WhatsApp API
- Supabase (@supabase/supabase-js)
- Winston (logging)
- Express Validator

### Frontend
- React 18+
- Vite
- React Router v6
- TailwindCSS
- Axios
- React Hot Toast
- Lucide React (iconos)
- Recharts (gráficos)

### Base de Datos
- Supabase PostgreSQL
- UUID primary keys
- Triggers automáticos
- Índices optimizados

### Servicios
- **Hosting Backend:** Railway
- **Hosting Frontend:** Netlify
- **Database:** Supabase
- **WhatsApp:** Twilio

## 🚀 Instalación

### Requisitos Previos
- Node.js 18 o superior
- npm o yarn
- Cuenta de Supabase
- Cuenta de Twilio
- Git

### 1. Clonar repositorio

```bash
git clone <url-repositorio>
cd Restaurante
```

### 2. Configurar Backend

```bash
cd backend
npm install

# Copiar y configurar variables de entorno
cp .env.development.example .env.development

# Editar .env.development con tus credenciales
```

Ver [backend/README.md](backend/README.md) para más detalles.

### 3. Configurar Base de Datos

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar scripts SQL de `docs/DATABASE.sql`
3. Copiar URL y KEY de Supabase al `.env.development`

### 4. Configurar Twilio

Sigue la guía detallada en [docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md)

Pasos básicos:
1. Crear cuenta en [Twilio](https://www.twilio.com)
2. Activar WhatsApp Sandbox
3. Configurar webhooks
4. Agregar credenciales al `.env.development`

### 5. Configurar Frontend

```bash
cd frontend
npm install

# Copiar y configurar variables de entorno
cp .env.development.example .env.development
```

## ▶️ Ejecutar en Desarrollo

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
Servidor en: http://localhost:3000

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
Dashboard en: http://localhost:5173

## 📁 Estructura del Proyecto

```
Restaurante/
├── backend/              # API REST
│   ├── src/
│   │   ├── config/      # Configuraciones
│   │   ├── controllers/ # Controladores MVC
│   │   ├── models/      # Modelos de datos
│   │   ├── services/    # Lógica de negocio
│   │   ├── routes/      # Rutas API
│   │   ├── middlewares/ # Middlewares
│   │   ├── utils/       # Utilidades
│   │   └── server.js    # Entrada
│   └── package.json
│
├── frontend/             # Dashboard React
│   ├── src/
│   │   ├── components/  # Componentes
│   │   ├── pages/       # Páginas
│   │   ├── services/    # API calls
│   │   ├── utils/       # Utilidades
│   │   └── main.jsx     # Entrada
│   └── package.json
│
└── docs/                 # Documentación
    ├── DATABASE.md
    ├── TWILIO_SETUP.md
    └── DEPLOYMENT.md
```

## 🤖 Bot de WhatsApp

### Flujo de Pedido

1. Cliente envia "Hola" → Menú de opciones
2. Elige tipo: Domicilio / Restaurante
3. Se muestra menú completo con categorías
4. Selecciona productos y cantidades
5. Confirma datos (dirección/mesa)
6. Resumen y confirmación final
7. Pedido guardado + notificación al admin

### Comandos Disponibles

- `hola` - Iniciar conversación
- `menu` - Ver menú completo
- `pedir` - Hacer pedido
- `estado` - Ver estado de pedido
- `cancelar` - Cancelar proceso
- `ayuda` - Mostrar ayuda

## 📡 API Endpoints

### Productos
- `GET /api/products` - Listar todos
- `POST /api/products` - Crear
- `PUT /api/products/:id` - Actualizar
- `DELETE /api/products/:id` - Eliminar

### Pedidos
- `GET /api/orders` - Listar todos
- `GET /api/orders/:id` - Ver detalle
- `PUT /api/orders/:id/status` - Cambiar estado
- `DELETE /api/orders/:id` - Cancelar

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas
- `GET /api/dashboard/sales-chart` - Gráfico ventas
- `GET /api/dashboard/top-products` - Top productos

Ver [docs/API.md](docs/API.md) para documentación completa.

## 🚀 Despliegue

### Backend (Railway)

1. Crear proyecto en [Railway.app](https://railway.app)
2. Conectar repositorio GitHub
3. Configurar variables de entorno de producción
4. Deploy automático

### Frontend (Netlify)

1. Crear sitio en [Netlify](https://netlify.com)
2. Conectar repositorio GitHub
3. Configurar:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Agregar variables de entorno
5. Deploy automático

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para guía detallada.

## 🔒 Seguridad

- ✅ Validación de firma de Twilio en webhooks
- ✅ CORS configurado
- ✅ Helmet.js para headers seguros
- ✅ Variables sensibles en .env
- ✅ Express Validator para inputs
- ✅ Rate limiting (opcional)

## 📝 Variables de Entorno

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
SUPABASE_URL=...
SUPABASE_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER_CLIENTES=...
TWILIO_WHATSAPP_NUMBER_ADMIN=...
FRONTEND_URL=...
SESSION_SECRET=...
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

## 🐛 Troubleshooting

### Backend no inicia
- Verifica que todas las variables de entorno estén configuradas
- Revisa la conexión a Supabase
- Verifica credenciales de Twilio

### Bot no responde
- Verifica configuración de webhooks en Twilio
- Revisa logs en `backend/logs/`
- Asegúrate que el servidor sea accesible públicamente

### Frontend no se conecta
- Verifica `VITE_API_URL` en `.env.development`
- Asegúrate que el backend esté corriendo
- Revisa CORS en el backend

## 📚 Documentación

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Estructura de Base de Datos](docs/DATABASE.md)
- [Configuración de Twilio](docs/TWILIO_SETUP.md)
- [Guía de Despliegue](docs/DEPLOYMENT.md)

## 📄 Licencia

MIT

## 👥 Soporte

Para preguntas o problemas, contacta al equipo de desarrollo.

---

**El Rinconcito** 🌮 - Sistema de Gestión de Pedidos con WhatsApp Business

Desarrollado con ❤️ usando Node.js, React y Twilio
