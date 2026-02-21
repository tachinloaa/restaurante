# 🔐 Credenciales de Acceso - Dashboard Admin

## Acceso al Panel de Administración

Para acceder al dashboard de administración de **El Rinconcito**, usa las siguientes credenciales:

### Credenciales de Administrador

```
Email:    admin@elrinconcito.com
Password: Admin123!
```

## URL del Dashboard

- **Producción (Cloudflare)**: https://tu-dominio.pages.dev/login
- **Backend (Render)**: https://el-rinconcito-backend.onrender.com
- **Local**: http://localhost:5173/login

## Importante

⚠️ **Estas son las credenciales unificadas** que funcionan tanto para:
- Panel de administración (frontend)
- API backend (JWT)
- Base de datos Supabase

## Cambiar Contraseña

Para cambiar la contraseña del administrador:

1. **Actualizar en Supabase:**
   - Ve a Authentication > Users
   - Encuentra el usuario `admin@elrinconcito.com`
   - Cambia la contraseña

2. **Actualizar hash en backend:**
   ```bash
   cd backend
   node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('TU_NUEVA_PASSWORD', 10).then(hash => console.log('ADMIN_PASSWORD_HASH=' + hash))"
   ```

3. **Actualizar en Render:**
   - Ve a Dashboard > Environment Variables
   - Actualiza `ADMIN_PASSWORD_HASH` con el nuevo hash
   - Redeploy el servicio

## Sistema de Autenticación

El sistema usa **JWT (JSON Web Tokens)** con las siguientes características:

- ✅ Token válido por **24 horas**
- ✅ Token almacenado en **localStorage** del navegador
- ✅ Auto-renovación al detectar actividad
- ✅ Cierre automático por inactividad (5 minutos)
- ✅ Todas las rutas protegidas requieren token

## Solución de Problemas

### Error 401: No autorizado

Si ves errores 401 en el dashboard:

1. **Cierra sesión y vuelve a iniciar**
2. **Verifica las credenciales** (son case-sensitive)
3. **Limpia localStorage** del navegador:
   ```javascript
   localStorage.clear();
   ```
4. **Verifica que el backend esté corriendo** en Render

### Token expirado

Si el token expiró:
- Simplemente cierra sesión y vuelve a iniciar
- El sistema detectará el token inválido automáticamente

### No puedo acceder al dashboard

Verifica:
1. Backend esté desplegado en Render
2. Frontend esté desplegado en Cloudflare
3. Variables de entorno configuradas correctamente
4. Credenciales correctas (case-sensitive)

## Seguridad

🔒 **Recomendaciones de seguridad:**

1. **Cambia la contraseña por defecto** lo antes posible
2. **No compartas las credenciales** públicamente
3. **Usa contraseñas fuertes** (mínimo 8 caracteres, mayúsculas, números, símbolos)
4. **Cierra sesión** cuando no uses el dashboard
5. **No uses la misma contraseña** en otros servicios

## Roles y Permisos

Por ahora solo hay un rol:

- **Admin**: Acceso completo a todas las funciones del dashboard
  - Ver y gestionar pedidos
  - Ver estadísticas y analytics
  - Gestionar productos y categorías
  - Ver clientes
  - Recibir notificaciones

En el futuro se pueden agregar más roles como:
- Cocinero (solo ver pedidos)
- Repartidor (solo pedidos asignados)
- Soporte (solo lectura)

---

**Última actualización**: 17 de febrero de 2026  
**Sistema**: JWT Authentication v1.0
