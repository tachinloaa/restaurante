# 📊 Estructura de Base de Datos - El Rinconcito

## Información General

**DBMS:** PostgreSQL (Supabase)  
**URL:** https://anzeikjpudoimvwpwlac.supabase.co

## 📋 Tablas

### 1. `categorias`
Categorías principales del menú.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Clave primaria |
| nombre | VARCHAR(100) | Nombre de la categoría |
| descripcion | TEXT | Descripción opcional |
| orden | INTEGER | Orden de visualización |
| activo | BOOLEAN | Si está activa |
| created_at | TIMESTAMP | Fecha de creación |

**Ejemplos:** Antojitos, Guisados, Hamburguesas, Caldos, Bebidas, Jugos

---

### 2. `subcategorias`
Subcategorías dentro de cada categoría.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Clave primaria |
| categoria_id | UUID | FK a categorias |
| nombre | VARCHAR(100) | Nombre de subcategoría |
| descripcion | TEXT | Descripción opcional |
| orden | INTEGER | Orden de visualización |
| activo | BOOLEAN | Si está activa |
| created_at | TIMESTAMP | Fecha de creación |

**Ejemplos:** Pambazos, Tostadas, Quesadillas (dentro de Antojitos)

---

### 3. `productos`
Productos del menú (platillos, bebidas, etc.).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Clave primaria |
| nombre | VARCHAR(200) | Nombre del producto |
| descripcion | TEXT | Descripción del producto |
| precio | DECIMAL(10,2) | Precio en MXN |
| stock | INTEGER | Cantidad disponible |
| categoria_id | UUID | FK a categorias |
| subcategoria_id | UUID | FK a subcategorias (opcional) |
| imagen_url | TEXT | URL de imagen |
| activo | BOOLEAN | Si está disponible |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

**Índices:**
- `idx_productos_categoria` en `categoria_id`
- `idx_productos_subcategoria` en `subcategoria_id`
- `idx_productos_activo` en `activo`

---

### 4. `clientes`
Información de clientes registrados.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Clave primaria |
| telefono | VARCHAR(20) | Teléfono (único) |
| nombre | VARCHAR(200) | Nombre completo |
| direccion | TEXT | Dirección de entrega |
| referencias | TEXT | Referencias del domicilio |
| created_at | TIMESTAMP | Fecha de registro |

**Índices:**
- `idx_clientes_telefono` en `telefono`

**Nota:** El teléfono es el identificador único del cliente.

---

### 5. `pedidos`
Pedidos realizados por clientes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Clave primaria |
| numero_pedido | VARCHAR(20) | Número único de pedido |
| cliente_id | UUID | FK a clientes |
| total | DECIMAL(10,2) | Total del pedido |
| tipo_pedido | VARCHAR(20) | domicilio/restaurante/para_llevar |
| estado | VARCHAR(20) | pendiente/preparando/listo/enviado/entregado/cancelado |
| direccion_entrega | TEXT | Dirección (si es domicilio) |
| numero_mesa | INTEGER | Mesa (si es restaurante) |
| numero_personas | INTEGER | Personas (si es restaurante) |
| notas | TEXT | Notas adicionales |
| created_at | TIMESTAMP | Fecha/hora del pedido |
| updated_at | TIMESTAMP | Última actualización |

**Índices:**
- `idx_pedidos_cliente` en `cliente_id`
- `idx_pedidos_estado` en `estado`
- `idx_pedidos_tipo` en `tipo_pedido`
- `idx_pedidos_fecha` en `created_at`

**Estados posibles:**
- `pendiente` - Pedido recibido
- `preparando` - En preparación
- `listo` - Listo para entrega/servir
- `enviado` - En camino (domicilio)
- `entregado` - Completado
- `cancelado` - Cancelado

**Tipos de pedido:**
- `domicilio` - Entrega a domicilio
- `restaurante` - Para comer en el local
- `para_llevar` - Para recoger

---

### 6. `pedido_detalles`
Detalle de productos en cada pedido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Clave primaria |
| pedido_id | UUID | FK a pedidos (cascade) |
| producto_id | UUID | FK a productos |
| cantidad | INTEGER | Cantidad ordenada |
| precio_unitario | DECIMAL(10,2) | Precio al momento del pedido |
| subtotal | DECIMAL(10,2) | cantidad × precio_unitario |
| created_at | TIMESTAMP | Fecha de creación |

**Índices:**
- `idx_pedido_detalles_pedido` en `pedido_id`

---

## 🔄 Relaciones

```
categorias (1) ──< (N) subcategorias
categorias (1) ──< (N) productos
subcategorias (1) ──< (N) productos

clientes (1) ──< (N) pedidos

pedidos (1) ──< (N) pedido_detalles
productos (1) ──< (N) pedido_detalles
```

---

## 🚀 Scripts

### Crear tablas
```bash
psql -h db.proyecto.supabase.co -U postgres -d postgres < DATABASE.sql
```

O ejecutar desde Supabase SQL Editor.

### Datos de ejemplo
Los scripts incluyen datos de ejemplo para desarrollo. Para producción, omitir la sección de datos de ejemplo.

---

## 📝 Notas Importantes

1. **UUIDs:** Todas las tablas usan UUID como clave primaria
2. **Timestamps:** `created_at` se establece automáticamente
3. **Triggers:** `updated_at` se actualiza automáticamente en productos y pedidos
4. **Cascade:** `pedido_detalles` se eliminan automáticamente al eliminar un pedido
5. **Constraints:** Validaciones en `tipo_pedido` y `estado`
6. **Índices:** Optimizados para queries frecuentes

---

## 🔒 Seguridad

Por defecto, las políticas RLS (Row Level Security) están deshabilitadas para simplificar el desarrollo. Para producción, se recomienda:

1. Habilitar RLS en todas las tablas
2. Crear políticas de acceso apropiadas
3. Usar autenticación de Supabase
4. Limitar acceso directo a la BD

---

## 📊 Diagrama ER

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│ categorias  │────<────│ subcategorias│────<────│  productos   │
└─────────────┘         └──────────────┘         └──────────────┘
                                                         │
                                                         │
                        ┌──────────────┐                │
                        │   clientes   │                │
                        └──────────────┘                │
                               │                        │
                               │                        │
                        ┌──────────────┐         ┌──────────────┐
                        │   pedidos    │────<────│pedido_detalles│
                        └──────────────┘         └──────────────┘
```

---

**El Rinconcito** 🌮 - Sistema de Gestión de Pedidos
