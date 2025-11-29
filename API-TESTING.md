# 🧪 Pruebas de API Simplificada

## Pruebas con cURL

### 1. Obtener reservas de hoy
```bash
curl -X GET "http://localhost:3000/reservations?filter=today" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Confirmar una reserva
```bash
curl -X PATCH "http://localhost:3000/reservations/res_123/status?action=confirm" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Obtener clientes VIP
```bash
curl -X GET "http://localhost:3000/customers?filter=vip" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Buscar cliente por nombre
```bash
curl -X GET "http://localhost:3000/customers?q=juan" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Promover cliente a VIP
```bash
curl -X PATCH "http://localhost:3000/customers/cust_123/manage?action=promote-vip&reason=Alto%20gasto" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Lista de espera de hoy con estadísticas
```bash
curl -X GET "http://localhost:3000/waitlist?date=today&stats=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Verificar disponibilidad
```bash
curl -X GET "http://localhost:3000/reservations/check?type=availability&date=2025-11-20&partySize=4" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Obtener horarios disponibles
```bash
curl -X GET "http://localhost:3000/reservations/check?type=slots&date=2025-11-20&partySize=4" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Pruebas con Postman

### Collection Settings
- **Base URL:** `http://localhost:3000`
- **Authorization:** Bearer Token
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`

### Variables
```json
{
  "baseUrl": "http://localhost:3000",
  "token": "YOUR_JWT_TOKEN",
  "testReservationId": "res_123",
  "testCustomerId": "cust_456"
}
```

---

## Verificar Swagger

Accede a: **http://localhost:3000/api/docs**

Deberías ver:
- ✅ 19 endpoints en total (en lugar de 33)
- ✅ Query parameters bien documentados
- ✅ Ejemplos de uso actualizados
- ✅ Todos los tags organizados

---

## Respuestas Esperadas

### Formato de éxito
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* ... */ }
}
```

### Formato de error
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE",
  "details": ["Additional info"]
}
```

---

## Notas

- Todos los endpoints requieren autenticación JWT (excepto auth/login)
- Los query parameters son **case-sensitive**
- Las fechas deben estar en formato **YYYY-MM-DD**
- Los horarios en formato **HH:mm**
