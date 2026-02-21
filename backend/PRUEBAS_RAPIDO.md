# 🧪 INICIO RÁPIDO - PRUEBAS DEL BOT

## ⚡ Opción Más Fácil (Recomendada)

```bash
cd backend
npm run test:bot
```

Esto inicia el simulador interactivo. Escribe mensajes como si fueras un cliente:

```
👤 Tú: hola
🤖 Bot: ¡Hola! Bienvenido...

👤 Tú: menu
🤖 Bot: MENÚ DE EL RINCONCITO...

👤 Tú: 1
🤖 Bot: PAMBAZOS...
```

**✅ NO gasta créditos de Twilio**

## 📝 Qué Probar

1. **Conversación básica:**
   - `hola` → Ver bienvenida
   - `menu` → Ver categorías
   - `1` → Ver productos de categoría 1
   
2. **Hacer pedido:**
   - `pedir` → Iniciar pedido
   - Seleccionar domicilio/para llevar
   - Agregar productos
   - Confirmar

3. **Editar (⚡ optimizado):**
   - En confirmación: `editar nombre`
   - Cambia el dato
   - **Verifica que NO envía mensaje** (ahorra Twilio)

4. **Comandos:**
   - `cancelar` - Cancelar proceso
   - `ayuda` - Ver comandos
   - `salir` - Terminar simulador

## 🔍 Más Detalles

Ver [TESTING.md](TESTING.md) para documentación completa.

## ⚠️ Recordatorio

**SIEMPRE** prueba aquí ANTES de probar con Twilio real para no gastar dinero.
