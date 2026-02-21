# ✅ Checklist de Deployment

## Pre-Deployment (Completado)

- [x] `.env.example` creado para backend
- [x] `.env.example` creado para frontend  
- [x] `render.yaml` configurado para Render
- [x] `netlify.toml` configurado para Netlify
- [x] CORS actualizado para múltiples orígenes
- [x] Variables de entorno documentadas
- [x] Scripts de verificación creados
- [x] Guía de deployment completa creada

## Backend - Render.com

### Variables de Entorno Requeridas:
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://tuproyecto.supabase.co
SUPABASE_KEY=tu-supabase-anon-key
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu-token
TWILIO_PHONE_NUMBER=+14155238886
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_CLIENTES=whatsapp:+521234567890
TWILIO_WHATSAPP_ADMIN=whatsapp:+521234567890
FRONTEND_URL=https://tu-app.netlify.app
JWT_SECRET=clave-aleatoria-segura
LOG_LEVEL=info
```

### Pasos:
1. [ ] Subir código a GitHub/GitLab
2. [ ] Crear cuenta en Render.com
3. [ ] Conectar repositorio
4. [ ] Configurar variables de entorno
5. [ ] Deploy automático
6. [ ] Verificar URL: `https://tu-app.onrender.com/api/health`

## Frontend - Netlify

### Variables de Entorno Requeridas:
```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-supabase-anon-key
VITE_API_URL=https://tu-backend.onrender.com/api
```

### Pasos:
1. [ ] Subir código a GitHub/GitLab (puede ser repo diferente)
2. [ ] Crear cuenta en Netlify
3. [ ] Conectar repositorio
4. [ ] Configurar variables de entorno
5. [ ] Deploy automático
6. [ ] Verificar URL: `https://tu-app.netlify.app`

## Post-Deployment

### Supabase:
1. [ ] Actualizar URLs permitidas en Authentication settings
2. [ ] Verificar que RLS esté configurado
3. [ ] Probar conexión desde frontend

### Twilio:
1. [ ] Configurar webhook URL en Twilio Console:
   - URL: `https://tu-backend.onrender.com/webhook/twilio`
   - Method: POST
2. [ ] Probar envío de WhatsApp

### Pruebas Finales:
1. [ ] Login funciona
2. [ ] Dashboard carga datos
3. [ ] Crear/editar pedidos funciona
4. [ ] Notificaciones WhatsApp funcionan
5. [ ] Dark mode funciona
6. [ ] Analytics muestra datos reales
7. [ ] PDF export funciona
8. [ ] Logout automático por inactividad funciona

## Comandos Útiles

### Verificar configuración antes de deploy:
```bash
# Backend
cd backend
node check-deployment.js

# Frontend
cd frontend
node check-deployment.js
```

### Build local para probar:
```bash
# Frontend
cd frontend
npm run build
npm run preview
```

### Ver logs en producción:
- **Backend:** Render Dashboard → Logs
- **Frontend:** Netlify Dashboard → Deploys → [tu deploy] → Deploy log

## URLs Importantes

- 📖 **Guía completa:** `DEPLOY_PRODUCTION.md`
- 🚀 **Render:** https://render.com
- 🌐 **Netlify:** https://netlify.com
- 🗄️ **Supabase:** https://supabase.com
- 📱 **Twilio:** https://console.twilio.com

---

**¡Importante!** El plan gratuito de Render duerme el servicio tras 15 minutos de inactividad. La primera petición después del "sleep" tardará 30-50 segundos. Considera:
- Upgrade a plan pagado ($7/mes) para servicio 24/7
- Usar un servicio de ping (UptimeRobot) para mantenerlo activo
