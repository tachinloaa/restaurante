# 💳 Sistema de Pago por Transferencia

Sistema de pago por transferencia bancaria para pedidos a domicilio.

## 📋 Pasos para activar

### 1️⃣ Ejecutar SQL en Supabase

Ejecuta el archivo `docs/ADD_PAYMENT_FIELDS.sql` en Supabase SQL Editor:

```sql
-- Agrega los campos necesarios a la tabla pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20)...
```

### 2️⃣ Configurar Variables de Entorno en Render

Agrega estas variables en el dashboard de Render (Settings → Environment):

```env
BANCO_NOMBRE=BBVA
BANCO_TITULAR=El Rinconcito
BANCO_CUENTA=1234567890
BANCO_CLABE=012345678901234567
```

**⚠️ IMPORTANTE:** Reemplaza con tus datos bancarios reales.

### 3️⃣ Redesplegar

Render redesplegará automáticamente con el push o manualmente desde el dashboard.

## 🎯 Cómo funciona

### Para el Cliente (WhatsApp):

1. Cliente hace pedido a domicilio
2. Después de ingresar dirección, elige método de pago:
   - **1** 💵 Efectivo
   - **2** 🏦 Transferencia

3. Si elige **Transferencia**:
   - Recibe datos bancarios
   - Realiza la transferencia
   - Envía comprobante
   - Pedido queda pendiente de verificación

4. Si elige **Efectivo**:
   - Pedido se confirma inmediatamente
   - Repartidor lleva cambio

### Para el Admin:

1. Recibe notificación del pedido
2. Si es transferencia:
   - Aparece "⚠️ PAGO PENDIENTE DE VERIFICACIÓN"
   - Verifica el pago en su banco
   - Actualiza el pedido a "preparando" cuando confirme

3. Al cambiar estado a "preparando", el cliente recibe notificación

## 📊 Campos agregados a BD

- `metodo_pago`: 'efectivo' | 'transferencia'
- `pago_verificado`: true | false
- `comprobante_pago`: texto con info del comprobante

## 🔍 Verificar pedidos con pago pendiente

En el dashboard de pedidos, los pedidos con transferencia pendiente tendrán:
- Estado: "pendiente"
- Campo `pago_verificado: false`

## 🚀 Flujo de estados

```
Cliente envía comprobante
    ↓
Pedido creado (pendiente, pago_verificado=false)
    ↓
Admin verifica pago
    ↓
Admin cambia a "preparando" (pago_verificado=true automático)
    ↓
Cliente recibe notificación de confirmación
    ↓
...flujo normal...
```
