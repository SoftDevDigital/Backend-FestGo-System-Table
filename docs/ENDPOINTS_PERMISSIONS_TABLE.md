# 📋 Tabla Completa de Endpoints y Permisos

## 🔍 Guía Rápida de Símbolos

| Símbolo | Significado |
|---------|------------|
| 🔓 | Público (sin autenticación) |
| 👑 | Solo ADMIN |
| 👔 | ADMIN + EMPLOYEE |
| 👤 | CUSTOMER (y otros roles autenticados) |

---

## 📊 Tabla Completa de Endpoints

### 🔐 Autenticación

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/auth/login` | POST | 🔓 Público | Iniciar sesión |
| `/api/v1/auth/register` | POST | 🔓 Público | Registrar usuario |

---

### 📊 Administración

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/admin/dashboard` | GET | 👑 Solo ADMIN | Dashboard con métricas |

---

### 📈 Reportes

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/reports/sales` | GET | 👑 Solo ADMIN | Reporte de ventas |

---

### 🍽️ Mesas (Tables)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/tables` | GET | 🔓 Público | Ver todas las mesas |
| `/api/v1/tables/:id` | GET | 🔓 Público | Ver mesa específica |
| `/api/v1/tables` | POST | 👑 Solo ADMIN | Crear nueva mesa |
| `/api/v1/tables/:id` | PUT | 👑 Solo ADMIN | Actualizar mesa |
| `/api/v1/tables/:id` | DELETE | 👑 Solo ADMIN | Eliminar mesa |

---

### 🍕 Productos (Products)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/products` | GET | 🔓 Público | Ver menú (productos) |

---

### 📦 Inventario (Inventory)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/inventory` | GET | 👔 ADMIN + EMPLOYEE | Ver inventario |
| `/api/v1/inventory/low-stock` | GET | 👔 ADMIN + EMPLOYEE | Ver stock bajo |
| `/api/v1/inventory/value` | GET | 👑 Solo ADMIN | Valor total del inventario |
| `/api/v1/inventory/movements` | GET | 👔 ADMIN + EMPLOYEE | Ver movimientos de stock |
| `/api/v1/inventory/:id` | GET | 👔 ADMIN + EMPLOYEE | Ver item específico |
| `/api/v1/inventory` | POST | 👑 Solo ADMIN | Crear item de inventario |
| `/api/v1/inventory/:id` | PATCH | 👑 Solo ADMIN | Actualizar item |
| `/api/v1/inventory/:id` | DELETE | 👑 Solo ADMIN | Eliminar item |
| `/api/v1/inventory/:id/adjust-stock` | POST | 👑 Solo ADMIN | Ajustar stock |
| `/api/v1/inventory/:id/consume` | POST | 👔 ADMIN + EMPLOYEE | Consumir stock |

---

### 🏢 Proveedores (Suppliers)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/suppliers` | GET | 👔 ADMIN + EMPLOYEE | Ver proveedores |
| `/api/v1/suppliers/:id` | GET | 👔 ADMIN + EMPLOYEE | Ver proveedor específico |
| `/api/v1/suppliers/top-by-volume` | GET | 👔 ADMIN + EMPLOYEE | Top proveedores por volumen |
| `/api/v1/suppliers/by-payment-terms` | GET | 👔 ADMIN + EMPLOYEE | Agrupar por términos de pago |
| `/api/v1/suppliers` | POST | 👑 Solo ADMIN | Crear proveedor |
| `/api/v1/suppliers/:id` | PATCH | 👑 Solo ADMIN | Actualizar proveedor |
| `/api/v1/suppliers/:id` | DELETE | 👑 Solo ADMIN | Eliminar proveedor |
| `/api/v1/suppliers/:id/update-order-stats` | POST | 👑 Solo ADMIN | Actualizar estadísticas |

---

### 📅 Reservas (Reservations)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/reservations` | POST | 🔓 Público | Crear reserva |
| `/api/v1/reservations/check` | GET | 🔓 Público | Verificar disponibilidad |
| `/api/v1/reservations/code/:code` | GET | 🔓 Público | Buscar por código de confirmación |
| `/api/v1/reservations` | GET | 👔 ADMIN + EMPLOYEE | Ver reservas (con filtros) |
| `/api/v1/reservations/:id` | GET | 👔 ADMIN + EMPLOYEE | Ver reserva específica |
| `/api/v1/reservations/:id` | PATCH | 👔 ADMIN + EMPLOYEE | Actualizar reserva |
| `/api/v1/reservations/:id/status` | PATCH | 👔 ADMIN + EMPLOYEE | Cambiar estado (confirm, seat, complete, cancel, no-show) |
| `/api/v1/reservations/:id` | DELETE | 👑 Solo ADMIN | Eliminar reserva |

---

### 👥 Clientes (Customers)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/customers` | POST | 🔓 Público | Crear perfil de cliente |
| `/api/v1/customers` | GET | 👔 ADMIN + EMPLOYEE | Ver clientes (con filtros) |
| `/api/v1/customers/:id` | GET | 👔 ADMIN + EMPLOYEE | Ver cliente específico |
| `/api/v1/customers/:id/reservations` | GET | 👔 ADMIN + EMPLOYEE | Historial de reservas |
| `/api/v1/customers/phone/:phone` | GET | 👔 ADMIN + EMPLOYEE | Buscar por teléfono |
| `/api/v1/customers/:id` | PATCH | 👔 ADMIN + EMPLOYEE | Actualizar cliente |
| `/api/v1/customers/:id/manage?action=add-note` | PATCH | 👔 ADMIN + EMPLOYEE | Agregar nota |
| `/api/v1/customers/:id/manage?action=promote-vip` | PATCH | 👑 Solo ADMIN | Promover a VIP |
| `/api/v1/customers/:id/manage?action=remove-vip` | PATCH | 👑 Solo ADMIN | Quitar VIP |
| `/api/v1/customers/:id` | DELETE | 👑 Solo ADMIN | Eliminar cliente |

---

### ⏳ Lista de Espera (Waitlist)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/waitlist` | POST | 🔓 Público | Agregar a lista de espera |
| `/api/v1/waitlist` | GET | 👔 ADMIN + EMPLOYEE | Ver waitlist (con filtros) |
| `/api/v1/waitlist/:id` | PATCH | 👔 ADMIN + EMPLOYEE | Actualizar entrada (contact, convert, cancel) |
| `/api/v1/waitlist/:id` | DELETE | 👔 ADMIN + EMPLOYEE | Eliminar entrada |
| `/api/v1/waitlist/maintenance` | POST | 👔 ADMIN + EMPLOYEE | Mantenimiento (expirar entradas antiguas) |

---

### 📊 Movimientos de Stock (Stock Movements)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/stock-movements` | GET | 👔 ADMIN + EMPLOYEE | Ver todos los movimientos |
| `/api/v1/stock-movements/by-item/:itemId` | GET | 👔 ADMIN + EMPLOYEE | Movimientos por artículo |
| `/api/v1/stock-movements/by-type/:type` | GET | 👔 ADMIN + EMPLOYEE | Movimientos por tipo |
| `/api/v1/stock-movements/by-date-range` | GET | 👔 ADMIN + EMPLOYEE | Movimientos por rango de fechas |
| `/api/v1/stock-movements/summary` | GET | 👔 ADMIN + EMPLOYEE | Resumen de movimientos |
| `/api/v1/stock-movements/history/:itemId` | GET | 👔 ADMIN + EMPLOYEE | Historial de un artículo |
| `/api/v1/stock-movements/top-moving-items` | GET | 👔 ADMIN + EMPLOYEE | Artículos con más movimiento |

---

### 🛒 Pedidos (Orders)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/orders` | GET | 👔 ADMIN + EMPLOYEE | Ver pedidos |

---

### 💰 Facturas (Bills)

| Endpoint | Método | Permiso | Descripción |
|----------|--------|---------|-------------|
| `/api/v1/bills` | GET | 👔 ADMIN + EMPLOYEE | Ver facturas |

---

## 📊 Resumen por Rol

### 🔓 Endpoints Públicos (15)
- Autenticación (2)
- Productos/Menú (1)
- Mesas - Lectura (2)
- Reservas - Crear/Verificar (3)
- Clientes - Crear (1)
- Waitlist - Agregar (1)

### 👑 Solo ADMIN (25)
- Dashboard y reportes (2)
- Inventario - Escritura (5)
- Proveedores - Escritura (4)
- Mesas - Escritura (3)
- Clientes - Gestión VIP/Eliminar (3)
- Reservas - Eliminar (1)
- Otros (7)

### 👔 ADMIN + EMPLOYEE (35)
- Inventario - Lectura (4)
- Proveedores - Lectura (4)
- Reservas - Gestión (4)
- Clientes - Gestión (5)
- Waitlist - Gestión (4)
- Stock Movements - Todos (7)
- Pedidos y Facturas (2)
- Otros (5)

---

## 🎯 Casos de Uso Comunes

### Cliente quiere hacer una reserva
1. `GET /api/v1/reservations/check` - Verificar disponibilidad (🔓)
2. `POST /api/v1/reservations` - Crear reserva (🔓)
3. `POST /api/v1/customers` - Crear perfil si no existe (🔓)

### Empleado gestiona una reserva
1. `GET /api/v1/reservations?filter=today` - Ver reservas de hoy (👔)
2. `PATCH /api/v1/reservations/:id/status?action=confirm` - Confirmar (👔)
3. `PATCH /api/v1/reservations/:id/status?action=seat&tableId=xxx` - Sentar (👔)
4. `PATCH /api/v1/reservations/:id/status?action=complete` - Completar (👔)

### Admin gestiona inventario
1. `GET /api/v1/inventory` - Ver inventario (👔)
2. `POST /api/v1/inventory` - Crear item (👑)
3. `POST /api/v1/inventory/:id/adjust-stock` - Ajustar stock (👑)
4. `GET /api/v1/inventory/value` - Ver valor total (👑)

### Admin ve reportes
1. `GET /api/v1/admin/dashboard` - Dashboard (👑)
2. `GET /api/v1/reports/sales` - Reporte de ventas (👑)

---

## ⚠️ Notas Importantes

1. **Todos los endpoints están protegidos por defecto** excepto los marcados con 🔓
2. **El token JWT debe incluirse en el header**: `Authorization: Bearer <token>`
3. **Los errores 401** indican token inválido o expirado → redirigir a login
4. **Los errores 403** indican falta de permisos → mostrar mensaje apropiado
5. **Los endpoints públicos** no requieren token, pero pueden funcionar con uno válido

---

**Última actualización**: 30 de noviembre de 2025  
**Versión**: 1.0.0

