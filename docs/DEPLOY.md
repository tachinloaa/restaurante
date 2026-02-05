# 🚀 Guía de Despliegue - Railway + GitHub

## 📋 Checklist de Despliegue

### 1. Subir código a GitHub

```bash
# Ejecutar script automático
.\deploy-github.bat
```

O manualmente:
```bash
git add .
git commit -m "feat: optimización dashboard + pruebas Twilio + webhooks"
git push -u origin main --force
```

---

### 2. Configurar Variables de Entorno en Railway

Ve a tu proyecto en Railway: https://railway.app

**Settings → Variables:**

```env
# Entorno
NODE_ENV=production
PORT=3000

# Supabase Database
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_anon_key_aqui

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_de_twilio_aqui
TWILIO_WHATSAPP_NUMBER_CLIENTES=whatsapp:+14155238886
TWILIO_WHATSAPP_NUMBER_ADMIN=whatsapp:+14155238886

# Frontend URL (cambiar cuando despliegues el frontend)
FRONTEND_URL=https://tu-frontend.netlify.app

# Session Secret (genera una clave segura)
SESSION_SECRET=tu_clave_secreta_super_segura_produccion_2026
```

---

### 3. Verificar Despliegue en Railway

Después de configurar las variables, Railway redesplegará automáticamente.

**Verificar:**
1. Ve a **Deployments** en Railway
2. Espera a que el estado sea "Success"
3. Copia la URL del deployment (ej: `https://restaurante-production-fbf5.up.railway.app`)

**Probar el servidor:**
```bash
curl https://restaurante-production-fbf5.up.railway.app/api/health
```

Deberías recibir:
```json
{"success":true,"message":"API funcionando correctamente"}
```

---

### 4. Configurar Webhook en Twilio

1. **Ve a Twilio Console:**
   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

2. **En "WHEN A MESSAGE COMES IN":**
   ```
   URL: https://restaurante-production-fbf5.up.railway.app/webhook
   Method: POST
   ```

3. **Haz clic en "Save"**

---

### 5. Aplicar Optimizaciones de Base de Datos

1. **Ve a Supabase Dashboard:**
   https://supabase.com/dashboard/project/oppjntxqwpalnjwtrpjz

2. **SQL Editor → New Query**

3. **Copia y pega:** `docs/OPTIMIZACION_DB.sql`

4. **Run** para crear índices y funciones

---

### 6. Probar el Sistema Completo

**Probar WhatsApp Bot:**
1. Abre WhatsApp
2. Envía a +1 (415) 523-8886: `menu`
3. Deberías recibir el menú del restaurante

**Probar Dashboard:**
1. Abre: http://localhost:5173 (o tu URL de frontend)
2. Verifica que cargue rápido (< 2 segundos)
3. Prueba el botón "Exportar PDF"

---

## 🔍 Verificación de Logs

### Railway Logs
```bash
# Ver logs en tiempo real
railway logs
```

O en Railway Dashboard → **Deployments** → Click en deployment → **View Logs**

### Buscar errores:
- `Error al` - Errores de la aplicación
- `ECONNREFUSED` - No puede conectar a Supabase
- `unauthorized` - Problema con credenciales de Twilio
- `listen EADDRINUSE` - Puerto ya en uso (normal si hay múltiples deploys)

---

## ❌ Solución de Problemas

### Railway no despliega
- Verifica que el `Procfile` existe en backend/
- Contenido: `web: node src/server.js`
- Verifica que `package.json` tenga el script `start`

### Bot no responde en WhatsApp
1. Verifica el webhook en Twilio Console
2. Revisa logs de Railway por errores
3. Verifica variables de entorno TWILIO_*
4. Prueba manualmente: `node src/testTwilioEnviar.js +5215519060013`

### Dashboard lento
1. Verifica que ejecutaste `OPTIMIZACION_DB.sql`
2. Revisa que el timeout de API sea 30000ms
3. Verifica logs del backend por queries lentas

### Error de CORS en frontend
- Verifica que `FRONTEND_URL` en Railway coincida con la URL de tu frontend
- Ejemplo: `https://el-rinconcito.netlify.app`

---

## 📊 Verificar que Todo Funciona

### ✅ Checklist Final

- [ ] Código subido a GitHub
- [ ] Variables configuradas en Railway
- [ ] Deployment exitoso en Railway (status: Success)
- [ ] Endpoint `/api/health` responde correctamente
- [ ] Webhook configurado en Twilio
- [ ] Bot responde "menu" en WhatsApp
- [ ] Dashboard carga rápido (< 2 segundos)
- [ ] PDF export funciona
- [ ] Índices de DB aplicados

---

## 🔗 Links Importantes

- **GitHub:** https://github.com/tachinloaa/restaurante
- **Railway:** https://railway.app
- **Twilio Console:** https://console.twilio.com
- **Supabase:** https://supabase.com/dashboard/project/oppjntxqwpalnjwtrpjz
- **Backend URL:** https://restaurante-production-fbf5.up.railway.app

---

## 📱 Próximos Pasos

1. **Desplegar Frontend:**
   - Netlify: `cd frontend && netlify deploy --prod`
   - O Vercel: `cd frontend && vercel --prod`

2. **Actualizar FRONTEND_URL en Railway** con la URL del frontend desplegado

3. **Probar flujo completo:** WhatsApp → Pedido → Dashboard → Base de datos

4. **Producción WhatsApp:** Solicitar número Business oficial en Twilio

---

¡Todo listo para producción! 🎉
