# 🔒 Sistema Anti-Spam COMPLETAMENTE ACTIVADO

## ✅ Estado: 100% OPERATIVO EN PRODUCCIÓN

Todas las medidas de protección anti-spam están **activas y funcionando** en el sistema.

## 🎯 Medidas Activas (4 Capas de Protección)

### 1. 🚫 Validación de Cliente Bloqueado (ACTIVO)
**Ubicación:** `botService.js` - `solicitarTipoPedido()` línea ~314

**Qué hace:**
- Verifica si el cliente está bloqueado antes de iniciar pedido
- Muestra fecha de desbloqueo y razón
- Previene spam desde el primer contacto

**Mensaje al usuario:**
```
🚫 CLIENTE BLOQUEADO TEMPORALMENTE

Has cancelado 3 pedidos recientemente.

⏰ Podrás hacer pedidos nuevamente el:
15/02/2026, 10:30 AM

Para más información, contacta con el restaurante.
```

---

### 2. ⚠️ Límite de Pedidos Pendientes (ACTIVO)
**Ubicación:** `botService.js` - `solicitarTipoPedido()` línea ~340

**Qué hace:**
- Máximo 2 pedidos pendientes simultáneos
- Estados que cuentan: `pendiente`, `en_proceso`, `pendiente_pago`
- Muestra lista de pedidos existentes
- Obliga a completar/cancelar antes de crear nuevo

**Mensaje al usuario:**
```
⚠️ LÍMITE DE PEDIDOS ALCANZADO

Tienes 2 pedidos pendientes.

Por favor completa o cancela los anteriores antes de crear uno nuevo:

1. Pedido #2602106719
   💰 Total: $250.00 MXN
   📊 Estado: pendiente
```

---

### 3. 🔐 Confirmación Explícita (ACTIVO)
**Ubicación:** `botService.js` - `procesarConfirmacion()` línea ~1355

**Qué hace:**
- Requiere escribir exactamente "SI CONFIRMO" (no solo "SI")
- Previene confirmaciones accidentales
- Agrega fricción mínima (~5 segundos) para usuarios legítimos

**Flujo:**
```
Bot: "Para confirmar, escribe: SI CONFIRMO"
Usuario: "si"
Bot: "⚠️ Para confirmar tu pedido, escribe exactamente: SI CONFIRMO"
Usuario: "SI CONFIRMO"
Bot: ✅ Pedido creado
```

---

### 4. 🎯 Tracking y Bloqueo Automático (ACTIVO)
**Ubicaciones:**
- `botService.js` - `procesarCancelacionPedido()` línea ~2325
- `botService.js` - `rechazarPedidoPendiente()` línea ~2960
- `orderService.js` - `cancelarPedido()` línea ~380

**Qué hace:**
1. **Incrementa contador** en cada cancelación
2. **Al llegar a 3 cancelaciones**: Bloqueo automático por 7 días
3. **Notifica al admin** cuando bloquea automáticamente
4. **Manejo de errores**: Si falla el tracking, la cancelación se completa igual (no bloquea el flujo)

**Notificación al admin:**
```
🚫 CLIENTE BLOQUEADO AUTOMÁTICAMENTE

📱 Cliente: +525519060013
❌ Cancelaciones: 3
⏰ Bloqueado por: 7 días

El cliente ha cancelado múltiples pedidos.
```

---

## 🔄 Flujos Completos

### Escenario A: Cliente Normal (Primera Vez)
```
1. Usuario: "pedir"
2. ✅ Sistema: No bloqueado
3. ✅ Sistema: 0 pedidos pendientes
4. Sistema: Muestra menú
5. Usuario: Selecciona productos
6. Sistema: "Para confirmar, escribe: SI CONFIRMO"
7. Usuario: "SI CONFIRMO"
8. ✅ Pedido creado
```

### Escenario B: Cliente con 2 Pedidos Pendientes
```
1. Usuario: "pedir"
2. ✅ Sistema: No bloqueado
3. ❌ Sistema: 2 pedidos pendientes (LÍMITE)
4. Sistema: Muestra mensaje con lista de pedidos
5. Usuario: Debe completar o cancelar antes de continuar
```

### Escenario C: Primera y Segunda Cancelación
```
Cancelación 1:
- Usuario: "cancelar pedido #123"
- ✅ Pedido cancelado
- 🔒 Contador: 0 → 1
- Estado: Normal, puede seguir pidiendo

Cancelación 2:
- Usuario: "cancelar pedido #456"
- ✅ Pedido cancelado
- 🔒 Contador: 1 → 2
- Estado: Normal (advertencia interna), puede seguir pidiendo
```

### Escenario D: Tercera Cancelación → BLOQUEO AUTOMÁTICO
```
Cancelación 3:
1. Usuario: "cancelar pedido #789"
2. ✅ Pedido cancelado
3. 🔒 Contador: 2 → 3
4. 🚫 BLOQUEO AUTOMÁTICO (7 días)
5. 📩 Admin notificado
6. Logger: "🚫 Cliente +525519060013 bloqueado automáticamente por 3 cancelaciones"

Próximo intento:
- Usuario: "pedir"
- ❌ Sistema: Cliente bloqueado
- Mensaje: Bloqueo temporal con fecha de desbloqueo
```

### Escenario E: Cliente Bloqueado Intenta Pedir
```
1. Usuario: "pedir"
2. ❌ Validación de bloqueo: BLOQUEADO
3. Sistema: Mensaje con fecha de desbloqueo
4. ❌ No puede continuar con el pedido
```

---

## 📊 Base de Datos

### Tabla modificada: `clientes`
```sql
-- Columnas agregadas
cancelaciones_count INTEGER DEFAULT 0
bloqueado_hasta TIMESTAMP WITH TIME ZONE DEFAULT NULL

-- Índice para optimizar consultas
CREATE INDEX idx_clientes_bloqueado ON clientes(bloqueado_hasta);
```

### Funciones RPC (PostgreSQL)

#### 1. `incrementar_cancelacion(telefono_param VARCHAR)`
Incrementa el contador de cancelaciones en 1.

#### 2. `bloquear_cliente(telefono_param VARCHAR, dias_param INTEGER DEFAULT 7)`
Bloquea al cliente por N días.

#### 3. `desbloquear_cliente(telefono_param VARCHAR)`
Desbloquea al cliente manualmente.

#### 4. `cliente_esta_bloqueado(telefono_param VARCHAR) RETURNS BOOLEAN`
Verifica si el cliente está bloqueado actualmente.

---

## 🛠️ Administración Manual

### Ver estado de un cliente
```sql
SELECT 
  telefono,
  nombre,
  cancelaciones_count,
  bloqueado_hasta,
  CASE 
    WHEN bloqueado_hasta IS NULL THEN 'Normal'
    WHEN bloqueado_hasta > NOW() THEN 'BLOQUEADO'
    ELSE 'Desbloqueado'
  END as estado
FROM clientes
WHERE telefono = '+525519060013';
```

### Bloquear cliente manualmente
```javascript
await Customer.bloquear('+525519060013', 7); // 7 días
```

### Desbloquear cliente (perdón)
```javascript
await Customer.desbloquear('+525519060013');
```

### Reset completo de contador
```sql
UPDATE clientes 
SET cancelaciones_count = 0,
    bloqueado_hasta = NULL
WHERE telefono = '+525519060013';
```

### Ver todos los clientes bloqueados
```sql
SELECT 
  telefono,
  nombre,
  cancelaciones_count,
  bloqueado_hasta,
  EXTRACT(DAY FROM (bloqueado_hasta - NOW())) || ' días' as tiempo_restante
FROM clientes
WHERE bloqueado_hasta > NOW()
ORDER BY bloqueado_hasta ASC;
```

### Ver clientes con cancelaciones (no bloqueados)
```sql
SELECT 
  telefono,
  nombre,
  cancelaciones_count,
  bloqueado_hasta
FROM clientes
WHERE cancelaciones_count > 0 AND (bloqueado_hasta IS NULL OR bloqueado_hasta < NOW())
ORDER BY cancelaciones_count DESC;
```

---

## 📝 Logs y Monitoreo

### Logs generados automáticamente

**Cuando se incrementa el contador:**
```
[INFO] 📊 Cancelaciones incrementadas para +525519060013
```

**Cuando se bloquea automáticamente:**
```
[WARN] 🚫 Cliente +525519060013 bloqueado automáticamente por 3 cancelaciones
[WARN] 🚫 Cliente +525519060013 bloqueado automáticamente por 3 cancelaciones (rechazo admin)
[WARN] 🚫 Cliente +525519060013 bloqueado automáticamente por 3 cancelaciones (panel admin)
```

**Cuando hay error en tracking (no afecta flujo):**
```
[ERROR] Error en tracking de cancelación: [detalles]
[ERROR] Error al verificar bloqueo del cliente: [detalles]
```

---

## ⚙️ Configuración y Ajustes

### Cambiar umbral de bloqueo (3 cancelaciones)
Buscar en los 3 archivos:
```javascript
if (cancelaciones.cancelaciones_count >= 3) {
```
Cambiar `3` por el número deseado.

**Archivos:**
- `backend/src/services/botService.js` (2 ubicaciones)
- `backend/src/services/orderService.js` (1 ubicación)

### Cambiar días de bloqueo (7 días)
Buscar en los mismos archivos:
```javascript
await Customer.bloquear(telefono, 7);
```
Cambiar `7` por el número de días deseado.

### Cambiar límite de pedidos pendientes (2)
En `botService.js` - `solicitarTipoPedido()`:
```javascript
if (!error && pedidosPendientes && pedidosPendientes.length >= 2) {
```
Cambiar `2` por el límite deseado.

---

## ⚠️ Consideraciones Importantes

### ✅ Seguridad Implementada
- **Todas las validaciones son aditivas**: No se eliminó nada del código existente
- **Manejo de errores robusto**: Si falla el tracking, la cancelación se completa igual
- **Sin breaking changes**: Los usuarios normales experimentan el mismo flujo

### 👥 Experiencia del Usuario

**Usuarios Legítimos:**
- Solo deben escribir "SI CONFIRMO" en lugar de "SI"
- Fricción adicional: ~5 segundos
- Si cancelan ocasionalmente (< 3 veces): Sin impacto

**Spammers:**
- Bloqueados después de 3 cancelaciones
- Máximo 2 pedidos pendientes simultáneos
- Deben esperar 7 días para reintentar

### 🔄 Flujo sin Riesgos
Si alguna parte del sistema anti-spam falla:
- Las cancelaciones se procesan normalmente
- Los pedidos se crean normalmente
- Solo se pierde el tracking, no la funcionalidad

---

## 🧪 Cómo Probar

### Test de bloqueo automático (completo)
```bash
# 1. Crear cliente de prueba con 0 cancelaciones

# 2. Crear y cancelar pedido #1
Usuario: "cancelar pedido #123"
Verificar DB: cancelaciones_count = 1

# 3. Crear y cancelar pedido #2
Usuario: "cancelar pedido #456"
Verificar DB: cancelaciones_count = 2

# 4. Crear y cancelar pedido #3 (TRIGGER DE BLOQUEO)
Usuario: "cancelar pedido #789"
Verificar DB: 
  - cancelaciones_count = 3
  - bloqueado_hasta = NOW() + 7 días
Verificar: Admin recibió notificación

# 5. Intentar hacer pedido nuevo (DEBE BLOQUEARSE)
Usuario: "pedir"
Resultado esperado: Mensaje de bloqueo con fecha
```

### Test de límite de pedidos
```bash
# 1. Crear 2 pedidos pendientes manualmente en Supabase
# 2. Intentar hacer pedido por WhatsApp
Usuario: "pedir"
Resultado esperado: Mensaje de límite alcanzado
```

### Test de confirmación explícita
```bash
# 1. Iniciar pedido normal
Usuario: "pedir" → seleccionar productos → continuar

# 2. En confirmación escribir solo "SI"
Usuario: "si"
Resultado esperado: "⚠️ Para confirmar tu pedido, escribe exactamente: SI CONFIRMO"

# 3. Escribir confirmación correcta
Usuario: "SI CONFIRMO"
Resultado esperado: ✅ Pedido creado
```

---

## 📈 Métricas de Éxito

Para medir la efectividad del sistema:

1. **Tasa de cancelaciones**: Antes vs Después
2. **Clientes bloqueados por semana**: Cuántos spammers detectados
3. **Falsos positivos**: Clientes legítimos bloqueados por error (objetivo: 0%)
4. **Reducción de pedidos falsos**: Comparar con período anterior

**Query para métricas:**
```sql
-- Cancelaciones por mes
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  COUNT(*) as total_cancelaciones
FROM pedidos
WHERE estado = 'cancelado'
GROUP BY mes
ORDER BY mes DESC;

-- Clientes bloqueados esta semana
SELECT COUNT(*) as clientes_bloqueados
FROM clientes
WHERE bloqueado_hasta > NOW() 
  AND bloqueado_hasta <= NOW() + INTERVAL '7 days';

-- Top 10 clientes con más cancelaciones
SELECT 
  telefono,
  nombre,
  cancelaciones_count,
  bloqueado_hasta
FROM clientes
WHERE cancelaciones_count > 0
ORDER BY cancelaciones_count DESC
LIMIT 10;
```

---

## ✅ Checklist de Implementación

- [x] Columnas en base de datos agregadas
- [x] Funciones RPC creadas
- [x] Métodos en Customer model implementados
- [x] Validación de bloqueo al iniciar pedido
- [x] Límite de pedidos pendientes activo
- [x] Confirmación explícita implementada
- [x] Tracking en cancelación por cliente (WhatsApp)
- [x] Tracking en rechazo de admin (WhatsApp)
- [x] Tracking en cancelación desde panel admin
- [x] Bloqueo automático al llegar a 3 cancelaciones
- [x] Notificación al admin en bloqueo automático
- [x] Manejo de errores robusto
- [x] Documentación completa
- [x] Código probado sin errores
- [x] Deploy a producción

---

## 🚀 Estado Final

**Sistema 100% operativo y en producción.**

Todas las capas de protección están activas:
1. ✅ Validación de bloqueo al inicio
2. ✅ Límite de pedidos pendientes
3. ✅ Confirmación explícita obligatoria
4. ✅ Tracking automático y bloqueo después de 3 cancelaciones

**Última actualización:** 17 de febrero de 2026
**Commit:** `feat: activar bloqueo automático después de 3 cancelaciones`
