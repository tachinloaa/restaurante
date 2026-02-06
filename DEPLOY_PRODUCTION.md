# 🚀 Guía de Deployment a Producción - El Rinconcito

Esta guía te llevará paso a paso para desplegar tu aplicación en producción.

## 📋 Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Deployment del Backend (Render)](#1-deployment-del-backend-render)
3. [Deployment del Frontend (Netlify)](#2-deployment-del-frontend-netlify)
4. [Configuración de Supabase](#3-configuración-de-supabase)
5. [Verificación y Pruebas](#4-verificación-y-pruebas)
6. [Troubleshooting](#troubleshooting)

---

## 📌 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ Cuenta en [Render.com](https://render.com) (gratis)
- ✅ Cuenta en [Netlify](https://www.netlify.com) (gratis)
- ✅ Cuenta en [Supabase](https://supabase.com) con base de datos configurada
- ✅ Cuenta en [Twilio](https://www.twilio.com) con número de WhatsApp
- ✅ Repositorio de Git (GitHub, GitLab, o Bitbucket)
- ✅ Código fuente subido al repositorio

---

## 1️⃣ Deployment del Backend (Render)

### **Opción A: Deploy con render.yaml (Recomendado)**

1. **Sube tu código a Git** (si no lo has hecho):
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Backend listo para producción"
   git remote add origin https://github.com/tu-usuario/el-rinconcito-backend.git
   git push -u origin main
   ```

2. **Conecta Render con tu repositorio:**
   - Ve a [Render Dashboard](https://dashboard.render.com)
   - Click en **"New +"** → **"Blueprint"**
   - Conecta tu repositorio de GitHub/GitLab
   - Render detectará automáticamente el archivo `render.yaml`

3. **Configura las variables de entorno:**
   
   En el dashboard de Render, ve a tu servicio y agrega estas variables:
   
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Supabase (obtén de https://app.supabase.com/project/_/settings/api)
   SUPABASE_URL=https://tuproyecto.supabase.co
   SUPABASE_KEY=tu-supabase-anon-key
   
   # Twilio (obtén de https://console.twilio.com/)
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=tu-auth-token
   TWILIO_PHONE_NUMBER=+14155238886
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   TWILIO_WHATSAPP_CLIENTES=whatsapp:+521234567890
   TWILIO_WHATSAPP_ADMIN=whatsapp:+521234567890
   
   # Frontend (lo configurarás después)
   FRONTEND_URL=https://tu-app.netlify.app
   
   # Seguridad
   JWT_SECRET=genera-una-clave-aleatoria-segura-aqui
   LOG_LEVEL=info
   ```

4. **Deploy automático:**
   - Render automáticamente instalará dependencias y ejecutará `npm start`
   - Espera 3-5 minutos para el primer deploy
   - Obtendrás una URL como: `https://el-rinconcito-backend.onrender.com`

### **Opción B: Deploy Manual (alternativa)**

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio
4. Configura:
   - **Name:** `el-rinconcito-backend`
   - **Environment:** `Node`
   - **Region:** `Oregon` (gratis)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
5. Agrega las variables de entorno (ver paso 3 arriba)
6. Click en **"Create Web Service"**

### ⚠️ **Importante sobre el Free Tier de Render:**
- El servicio **se duerme después de 15 minutos** de inactividad
- La primera petición tras el "sleep" puede tardar **30-50 segundos**
- Para mantenerlo activo 24/7, considera:
  - Upgrade a plan pagado ($7/mes)
  - Usar un servicio de ping externo (UptimeRobot, Cronitor)

---

## 2️⃣ Deployment del Frontend (Netlify)

### **Opción A: Deploy desde Git (Recomendado)**

1. **Sube tu código a Git:**
   ```bash
   cd frontend
   git init
   git add .
   git commit -m "Frontend listo para producción"
   git remote add origin https://github.com/tu-usuario/el-rinconcito-frontend.git
   git push -u origin main
   ```

2. **Conecta Netlify:**
   - Ve a [Netlify Dashboard](https://app.netlify.com)
   - Click en **"Add new site"** → **"Import an existing project"**
   - Conecta tu repositorio de GitHub

3. **Configura el build:**
   Netlify detectará automáticamente `netlify.toml`, pero verifica:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Branch:** `main`

4. **Configura las variables de entorno:**
   
   En **Site settings → Build & deploy → Environment**:
   
   ```env
   # Supabase (mismas que el backend)
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-supabase-anon-key
   
   # Backend API (URL de tu backend en Render)
   VITE_API_URL=https://el-rinconcito-backend.onrender.com/api
   ```

5. **Deploy:**
   - Click en **"Deploy site"**
   - Espera 2-3 minutos
   - Obtendrás una URL como: `https://clever-payne-abc123.netlify.app`
   - Puedes cambiar el nombre en **Site settings → Domain management**

### **Opción B: Deploy Manual (drag & drop)**

1. **Build local:**
   ```bash
   cd frontend
   
   # Crear archivo .env.local con las variables de producción
   echo "VITE_SUPABASE_URL=https://tuproyecto.supabase.co" > .env.local
   echo "VITE_SUPABASE_ANON_KEY=tu-key" >> .env.local
   echo "VITE_API_URL=https://el-rinconcito-backend.onrender.com/api" >> .env.local
   
   # Build
   npm run build
   ```

2. **Deploy en Netlify:**
   - Ve a [Netlify Dashboard](https://app.netlify.com)
   - Arrastra la carpeta `dist/` a la zona de drop
   - Espera el upload

---

## 3️⃣ Configuración de Supabase

### **Actualizar CORS y URLs permitidas:**

1. Ve a **Supabase Dashboard → Authentication → URL Configuration**

2. Agrega tus URLs de producción:
   ```
   Site URL: https://tu-app.netlify.app
   
   Redirect URLs:
   - https://tu-app.netlify.app
   - https://tu-app.netlify.app/reset-password
   - http://localhost:5173 (para desarrollo)
   ```

3. **Verifica Row Level Security (RLS):**
   - Asegúrate de tener las políticas correctas configuradas
   - Revisa el archivo `docs/SUPABASE_RLS.sql` si necesitas aplicar políticas

### **Verificar Base de Datos:**

Ejecuta estas consultas para verificar:

```sql
-- Verificar tablas principales
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar que tengas datos de prueba
SELECT COUNT(*) FROM pedidos;
SELECT COUNT(*) FROM productos;
SELECT COUNT(*) FROM clientes;
```

---

## 4️⃣ Verificación y Pruebas

### **Backend:**

1. **Health Check:**
   ```bash
   curl https://el-rinconcito-backend.onrender.com/api/health
   ```
   Debería responder con `200 OK`.

2. **Test de API:**
   ```bash
   curl https://el-rinconcito-backend.onrender.com/api/orders
   ```

3. **Logs:**
   - Ve a Render Dashboard → tu servicio → **Logs**
   - Verifica que no haya errores

### **Frontend:**

1. **Abre tu sitio:** `https://tu-app.netlify.app`

2. **Verifica:**
   - ✅ Login funciona
   - ✅ Dashboard carga datos reales
   - ✅ Pedidos se pueden crear/editar
   - ✅ Dark mode funciona
   - ✅ Notificaciones funcionan
   - ✅ Analytics muestran datos reales

3. **Consola del navegador:**
   - Presiona `F12` → Pestaña **Console**
   - No debería haber errores de CORS o 404

### **Twilio (WhatsApp):**

1. **Test de webhook:**
   - Envía un mensaje de WhatsApp a tu número de Twilio
   - Verifica que se registre en logs de Render

2. **Test de envío:**
   - Crea un pedido desde el dashboard
   - Verifica que llegue la notificación de WhatsApp

---

## 🔧 Troubleshooting

### **❌ Error: CORS al llamar al backend**

**Problema:** El frontend no puede hacer requests al backend.

**Solución:**
1. Verifica que `FRONTEND_URL` en Render incluya tu dominio de Netlify
2. Actualiza el backend y redeploy:
   ```env
   FRONTEND_URL=https://tu-app.netlify.app,http://localhost:5173
   ```

### **❌ Error 503: Backend no responde**

**Problema:** El backend en Render está "dormido" (free tier).

**Solución:**
1. Espera 30-50 segundos en la primera petición
2. Configura un "pinger" externo:
   - [UptimeRobot](https://uptimerobot.com) - ping cada 5 min
   - [Cronitor](https://cronitor.io) - heartbeat monitor

### **❌ Variables de entorno no se aplican**

**Problema:** Frontend no lee las variables `VITE_*`.

**Solución:**
1. En Netlify, las variables deben agregarse **antes** del build
2. Si ya deployaste, ve a **Deploys → Trigger deploy → Clear cache and deploy**

### **❌ Twilio no envía mensajes**

**Problema:** No llegan notificaciones de WhatsApp.

**Solución:**
1. Verifica que `TWILIO_WHATSAPP_NUMBER` tenga el prefijo `whatsapp:`
2. Verifica que el número destino esté verificado en Twilio (sandbox mode)
3. Activa un número de producción si estás en producción real

### **❌ Base de datos no tiene datos**

**Problema:** El dashboard muestra todo vacío.

**Solución:**
1. Verifica que las políticas RLS permitan lectura
2. Ejecuta el script `docs/DATABASE.sql` en Supabase SQL Editor
3. Crea datos de prueba manualmente

---

## 📊 Monitoreo y Mantenimiento

### **Logs:**
- **Backend:** Render Dashboard → tu servicio → Logs
- **Frontend:** Netlify Dashboard → tu sitio → Functions log (si usas)
- **Base de datos:** Supabase Dashboard → Logs

### **Métricas:**
- **Render:** CPU, memoria, requests (disponible en dashboard)
- **Netlify:** Bandwidth, build minutes (disponible en dashboard)
- **Supabase:** Database usage, API requests (disponible en dashboard)

### **Backups:**
- **Base de datos:** Supabase hace backups automáticos (7 días en free tier)
- **Código:** Git es tu backup

---

## 🎉 ¡Listo!

Tu aplicación está en producción. Comparte la URL de Netlify con tus usuarios.

**URLs finales:**
- 🌐 **Frontend:** `https://tu-app.netlify.app`
- 🔧 **Backend:** `https://el-rinconcito-backend.onrender.com`
- 🗄️ **Base de datos:** Supabase (privado)

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render y Netlify
2. Verifica las variables de entorno
3. Consulta la documentación:
   - [Render Docs](https://render.com/docs)
   - [Netlify Docs](https://docs.netlify.com)
   - [Supabase Docs](https://supabase.com/docs)
   - [Twilio Docs](https://www.twilio.com/docs)

---

**Versión:** 1.0.0  
**Última actualización:** 5 de febrero de 2026
