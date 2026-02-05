# 🔐 Configurar Autenticación en Supabase

## Crear Usuario Administrador

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard/project/oppjntxqwpalnjwtrpjz)

2. En el menú lateral, haz clic en **Authentication** → **Users**

3. Haz clic en **Add user** (botón verde)

4. Completa el formulario:
   - **Email:** `admin@elrinconcito.com`
   - **Password:** `Admin123!`
   - **Auto Confirm User:** ✅ (Marca esta casilla)

5. Haz clic en **Create user**

## Probar el Login

1. Abre el navegador en: `http://localhost:5173/login`

2. Ingresa las credenciales:
   - **Email:** admin@elrinconcito.com
   - **Password:** Admin123!

3. Haz clic en **Iniciar Sesión**

✅ Deberías ser redirigido al dashboard

## Funcionalidades Implementadas

- ✅ Login con email y contraseña
- ✅ Protección de rutas privadas
- ✅ Redirección automática si no hay sesión
- ✅ Botón de cerrar sesión en el header
- ✅ Persistencia de sesión (localStorage)
- ✅ Contexto de autenticación global

## Crear Más Usuarios

Puedes crear más usuarios admin desde:
- **Opción 1:** Supabase Dashboard → Authentication → Users → Add user
- **Opción 2:** Implementar página de registro (opcional)

## Seguridad

Para producción:
1. Configura políticas RLS adecuadas
2. Agrega verificación de email
3. Implementa recuperación de contraseña
4. Considera 2FA para admins
