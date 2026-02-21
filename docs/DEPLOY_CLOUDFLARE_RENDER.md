# 🚀 Despliegue Completo: Cloudflare Pages + Render

## 🎯 ¿Por qué esta combinación?

### **Cloudflare Pages (Frontend)**
- ✅ **Bandwidth ILIMITADO** (vs 100GB Netlify)
- ✅ **Requests ILIMITADOS** (vs 125k Netlify)
- ✅ Despliegues ilimitados
- ✅ CDN global ultrarrápido
- ✅ **Gratis para siempre**
- ✅ No se "acaba" NUNCA

### **Render (Backend)**
- ✅ **750 horas gratis/mes** (suficiente para 24/7)
- ✅ **Requests ILIMITADOS**
- ✅ No se cobra por tráfico
- ✅ PostgreSQL gratis
- ✅ Auto-deploy desde GitHub

**Resultado:** Sistema completamente gratis que aguanta TODO el tráfico que le metas. 💪

---

# 📦 PARTE 1: Desplegar Backend en Render

## Paso 1: Crear cuenta en Render

1. Ve a: **https://dashboard.render.com/register**
2. Regístrate con tu cuenta de **GitHub**
3. Autoriza a Render para acceder a tus repositorios

## Paso 2: Crear Web Service

1. En el dashboard, click en **"New +"**
2. Selecciona **"Web Service"**
3. Click en **"Connect account"** si no has conectado GitHub
4. Busca y selecciona tu repositorio: **tachinloaa/restaurante**
5. Click en **"Connect"**

## Paso 3: Configurar el servicio

### Configuración básica:
```
Name:              el-rinconcito-backend
Region:            Oregon (US West)
Branch:            main
Root Directory:    backend
Runtime:           Node
Build Command:     npm install
Start Command:     npm start
```

### Plan:
- Selecciona **"Free"** (0$/mes)

## Paso 4: Variables de entorno

Click en **"Advanced"** y agrega estas variables:

```env
NODE_ENV=production
PORT=10000

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key_aqui

# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=tu_numero_twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_CLIENTES=whatsapp:+5213349420820
TWILIO_WHATSAPP_ADMIN=whatsapp:+5213349420820

# Frontend (lo configurarás después)
FRONTEND_URL=https://el-rinconcito.pages.dev

# Logging
LOG_LEVEL=info
```

**IMPORTANTE:** 
- Usa tus valores REALES de Supabase
- Usa tus valores REALES de Twilio
- `PORT=10000` es el puerto que usa Render

## Paso 5: Crear el servicio

1. Click en **"Create Web Service"**
2. Espera 2-3 minutos a que se despliegue
3. Tu URL será algo como: `https://el-rinconcito-backend.onrender.com`

## Paso 6: Verificar el despliegue

Abre en el navegador:
```
https://tu-backend.onrender.com/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2026-02-05..."
}
```

✅ **Backend listo!** Copia tu URL de Render, la necesitarás.

---

# 🌐 PARTE 2: Desplegar Frontend en Cloudflare Pages

## Paso 1: Crear cuenta en Cloudflare

1. Ve a: **https://dash.cloudflare.com/sign-up**
2. Crea tu cuenta (gratis)
3. Verifica tu email

## Paso 2: Acceder a Pages

1. En el dashboard, busca en el menú izquierdo: **"Workers & Pages"**
2. Click en **"Create application"**
3. Selecciona la pestaña **"Pages"**
4. Click en **"Connect to Git"**

## Paso 3: Conectar repositorio

1. Click en **"Connect GitHub"**
2. Autoriza a Cloudflare
3. Selecciona tu repositorio: **tachinloaa/restaurante**
4. Click en **"Begin setup"**

## Paso 4: Configurar el build

```
Project name:           el-rinconcito
Production branch:      main
Build command:          npm run build
Build output directory: dist
Root directory:         frontend
```

### Framework preset:
- Selecciona **"Vite"** (se detecta automáticamente)

## Paso 5: Variables de entorno

En **"Environment variables"**, agrega:

```env
NODE_VERSION=18
VITE_API_URL=https://tu-backend.onrender.com/api
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

**IMPORTANTE:** Usa la URL de Render que copiaste en el Paso 6 de la Parte 1.

## Paso 6: Deploy!

1. Click en **"Save and Deploy"**
2. Espera 2-3 minutos
3. Tu sitio estará en: `https://el-rinconcito.pages.dev`

## Paso 7: Dominio personalizado (Opcional)

Si tienes un dominio:
1. Ve a **"Custom domains"**
2. Click en **"Set up a custom domain"**
3. Sigue las instrucciones para configurar DNS

✅ **Frontend listo!** Ahora actualiza el backend.

---

# 🔄 PARTE 3: Conectar Frontend y Backend

## Actualizar variable en Render

1. Ve a tu servicio en Render
2. Click en **"Environment"**
3. Edita `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://el-rinconcito.pages.dev
   ```
4. Click en **"Save Changes"**
5. El servicio se redesplega automáticamente

---

# 📱 PARTE 4: Configurar Webhook de Twilio

## Actualizar webhook en Twilio Console

1. Ve a: **https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox**
2. En **"WHEN A MESSAGE COMES IN"**, pega:
   ```
   https://tu-backend.onrender.com/api/webhooks/whatsapp
   ```
3. Método: **POST**
4. Click en **"Save"**

## Probar el webhook

Envía "hola" a tu WhatsApp Sandbox y deberías recibir el menú.

---

# ✅ Verificación Final

## Backend (Render)
```bash
# Desde tu terminal local
node backend/check-render.js https://tu-backend.onrender.com
```

## Frontend (Cloudflare)
Abre en el navegador: `https://tu-frontend.pages.dev`

Deberías ver el panel de administración.

---

# 📊 Límites del Plan Gratuito

## Cloudflare Pages
```
✅ Bandwidth:        ILIMITADO
✅ Requests:         ILIMITADOS
✅ Builds:           500/mes
✅ Sitios:           100 proyectos
✅ CDN:              Global
```

**No se acaba NUNCA.** 🎉

## Render
```
✅ Horas:            750/mes (suficiente para 24/7)
✅ Requests:         ILIMITADOS
✅ Bandwidth:        100GB/mes
✅ RAM:              512MB
⚠️  Sleep:           Después de 15 min inactivo
```

## Supabase
```
✅ Almacenamiento:   500MB
✅ Transferencia:    2GB/mes
✅ Usuarios:         50,000 MAU
✅ Queries:          ILIMITADAS
```

**Conclusión:** Con tráfico normal de un restaurante, NO vas a llegar a los límites.

---

# 🔥 Mantener Render Activo (Opcional)

Si quieres que tu backend NO se duerma:

## Opción 1: UptimeRobot (Recomendado)

1. Ve a: **https://uptimerobot.com** (gratis)
2. Crea cuenta
3. Add New Monitor:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: El Rinconcito Backend
   URL: https://tu-backend.onrender.com/api/health
   Monitoring Interval: 5 minutes
   ```
4. Save

Esto hará ping cada 5 minutos y mantendrá tu backend activo.

## Opción 2: Cron-job.org

Alternativa a UptimeRobot, funciona igual.

---

# 🚀 Despliegues Automáticos

## Desde ahora, cada `git push`:

1. **Render** detecta cambios en `/backend` y redesplega
2. **Cloudflare** detecta cambios en `/frontend` y redesplega
3. Todo automático, sin hacer nada

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push
```

¡Y listo! Ambos servicios se actualizan solos.

---

# 🔍 Monitoreo y Logs

## Render (Backend)
- Dashboard → Tu servicio → **"Logs"**
- Logs en tiempo real
- Puedes descargarlos

## Cloudflare Pages (Frontend)
- Workers & Pages → Tu proyecto → **"Deployments"**
- Ver historial de builds
- Logs de cada despliegue

---

# 💡 Tips y Buenas Prácticas

## Performance

### Cloudflare Pages:
- ✅ CDN global automático
- ✅ HTTP/3 activado por defecto
- ✅ Brotli compression
- ✅ IPv6 habilitado

### Render:
- ⏱️ Primera petición lenta (~30s) si estaba dormido
- ⚡ Después responde normal
- 💡 Usa UptimeRobot para mantenerlo despierto

## Costos reales con 1000 usuarios/día

```
Frontend (Cloudflare):     $0/mes
Backend (Render):          $0/mes
Base de datos (Supabase):  $0/mes
Twilio (WhatsApp):         ~$15-30/mes (único costo)
──────────────────────────────────
TOTAL:                     ~$20/mes
```

**Solo pagas Twilio.** Todo lo demás gratis. ✨

---

# 🆚 Comparación con Otras Opciones

| Característica | Netlify | Vercel | **Cloudflare** |
|----------------|---------|---------|----------------|
| Bandwidth | 100GB | 100GB | ✅ **ILIMITADO** |
| Requests | 125k/mes | Ilimitado | ✅ **ILIMITADO** |
| Builds | 300/mes | 6000/mes | 500/mes |
| CDN | Global | Global | Global |
| Precio | $0 | $0 | $0 |

**Cloudflare es claramente superior para proyectos que crecen.**

---

# 🐛 Solución de Problemas

## Backend no inicia en Render

1. Revisa los logs en Render
2. Verifica variables de entorno
3. El `PORT` debe ser `10000`
4. `npm start` debe funcionar localmente

## Frontend no construye en Cloudflare

1. Revisa que `VITE_API_URL` esté configurado
2. `npm run build` debe funcionar localmente
3. El `dist/` debe crearse correctamente
4. Revisa los logs del build

## CORS errors

Si ves errores de CORS:
1. Verifica que `FRONTEND_URL` en Render sea correcto
2. Debe incluir `https://` y NO terminar en `/`
3. Redesplega el backend después de cambiar

## Webhook no funciona

1. URL debe ser: `https://tu-backend.onrender.com/api/webhooks/whatsapp`
2. Método: POST
3. Prueba la URL en el navegador (debe dar 405)
4. Revisa logs en Render cuando envías mensaje

---

# 📝 Checklist Final

Antes de dar por terminado:

- [ ] Backend desplegado en Render
- [ ] `/api/health` responde OK
- [ ] Frontend desplegado en Cloudflare
- [ ] Sitio carga correctamente
- [ ] Variables de entorno configuradas
- [ ] Webhook de Twilio configurado
- [ ] Bot de WhatsApp funciona
- [ ] Panel de admin funciona
- [ ] (Opcional) UptimeRobot configurado

---

# 🎉 ¡Listo!

Tu sistema está desplegado con la mejor configuración gratuita:

```
Frontend:  Cloudflare Pages (ilimitado)
Backend:   Render (ilimitado requests)
Database:  Supabase (super generoso)
WhatsApp:  Twilio (único costo ~$20/mes)
```

**No vas a tener problemas de límites.** Esta configuración aguanta TODO. 💪

---

# 📞 Información de Contacto

Si tienes problemas:
1. Revisa los logs en Render/Cloudflare
2. Verifica variables de entorno
3. Prueba localmente primero
4. Revisa la documentación oficial

**Documentación oficial:**
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- Render: https://render.com/docs
- Supabase: https://supabase.com/docs
- Twilio: https://www.twilio.com/docs
