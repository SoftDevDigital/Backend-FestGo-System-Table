# 📚 Documentación API - Grove System Table

## Resumen de documentación Swagger completada

### 🎯 Estado actual de la documentación

✅ **Completado:**
- **Main.ts**: Configuración completa de Swagger con autenticación JWT, servidores múltiples y tags organizados
- **Reservas Controller**: Documentación completa de todos los endpoints con ejemplos detallados
- **Customers Controller**: Documentación parcial con endpoints principales
- **Waitlist Controller**: Documentación parcial con endpoints clave

### 🔧 Configuración Principal (main.ts)

**Características implementadas:**
- 🔐 **Autenticación JWT**: Bearer token configurado
- 🌐 **Múltiples servidores**: Desarrollo y producción
- 🏷️ **Tags organizados**: Todos los módulos categorizados
- 📖 **Documentación detallada**: Descripción completa del sistema

**Acceso a documentación:**
- **Desarrollo**: `http://localhost:3000/api-docs`
- **Producción**: `https://api.grove-system.com/api-docs`

### 📋 Reservations API (/reservations)

#### Endpoints documentados con ejemplos completos:

**🔹 POST /reservations** - Crear reserva
- ✅ Ejemplos: Cena romántica, Grupo corporativo
- ✅ Validaciones completas
- ✅ Respuestas de error detalladas
- ✅ Códigos de confirmación automáticos

**🔹 GET /reservations** - Listar reservas
- ✅ Filtros avanzados (fecha, estado, cliente, mesa)
- ✅ Paginación con metadatos
- ✅ Ordenamiento personalizable
- ✅ 7 parámetros de consulta documentados

**🔹 GET /reservations/today** - Reservas del día
- ✅ Optimizado para dashboard
- ✅ Información de tiempo restante
- ✅ Estados en tiempo real

**🔹 GET /reservations/upcoming** - Próximas reservas
- ✅ Ventana de tiempo configurable
- ✅ Alertas tempranas
- ✅ Priorización automática

**🔹 GET /reservations/availability** - Verificar disponibilidad
- ✅ Consulta en tiempo real
- ✅ Validación de horarios
- ✅ Sugerencias alternativas

**🔹 GET /reservations/available-slots** - Horarios disponibles
- ✅ Generación inteligente
- ✅ Filtro por área
- ✅ Scores de recomendación

**🔹 GET /reservations/:id** - Detalle de reserva
- ✅ Información completa
- ✅ Datos del cliente incluidos
- ✅ Códigos de confirmación

**🔹 PATCH /reservations/:id/confirm** - Confirmar reserva
- ✅ Transición de estados
- ✅ Notificaciones automáticas
- ✅ Timestamp de confirmación

**🔹 PATCH /reservations/:id/seat** - Sentar clientes
- ✅ Asignación de mesa
- ✅ Control de tiempos
- ✅ Métricas de puntualidad

**🔹 PATCH /reservations/:id/cancel** - Cancelar reserva
- ✅ Registro de motivos
- ✅ Liberación automática
- ✅ Gestión de reembolsos

### 👥 Customers API (/customers)

#### Endpoints documentados:

**🔹 POST /customers** - Crear cliente
- ✅ Ejemplos: Cliente regular, Cliente empresarial
- ✅ Validación de duplicados
- ✅ Configuración de preferencias

**🔹 GET /customers/search** - Búsqueda inteligente
- ✅ Múltiples campos de búsqueda
- ✅ Coincidencias fuzzy
- ✅ Scores de relevancia

**🔹 GET /customers/top** - Mejores clientes
- ✅ Ranking por gasto
- ✅ Métricas de frecuencia
- ✅ Análisis de valor

**🔹 GET /customers/vip** - Clientes VIP
- ✅ Información de tier VIP
- ✅ Fechas de promoción
- ✅ Preferencias especiales

**🔹 GET /customers/:id/reservations** - Historial
- ✅ Cronología completa
- ✅ Patrones de comportamiento
- ✅ Análisis de gastos

**🔹 PATCH /customers/:id/vip/promote** - Promover a VIP
- ✅ Activación de beneficios
- ✅ Notificaciones automáticas
- ✅ Registro de fechas

### ⏳ Waitlist API (/waitlist)

#### Endpoints documentados:

**🔹 POST /waitlist** - Agregar a lista de espera
- ✅ Ejemplos: Espera inmediata, Cliente VIP
- ✅ Sistema de prioridades
- ✅ Tiempos estimados

**🔹 GET /waitlist/:date** - Lista por fecha
- ✅ Ordenamiento por prioridad
- ✅ Estados de contacto
- ✅ Posiciones en cola

**🔹 PATCH /waitlist/:id/convert** - Convertir a reserva
- ✅ Proceso automático completo
- ✅ Notificaciones al cliente
- ✅ Actualización de métricas

## 🔄 Próximos pasos para completar documentación

### 📝 Pendientes por documentar:

1. **Inventory API** - Sistema de inventario completo
2. **Suppliers API** - Gestión de proveedores
3. **Tables API** - Administración de mesas
4. **Products API** - Catálogo de productos
5. **Orders API** - Gestión de pedidos
6. **Bills API** - Facturación y pagos
7. **Auth API** - Autenticación y autorización
8. **Admin API** - Panel administrativo

### 🎨 Características de la documentación

**✅ Ya implementado:**
- 📝 Descripciones detalladas en español
- 🌟 Ejemplos realistas y completos
- 🔍 Códigos de error específicos
- 📊 Esquemas de respuesta detallados
- 🔐 Configuración de seguridad JWT
- 🏷️ Organización por tags
- 📱 Casos de uso explicados

**🎯 Estándares mantenidos:**
- Emojis para mejor UX visual
- Ejemplos con datos realistas
- Respuestas de error específicas
- Documentación en español
- Casos de uso claros
- Códigos de estado HTTP apropiados

## 👩‍💻 Para el equipo Frontend

### 🔑 Información clave:

1. **Base URL**: `http://localhost:3000` (desarrollo)
2. **Documentación**: `/api-docs`
3. **Autenticación**: Bearer JWT en header `Authorization`
4. **Respuestas**: Formato estándar con `success`, `message`, `data`
5. **Paginación**: Metadatos incluidos en respuestas de listas
6. **Códigos de confirmación**: Formato `GRV + 4 caracteres`

### 📋 Flujos principales documentados:

1. **Crear reserva** → Verificar disponibilidad → Crear → Confirmar
2. **Gestión clientes** → Buscar → Ver historial → Promover VIP
3. **Lista de espera** → Agregar → Monitorear → Convertir a reserva

### 🛠️ Herramientas recomendadas:

- **Postman**: Importar esquemas desde `/api-docs-json`
- **OpenAPI Generator**: Generar cliente TypeScript automáticamente
- **Swagger UI**: Pruebas interactivas en desarrollo

¡La documentación está diseñada para facilitar la integración frontend con ejemplos prácticos y respuestas completas! 🚀