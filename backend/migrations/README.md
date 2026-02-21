# MIGRACIÓN URGENTE - Agregar estado pendiente_pago

## ⚠️ EJECUTAR INMEDIATAMENTE EN SUPABASE

### Pasos:

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto "El Rinconcito"
3. Ve a "SQL Editor" en el menú lateral
4. Crea una nueva query
5. Copia y pega el contenido del archivo `add_pendiente_pago_estado.sql`
6. Haz click en "RUN"

### ¿Por qué es necesario?

El sistema está intentando crear pedidos con estado `pendiente_pago` pero la base de datos
solo acepta estos estados:
- pendiente
- preparando  
- listo
- enviado
- entregado
- cancelado

Necesitamos agregar `pendiente_pago` a la lista de estados válidos.

### Después de ejecutar:

El sistema funcionará correctamente y:
- Los pedidos con transferencia se crearán con estado `pendiente_pago`
- El admin recibirá la notificación con el comprobante
- Podrás aprobar/rechazar desde WhatsApp o Dashboard
