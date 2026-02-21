# 🧪 MODO DE PRUEBAS - SIN GASTAR TWILIO

Este directorio contiene herramientas para probar el bot **SIN consumir créditos de Twilio**.

## 🚀 Cómo Hacer Pruebas

### Opción 1: Simulador Interactivo (Recomendado)

Simula una conversación completa con el bot en tu terminal:

```bash
cd backend
node test-bot.js
```

**Características:**
- ✅ NO gasta créditos de Twilio
- ✅ Conversación interactiva en tiempo real
- ✅ Prueba todos los flujos del bot
- ✅ Colores para mejor visualización
- ✅ Puedes probar ediciones, pagos, etc.

**Comandos del simulador:**
- Escribe cualquier mensaje como lo haría un cliente
- `ayuda` - Ver comandos disponibles
- `salir` o `exit` - Terminar simulación

**Ejemplo de uso:**
```
👤 Tú: hola
🤖 Bot: ¡Hola! Bienvenido a El Rinconcito...

👤 Tú: menu
🤖 Bot: MENÚ DE EL RINCONCITO...

👤 Tú: 1
🤖 Bot: PAMBAZOS...
```

---

### Opción 2: Modo de Prueba en Servidor

Si quieres probar con ngrok/localhost pero sin gastar Twilio:

1. **Activar modo prueba en `.env`:**
```bash
TWILIO_TEST_MODE=true
```

2. **Iniciar servidor:**
```bash
npm start
```

3. **Los mensajes se mostrarán en consola en vez de enviarse:**
```
[TEST MODE] Mensaje a cliente +525512345678: ¡Hola! Bienvenido...
```

---

### Opción 3: Pruebas Automatizadas (Para desarrolladores)

Ejecutar suite de pruebas automatizadas:

```bash
npm test
```

*(Nota: Esto requiere tener los tests configurados)*

---

## 📊 Qué Puedes Probar

### ✅ Flujos Básicos
- [x] Iniciar conversación con "hola"
- [x] Ver menú completo
- [x] Seleccionar categorías
- [x] Ver productos
- [x] Agregar al carrito
- [x] Confirmar pedido

### ✅ Flujos Avanzados
- [x] **Edición:** Cambiar nombre, dirección, carrito
- [x] **Para llevar:** Pago en efectivo
- [x] **Domicilio:** Con dirección y referencias
- [x] **Transferencia:** Con comprobante
- [x] **Cancelar:** En cualquier momento

### ✅ Comandos Admin
- [x] Ver pedidos pendientes
- [x] Ver detalle de pedido
- [x] Cambiar estado
- [x] Aprobar/rechazar transferencias

---

## 💡 Consejos de Prueba

### Para Probar Ediciones:
1. Inicia pedido: `pedir`
2. Agrega productos
3. En confirmación escribe: `editar nombre`
4. Cambia el dato
5. Verifica que NO se envían mensajes intermedios (ahorra Twilio ⚡)

### Para Probar Pago con Transferencia:
1. Selecciona "Transferencia" como método de pago
2. El bot mostrará datos bancarios
3. Simula envío de comprobante
4. Verifica que crea pedido con estado `pendiente_pago`

### Para Probar Admin:
1. Cambia el `ADMIN_PHONE_NUMBER` en `.env` al teléfono simulado
2. Prueba comandos: `pedidos`, `ver #1`, `entregado #1`

---

## 🔧 Troubleshooting

### "Error: Cannot find module..."
```bash
cd backend
npm install
```

### "Error de conexión a Supabase"
- Verifica que tu `.env` tenga las credenciales correctas
- El simulador necesita conexión a DB para funcionar

### "No veo mensajes del bot"
- Verifica que `TWILIO_TEST_MODE=true` esté activo
- Checa los logs en la consola

---

## 📝 Notas Importantes

⚠️ **SIEMPRE** prueba primero con el simulador antes de probar con Twilio real
⚠️ **NO** uses números reales en modo de prueba
⚠️ **VERIFICA** que `TWILIO_TEST_MODE=true` antes de probar

✅ El simulador usa una sesión temporal que se borra al cerrar
✅ Los pedidos creados en pruebas SÍ se guardan en la DB (úsalo con cuidado)
✅ Puedes usar múltiples terminales para simular varios clientes

---

## 🎯 Checklist Antes de Producción

Antes de desactivar el modo de prueba y usar Twilio real:

- [ ] Probaste TODOS los flujos con el simulador
- [ ] Verificaste ediciones (no envían mensajes extras)
- [ ] Confirmaste que solo ENTREGADO notifica
- [ ] Probaste con admin y cliente
- [ ] Revisaste que no hay bugs de loop infinito
- [ ] Testeaste pago efectivo y transferencia
- [ ] Validaste mensajes largos (división automática)

**Solo entonces:**
```bash
# En .env
TWILIO_TEST_MODE=false  # o quita la línea
```

---

## 📞 ¿Dudas?

Si algo no funciona, revisa:
1. Los logs de consola (tienen mucha info útil)
2. El estado de la sesión en Redis
3. Los pedidos creados en Supabase

**¡Felices pruebas!** 🎉
