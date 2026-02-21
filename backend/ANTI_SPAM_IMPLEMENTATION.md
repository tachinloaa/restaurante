# 🔒 Sistema Anti-Spam para Pedidos - Implementado

## ✅ ¿Qué se implementó?

### 1. **Límite de Pedidos Pendientes**
- Máximo **2 pedidos pendientes** por número de teléfono
- Si intenta hacer un 3er pedido, recibe mensaje explicando que debe completar los anteriores
- Se valida ANTES de iniciar el flujo del pedido

### 2. **Confirmación Explícita**
- El cliente debe escribir exactamente: **"SI CONFIRMO"**
- Ya no basta con escribir solo "SI"
- Si escribe solo "SI", el bot le pide que escriba "SI CONFIRMO"

### 3. **Tracking de Cancelaciones** (preparado, no activo aún)
- Nueva columna `cancelaciones_count` en tabla `clientes`
- Nueva columna `bloqueado_hasta` para bloqueos temporales
- Funciones SQL para gestionar bloqueos automáticos
- Métodos en `Customer` model listos para usar

---

## 🚀 Cómo Aplicar en Producción

### Paso 1: Aplicar Migración SQL en Supabase

1. Ve a tu proyecto Supabase: https://app.supabase.com
2. Click en **SQL Editor** (menú izquierdo)
3. Click en **New Query**
4. Copia y pega el contenido del archivo: 
   ```
   backend/migrations/add_cancelaciones_tracking.sql
   ```
5. Click en **Run** (o presiona Ctrl+Enter)
6. Verifica que diga: "Success. No rows returned"

### Paso 2: Verificar que se crearon las columnas

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
  AND column_name IN ('cancelaciones_count', 'bloqueado_hasta');
```

Deberías ver:
```
column_name          | data_type
---------------------|----------
cancelaciones_count  | integer
bloqueado_hasta      | timestamp with time zone
```

### Paso 3: Desplegar el código

El código ya está listo, solo haz:
```bash
git add .
git commit -m "feat: agregar sistema anti-spam para pedidos

- Límite de 2 pedidos pendientes por usuario
- Confirmación explícita 'SI CONFIRMO' requerida
- Tracking de cancelaciones preparado
- Funciones SQL para bloqueos automáticos"
git push origin main
```

Render desplegará automáticamente.

---

## 📊 Cómo Funciona

### Flujo Normal (Cliente Serio)

```
Cliente: "pedir"
Bot: ✅ Solo tiene 1 pedido pendiente → Continúa normal
...
Bot: "Para confirmar, escribe: SI CONFIRMO"
Cliente: "SI CONFIRMO"
Bot: ✅ Pedido confirmado #123
```

### Flujo Bloqueado (Usuario con 2 pendientes)

```
Cliente: "pedir"
Bot: ⚠️ LÍMITE ALCANZADO
     Tienes 2 pedidos pendientes:
     1. Pedido #120 - $150 - pendiente
     2. Pedido #121 - $200 - en_proceso
     
     Completa o cancela antes de crear uno nuevo.
```

### Flujo Sin Confirmación Explícita

```
Cliente: "pedir"
...
Bot: "Para confirmar, escribe: SI CONFIRMO"
Cliente: "si"
Bot: ⚠️ CONFIRMACIÓN REQUERIDA
     Para confirmar, escribe exactamente:
     SI CONFIRMO
```

---

## 🛠️ Funciones Disponibles (Customer Model)

### Incrementar cancelaciones
```javascript
await Customer.incrementarCancelaciones('+525519060013');
```

### Bloquear usuario por 7 días
```javascript
await Customer.bloquear('+525519060013', 7);
```

### Desbloquear usuario
```javascript
await Customer.desbloquear('+525519060013');
```

### Verificar si está bloqueado
```javascript
const { bloqueado } = await Customer.estaBloqueado('+525519060013');
if (bloqueado) {
  return 'Usuario bloqueado';
}
```

### Obtener contador de cancelaciones
```javascript
const { cancelaciones } = await Customer.getCancelaciones('+525519060013');
console.log(`Tiene ${cancelaciones} cancelaciones`);
```

---

## 🔮 Próximos Pasos (Opcional)

Si quieres activar el **bloqueo automático** después de 3 cancelaciones:

### 1. Modificar función de cancelación de pedido en `botService.js`

Busca donde se cancela un pedido y agrega:

```javascript
// Después de cancelar el pedido
await Customer.incrementarCancelaciones(telefono);

// Verificar si ya tiene 3+ cancelaciones
const { cancelaciones } = await Customer.getCancelaciones(telefono);

if (cancelaciones >= 3) {
  // Bloquear por 7 días
  await Customer.bloquear(telefono, 7);
  
  // Notificar al admin
  await NotificationService.enviarWhatsApp(
    config.adminPhone,
    `⚠️ Usuario ${telefono} bloqueado automáticamente por 3 cancelaciones`
  );
  
  return {
    success: true,
    mensaje: '⚠️ Tu número ha sido suspendido temporalmente por múltiples cancelaciones.\n\n' +
      'Contacta al administrador para más información.'
  };
}

// Advertencia en 2da cancelación
if (cancelaciones === 2) {
  await NotificationService.enviarWhatsApp(
    config.adminPhone,
    `⚠️ Alerta: Usuario ${telefono} tiene 2 cancelaciones.\nUna más y será bloqueado automáticamente.`
  );
}
```

### 2. Agregar validación de bloqueo al iniciar pedido

En `solicitarTipoPedido()`, después de validar pedidos pendientes:

```javascript
// Verificar si el usuario está bloqueado
const { bloqueado } = await Customer.estaBloqueado(telefono);
if (bloqueado) {
  const { bloqueado_hasta } = await Customer.getCancelaciones(telefono);
  
  return {
    success: true,
    mensaje: `🚫 *ACCESO TEMPORALMENTE SUSPENDIDO*\n\n` +
      `Tu número está bloqueado hasta: ${new Date(bloqueado_hasta).toLocaleDateString()}\n\n` +
      `Motivo: Múltiples cancelaciones de pedidos\n\n` +
      `📞 Contacta al administrador: ${config.adminPhone}`
  };
}
```

---

## ✅ Estado Actual

- ✅ Validación de 2 pedidos pendientes: **ACTIVA**
- ✅ Confirmación explícita "SI CONFIRMO": **ACTIVA**
- ⏳ Tracking de cancelaciones: **PREPARADO** (migración SQL lista para aplicar)
- ⏳ Bloqueo automático: **OPCIONAL** (código arriba si lo quieres activar)

---

## 🧪 Cómo Probar Localmente

### Test 1: Límite de Pedidos Pendientes

1. Crea 2 pedidos sin completarlos (déjalos en "pendiente")
2. Intenta crear un 3er pedido
3. Deberías ver el mensaje de bloqueo

### Test 2: Confirmación Explícita

1. Inicia un pedido normal
2. Llega a la confirmación
3. Escribe "si" → Debería pedir "SI CONFIRMO"
4. Escribe "SI CONFIRMO" → Debería crear el pedido

### Test 3: Tracking de Cancelaciones (después de aplicar migración)

```javascript
// En node o en un script de prueba
const Customer = require('./src/models/Customer.js');

// Incrementar cancelaciones
await Customer.incrementarCancelaciones('+525519060013');

// Ver contador
const { cancelaciones } = await Customer.getCancelaciones('+525519060013');
console.log('Cancelaciones:', cancelaciones); // Debería mostrar 1
```

---

## 📝 Archivos Modificados

- ✏️ `src/services/botService.js` - Validación pendientes + confirmación explícita
- ✏️ `src/models/Customer.js` - Métodos de tracking de cancelaciones
- ✨ `migrations/add_cancelaciones_tracking.sql` - Nuevas columnas y funciones

---

¡Sistema anti-spam listo para producción! 🎉
