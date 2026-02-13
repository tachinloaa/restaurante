# 💰 Cómo Ahorrar Saldo de Twilio

## Problema
Cada mensaje de WhatsApp enviado por Twilio **cuesta dinero**. Durante desarrollo y pruebas, esto puede sumar rápidamente.

## Soluciones Implementadas

### 1. ✅ Modo de Prueba (TWILIO_TEST_MODE)

**Activa el modo de prueba** para que el bot NO envíe mensajes reales de WhatsApp.

**En Render:**
1. Ve a tu servicio backend
2. Environment → Add Environment Variable
3. Agrega: `TWILIO_TEST_MODE` = `true`
4. Guarda y espera el redeploy

**Localmente (.env):**
```bash
TWILIO_TEST_MODE=true
```

**¿Qué hace?**
- ✅ El bot sigue funcionando normalmente
- ✅ Los logs muestran qué mensajes se "enviarían"
- ❌ NO se envían mensajes reales
- ❌ NO se gasta saldo de Twilio

### 2. ✅ Desactivar Recordatorios Automáticos

Los recordatorios se envían **cada 2 minutos** para pedidos pendientes. Esto puede generar muchos mensajes.

**En Render:**
1. Ve a tu servicio backend
2. Environment → Add Environment Variable
3. Agrega: `ENABLE_REMINDERS` = `false`
4. Guarda y espera el redeploy

**Localmente (.env):**
```bash
ENABLE_REMINDERS=false
```

**¿Qué hace?**
- ❌ NO se envían recordatorios automáticos
- ✅ Los pedidos siguen funcionando normalmente
- ✅ Puedes ver pedidos pendientes en el dashboard

### 3. ✅ Eliminación de Duplicados

Se eliminó una notificación duplicada que se enviaba al aprobar pedidos con transferencia bancaria.

**Antes:** 2 mensajes al admin (notificación + ficha de reparto)  
**Ahora:** 1 mensaje al admin (solo ficha de reparto)

## Configuración Recomendada

### Para Desarrollo/Pruebas:
```bash
TWILIO_TEST_MODE=true
ENABLE_REMINDERS=false
```

### Para Producción:
```bash
TWILIO_TEST_MODE=false
ENABLE_REMINDERS=true  # Solo si quieres recordatorios automáticos
```

## Monitoreo de Costos

**Ver consumo de Twilio:**
1. https://console.twilio.com/
2. Monitor → Usage
3. Filtra por fecha para ver cuántos mensajes se han enviado

**Costo aproximado:**
- WhatsApp: ~$0.005 USD por mensaje
- 1000 mensajes = ~$5 USD
- 3000 mensajes = ~$15 USD

## Preguntas Frecuentes

**¿Puedo usar TWILIO_TEST_MODE en producción?**  
❌ No. Los clientes no recibirán mensajes reales.

**¿Qué pasa si desactivo ENABLE_REMINDERS?**  
✅ El sistema sigue funcionando. Solo no se enviarán recordatorios automáticos cada 2 minutos.

**¿Cómo sé si está funcionando?**  
✅ Revisa los logs del servidor. Verás mensajes como:
```
[TEST MODE] Mensaje a cliente +52...
Sistema de recordatorios DESACTIVADO
```
