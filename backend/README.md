# 🌮 El Rinconcito - Backend API

API REST para el sistema de gestión de pedidos del restaurante "El Rinconcito" con integración de WhatsApp Business mediante Twilio.

## 🚀 Tecnologías

- **Node.js** 18+
- **Express.js** - Framework web
- **Supabase** - Base de datos PostgreSQL
- **Twilio** - WhatsApp Business API
- **Winston** - Logging
- **Express Validator** - Validación de datos

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuraciones
│   ├── controllers/     # Controladores MVC
│   ├── models/          # Modelos de datos
│   ├── services/        # Lógica de negocio
│   ├── routes/          # Rutas de la API
│   ├── middlewares/     # Middlewares
│   ├── utils/           # Utilidades
│   └── server.js        # Punto de entrada
├── .env.development.example
├── .env.production.example
├── package.json
└── README.md
```

## 🔧 Instalación

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y configura las variables:

```bash
# Para development
cp .env.development.example .env.development

# Para production
cp .env.production.example .env.production
```

Edita el archivo `.env.development` con tus credenciales:

```env
NODE_ENV=development
PORT=3000

SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_key_de_supabase

TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER_CLIENTES=whatsapp:+14155238886
TWILIO_WHATSAPP_NUMBER_ADMIN=whatsapp:+14155238886

FRONTEND_URL=http://localhost:5173
SESSION_SECRET=tu_secret_key
```

### 3. Configurar base de datos

Ejecuta los scripts SQL en Supabase (ver `/docs/DATABASE.md`)

### 4. Configurar Twilio WhatsApp

Sigue la guía en `/docs/TWILIO_SETUP.md`

## ▶️ Ejecutar

### Modo desarrollo

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

El servidor iniciará en: `http://localhost:3000`

## 📡 API Endpoints

### Webhooks
- `POST /webhook` - Recibir mensajes de WhatsApp
- `POST /webhook/status` - Estado de mensajes Twilio

### Productos
- `GET /api/products` - Listar todos
- `GET /api/products/:id` - Obtener por ID
- `POST /api/products` - Crear
- `PUT /api/products/:id` - Actualizar
- `DELETE /api/products/:id` - Eliminar

### Pedidos
- `GET /api/orders` - Listar todos
- `GET /api/orders/:id` - Obtener por ID
- `POST /api/orders` - Crear
- `PUT /api/orders/:id/status` - Actualizar estado
- `DELETE /api/orders/:id` - Cancelar

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/dashboard/sales-chart` - Datos gráficos
- `GET /api/dashboard/top-products` - Top productos
- `GET /api/dashboard/recent-orders` - Pedidos recientes

Ver documentación completa en `/docs/API.md`

## 🤖 Bot de WhatsApp

El bot maneja conversaciones con clientes para:
- Mostrar menú
- Tomar pedidos (domicilio/restaurante)
- Confirmar órdenes
- Consultar estado de pedidos

El flujo completo está en `/docs/BOT_FLOW.md`

## 📝 Logging

Los logs se guardan en:
- `logs/error.log` - Solo errores
- `logs/combined.log` - Todos los logs

En desarrollo, los logs también aparecen en consola con colores.

## 🔒 Seguridad

- Validación de firma de Twilio en webhooks
- Helmet.js para headers seguros
- CORS configurado
- Validación de datos con express-validator
- Variables sensibles en .env

## 🧪 Testing

```bash
npm test
```

## 📦 Deploy

Ver guía completa en `/docs/DEPLOYMENT.md`

### Railway

1. Conectar repositorio
2. Configurar variables de entorno
3. Deploy automático

## 🐛 Troubleshooting

### Error de conexión a Supabase
- Verifica que SUPABASE_URL y SUPABASE_KEY sean correctos
- Revisa las políticas RLS en Supabase

### Webhooks de Twilio no funcionan
- Verifica la URL del webhook en Twilio Console
- Asegúrate que el servidor sea accesible públicamente
- En desarrollo, usa ngrok para exponer localhost

### Bot no responde
- Revisa los logs en `logs/combined.log`
- Verifica que las credenciales de Twilio sean correctas
- Confirma que el número de WhatsApp esté activo

## 📚 Documentación Adicional

- [Documentación API](/docs/API.md)
- [Configuración Twilio](/docs/TWILIO_SETUP.md)
- [Estructura base de datos](/docs/DATABASE.md)
- [Guía de despliegue](/docs/DEPLOYMENT.md)

## 👥 Soporte

Para reportar problemas o sugerencias, contacta al equipo de desarrollo.

---

**El Rinconcito** 🌮 - Sistema de Gestión de Pedidos
