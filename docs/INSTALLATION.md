# Guía de Instalación y Configuración

## Prerrequisitos

### Software Requerido
- **Node.js** 18.0 o superior
- **npm** 8.0 o superior
- **AWS CLI** 2.0 o superior
- **Terraform** 1.5 o superior
- **Git** 2.0 o superior

### Cuentas y Servicios
- Cuenta de AWS activa
- AWS CLI configurado con credenciales apropiadas
- Terraform instalado y configurado

## Instalación

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd Backend-Grove-System-Table
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar variables de entorno
# Configurar:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - AWS_REGION
# - JWT_SECRET
# - Otros según sea necesario
```

### 4. Configurar AWS CLI
```bash
aws configure
```

### 5. Inicializar Infraestructura con Terraform
```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

### 6. Ejecutar la Aplicación
```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## Configuración Avanzada

### Variables de Entorno Importantes
- `AWS_REGION`: Región de AWS (default: us-east-1)
- `DYNAMODB_TABLES_PREFIX`: Prefijo para tablas DynamoDB
- `S3_BUCKET_NAME`: Nombre del bucket S3
- `JWT_SECRET`: Clave secreta para JWT
- `THERMAL_PRINTER_IP`: IP de la impresora térmica

### Comandos de Terraform
```bash
# Inicializar
npm run terraform:init

# Planificar cambios
npm run terraform:plan

# Aplicar cambios
npm run terraform:apply

# Destruir infraestructura
npm run terraform:destroy
```

## Verificación de la Instalación

### 1. Verificar API
```bash
curl http://localhost:3000/api/v1/health
```

### 2. Verificar Documentación
Navegar a: http://localhost:3000/api/docs

### 3. Verificar Base de Datos
Verificar que las tablas de DynamoDB se hayan creado correctamente en la consola de AWS.

## Troubleshooting

### Problemas Comunes
1. **Error de credenciales AWS**: Verificar configuración de AWS CLI
2. **Error de Terraform**: Verificar permisos IAM
3. **Puerto en uso**: Cambiar puerto en .env
4. **Dependencias faltantes**: Ejecutar `npm install` nuevamente