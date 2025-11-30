# 🍽️ Grove System Table - Sistema de Gestión para Restaurantes

Un sistema completo de gestión para restaurantes que utiliza AWS, NestJS, Terraform y tecnologías modernas para proporcionar una solución robusta y escalable.

## 🚀 Características Principales

- **Gestión de Mesas**: Control completo de mesas, estados y asignaciones
- **Gestión de Pedidos**: Creación, modificación y seguimiento de pedidos
- **Facturación**: Generación automática de facturas y tickets térmicos
- **Panel de Administración**: Control total de movimientos, dinero y operaciones
- **Inventario**: Gestión de productos, stock y precios
- **Reportes**: Análisis de ventas, movimientos y estadísticas
- **Usuarios y Roles**: Sistema de autenticación y autorización

## 🏗️ Arquitectura

### Backend
- **Framework**: NestJS con TypeScript
- **Base de datos**: AWS DynamoDB
- **Almacenamiento**: AWS S3
- **Autenticación**: JWT con Passport
- **Autorización**: Guards basados en roles (admin, employee, customer)

### AWS Services
- **API Gateway**: Endpoint management
- **Lambda**: Serverless functions
- **DynamoDB**: NoSQL database
- **S3**: File storage
- **CloudWatch**: Monitoring y logs
- **IAM**: Identity and Access Management

### Infraestructura
- **IaC**: Terraform para gestión de recursos
- **CI/CD**: GitHub Actions
- **Monitoring**: CloudWatch y métricas personalizadas

## 📁 Estructura del Proyecto

```
├── src/                    # Código fuente NestJS
│   ├── modules/           # Módulos de la aplicación
│   ├── common/            # Utilidades comunes
│   ├── database/          # Configuración de base de datos
│   └── config/            # Configuraciones
├── infrastructure/        # Archivos Terraform
├── docs/                  # Documentación
├── scripts/              # Scripts de utilidad
└── test/                 # Tests
```

## ⚙️ Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- AWS CLI configurado
- Terraform 1.5+
- Docker (opcional)

### Instalación
```bash
# Clonar repositorio (si aplica)
git clone <repository-url>
cd Backend-Grove-System-Table

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Inicializar infraestructura (opcional)
npm run terraform:init
npm run terraform:plan
npm run terraform:apply
```

### Desarrollo
```bash
# Modo desarrollo (ya ejecutándose)
npm run start:dev

# Construir aplicación
npm run build

# Tests
npm run test
npm run test:watch
npm run test:cov

# Linting y formato
npm run lint
npm run format
```

## 🎯 Estado Actual

✅ **Completado:**
- Estructura base del proyecto NestJS
- Configuración de TypeScript y dependencias
- Módulos básicos (Auth, Tables, Products, Orders, Bills, Admin, Reports, Printer, S3)
- Configuración de Swagger/OpenAPI
- **🆕 API simplificada con query parameters (42% menos endpoints)**
- **🆕 Documentación completa del sistema (SYSTEM_FLOW_GUIDE.md)**
- **🆕 Guía de configuración AWS (AWS_CREDENTIALS_SETUP.md)**
- **🆕 Sistema de autenticación y autorización completo**
  - Guards JWT globales
  - Autorización por roles (admin, employee, customer)
  - Decoradores simplificados (@Public, @AdminOnly, @AdminOrEmployee)
- **🆕 Integración real con AWS DynamoDB y S3**
- Infraestructura Terraform para AWS
- Compilación exitosa
- Servidor de desarrollo ejecutándose

🚧 **Pendiente:**
- Implementación completa de la lógica de negocio
- Lógica de impresión térmica
- Tests unitarios y de integración

## 🔧 Scripts Disponibles

- `npm run build` - Construir la aplicación
- `npm run start` - Iniciar en modo producción
- `npm run start:dev` - Iniciar en modo desarrollo
- `npm run test` - Ejecutar tests
- `npm run terraform:*` - Comandos de Terraform

## 📊 API Documentation

La documentación de la API está disponible en `/api/docs` cuando la aplicación está ejecutándose.

### 🔄 API Simplificada (Noviembre 2025)

**¡Nueva estructura RESTful mejorada!**

Hemos simplificado la API de **33 a 19 endpoints** (reducción del 42%) usando query parameters, manteniendo el 100% de funcionalidad:

- **Reservations**: 12 → 7 endpoints (-42%)
- **Customers**: 13 → 7 endpoints (-46%)
- **Waitlist**: 8 → 5 endpoints (-37%)

**Ejemplos:**
```bash
# Antes: GET /reservations/today
# Ahora: GET /reservations?filter=today

# Antes: PATCH /reservations/:id/confirm
# Ahora: PATCH /reservations/:id/status?action=confirm

# Antes: GET /customers/vip
# Ahora: GET /customers?filter=vip
```

📖 **Documentación completa:** Ver [API_ROUTES_MIGRATION.md](./docs/API_ROUTES_MIGRATION.md)

## 📚 Documentación

### Para Desarrolladores Frontend ⭐
- **[Autenticación y Autorización](./docs/AUTHENTICATION_AND_AUTHORIZATION.md)** - Guía completa de autenticación JWT, roles y permisos
- **[Tabla de Endpoints y Permisos](./docs/ENDPOINTS_PERMISSIONS_TABLE.md)** - Referencia rápida de todos los endpoints y sus restricciones

### Para Desarrolladores Backend
- [API Documentation](./docs/API.md) - Documentación completa de endpoints
- [System Flow Guide](./docs/SYSTEM_FLOW_GUIDE.md) - Guía de flujos del sistema
- [API Routes Migration](./docs/API_ROUTES_MIGRATION.md) - Migración de rutas simplificadas
- [AWS Credentials Setup](./docs/AWS_CREDENTIALS_SETUP.md) - Configuración de AWS

## 🔐 Autenticación y Autorización

El sistema utiliza **JWT (JSON Web Tokens)** para autenticación y **guards basados en roles** para autorización.

### Roles Disponibles:
- **ADMIN** (`admin`): Acceso completo al sistema
- **EMPLOYEE** (`employee`): Acceso operativo (gestión de reservas, clientes, inventario lectura)
- **CUSTOMER** (`customer`): Acceso limitado (crear reservas, ver menú)

### Características:
- ✅ Protección global de endpoints (excepto los marcados como `@Public()`)
- ✅ Decoradores simplificados: `@Public()`, `@AdminOnly()`, `@AdminOrEmployee()`
- ✅ Manejo automático de errores 401 (no autenticado) y 403 (sin permisos)
- ✅ Token JWT en header: `Authorization: Bearer <token>`

📖 **Ver documentación completa**: [Autenticación y Autorización](./docs/AUTHENTICATION_AND_AUTHORIZATION.md)

## 🔐 Variables de Entorno

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Application
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret

# Database
DYNAMODB_TABLES_PREFIX=grove_system_
```

## 📝 Licencia

Este proyecto está bajo la licencia MIT.