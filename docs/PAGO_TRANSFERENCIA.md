# 💳 Sistema de Pago por Transferencia

Sistema de pago por transferencia bancaria para pedidos a domicilio.

## 📋 Pasos para activar

### 1️⃣ Ejecutar SQL en Supabase

Ejecuta el archivo `docs/ADD_PAYMENT_FIELDS.sql` en Supabase SQL Editor:

```sql
-- Agrega los campos necesarios a la tabla pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20)...
```

**Eso es todo!** No necesitas configurar variables de entorno.

## 🎯 Cómo funciona

### Para el Cliente (WhatsApp):

1. Cliente hace pedido a domicilio
2. Después de ingresar dirección, elige método de pago:
   - **1** 💵 Efectivo
   - **2** 🏦 Transferencia

3. Si elige **Transferencia**:
   - Bot le pide que envíe comprobante
   - Cliente realiza transferencia a tu cuenta
   - Cliente envía foto/captura del comprobante
   - Pedido queda pendiente de verificación

4. Si elige **Efectivo**:
   - Pedido se confirma inmediatamente
   - Repartidor lleva cambio

### Para el Admin:

1. Recibes notificación del pedido
2. Si es transferencia:
   - Aparece "⚠️ PAGO PENDIENTE DE VERIFICACIÓN"
   - Recibes el comprobante del cliente
   - Verificas el pago en tu banco
   - Actualizas el pedido a "preparando" cuando confirmes

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
Admin verifica pago en su banco
    ↓
Admin cambia a "preparando" en dashboard
    ↓
Cliente recibe notificación de confirmación
    ↓
...flujo normal...
```
