# API Documentation

## Endpoints Principales

### Autenticación
- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/refresh` - Refrescar token
- `DELETE /api/v1/auth/logout` - Cerrar sesión

### Mesas
- `GET /api/v1/tables` - Obtener todas las mesas
- `POST /api/v1/tables` - Crear nueva mesa
- `GET /api/v1/tables/:id` - Obtener mesa por ID
- `PUT /api/v1/tables/:id` - Actualizar mesa
- `DELETE /api/v1/tables/:id` - Eliminar mesa

### Productos
- `GET /api/v1/products` - Obtener todos los productos
- `POST /api/v1/products` - Crear nuevo producto
- `GET /api/v1/products/:id` - Obtener producto por ID
- `PUT /api/v1/products/:id` - Actualizar producto
- `DELETE /api/v1/products/:id` - Eliminar producto

### Pedidos
- `GET /api/v1/orders` - Obtener todos los pedidos
- `POST /api/v1/orders` - Crear nuevo pedido
- `GET /api/v1/orders/:id` - Obtener pedido por ID
- `PUT /api/v1/orders/:id` - Actualizar pedido
- `DELETE /api/v1/orders/:id` - Eliminar pedido

### Facturación
- `GET /api/v1/bills` - Obtener todas las facturas
- `POST /api/v1/bills` - Crear nueva factura
- `GET /api/v1/bills/:id` - Obtener factura por ID
- `POST /api/v1/bills/:id/print` - Imprimir factura

### Administración
- `GET /api/v1/admin/dashboard` - Dashboard del administrador
- `GET /api/v1/admin/movements` - Movimientos financieros
- `POST /api/v1/admin/movements` - Registrar movimiento

### Reportes
- `GET /api/v1/reports/sales` - Reporte de ventas
- `GET /api/v1/reports/daily` - Reporte diario
- `GET /api/v1/reports/monthly` - Reporte mensual

## Modelos de Datos

### Usuario
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "admin|waiter|chef",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Mesa
```json
{
  "id": "string",
  "number": "number",
  "capacity": "number",
  "status": "available|occupied|reserved",
  "location": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Producto
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "price": "number",
  "categoryId": "string",
  "available": "boolean",
  "imageUrl": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Pedido
```json
{
  "id": "string",
  "tableId": "string",
  "items": [
    {
      "productId": "string",
      "quantity": "number",
      "price": "number"
    }
  ],
  "total": "number",
  "status": "pending|preparing|ready|served",
  "createdAt": "string",
  "updatedAt": "string"
}
```

## Códigos de Estado

- `200` - Éxito
- `201` - Creado
- `400` - Solicitud incorrecta
- `401` - No autorizado
- `403` - Prohibido
- `404` - No encontrado
- `500` - Error interno del servidor