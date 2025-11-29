# 🔐 Credenciales AWS Requeridas para Grove System Table

## 📋 CHECKLIST DE CREDENCIALES NECESARIAS

Para que el sistema funcione completamente, necesito que me proporciones las siguientes credenciales de AWS:

---

## 1️⃣ **CREDENCIALES IAM PRINCIPALES** ⚠️ CRÍTICO

### **AWS Access Keys:**
```
AWS_ACCESS_KEY_ID=AKIA****************
AWS_SECRET_ACCESS_KEY=****************************************
AWS_REGION=us-east-1  (o tu región preferida)
```

### **¿Cómo obtenerlas?**
1. Ir a **AWS Console** → **IAM**
2. Crear un nuevo usuario: `grove-system-backend`
3. Tipo de acceso: **Programmatic access**
4. Guardar las credenciales (solo se muestran una vez)

### **Permisos requeridos para el usuario IAM:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "s3:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**📌 Políticas AWS a adjuntar:**
- ✅ `AmazonDynamoDBFullAccess`
- ✅ `AmazonS3FullAccess`
- ✅ `CloudWatchLogsFullAccess`

---

## 2️⃣ **CONFIGURACIÓN DE DYNAMODB** ⚠️ CRÍTICO

El sistema necesita las siguientes **8 tablas** en DynamoDB:

### **Tablas requeridas:**
```
grove_system_users
grove_system_tables
grove_system_products
grove_system_orders
grove_system_bills
grove_system_inventory_items
grove_system_suppliers
grove_system_stock_movements
grove_system_reservations
grove_system_customers
grove_system_waitlist
```

### **¿Qué necesito saber?**
- ✅ **Región de DynamoDB**: ¿Dónde quieres crear las tablas? (recomendado: `us-east-1`)
- ✅ **Prefijo de tablas**: Por defecto `grove_system_` (configurable)
- ✅ **Modo de facturación**: On-Demand o Provisioned?

### **Opción 1: Crear tablas con Terraform (RECOMENDADO)**
```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

### **Opción 2: Crear manualmente**
Puedo proporcionarte los scripts de creación para cada tabla.

---

## 3️⃣ **CONFIGURACIÓN DE S3** ⚠️ IMPORTANTE

### **Bucket necesario:**
```
Nombre del bucket: grove-system-storage-[tu-nombre-unico]
Región: us-east-1 (debe coincidir con DynamoDB)
```

### **Configuración del bucket:**
- ✅ **Versionado**: Habilitado
- ✅ **Cifrado**: AES-256 (SSE-S3)
- ✅ **Acceso público**: Bloqueado
- ✅ **CORS**: Configurado para el frontend

### **Estructura de carpetas en S3:**
```
grove-system-storage/
├── receipts/         # Tickets y facturas PDF
├── menus/           # Imágenes de menú
├── products/        # Fotos de productos
├── reports/         # Reportes generados
└── backups/         # Backups del sistema
```

### **¿Qué necesito?**
```
S3_BUCKET_NAME=grove-system-storage-produccion
S3_REGION=us-east-1
```

---

## 4️⃣ **CONFIGURACIÓN ADICIONAL** ℹ️ OPCIONAL

### **JWT Secret (Seguridad):**
```
JWT_SECRET=TU_CLAVE_SUPER_SECRETA_AQUI_MIN_32_CARACTERES
JWT_EXPIRES_IN=24h
```
📌 **Genera una clave segura**: `openssl rand -base64 32`

### **Variables de entorno del sistema:**
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://tu-frontend.com
```

---

## 📊 **RESUMEN DE COSTOS ESTIMADOS AWS**

### **Estimación mensual para restaurante mediano:**

| Servicio | Uso estimado | Costo mensual |
|----------|--------------|---------------|
| **DynamoDB** | 1M reads, 500K writes | ~$1.25 |
| **S3** | 10GB storage, 50K requests | ~$0.50 |
| **CloudWatch** | Logs básicos | ~$0.50 |
| **Data Transfer** | 5GB salida | ~$0.45 |
| **TOTAL** | | **~$2.70/mes** |

💡 **Tier gratuito**: AWS Free Tier cubre los primeros 12 meses con límites generosos.

---

## 🚀 **PROCESO DE CONFIGURACIÓN PASO A PASO**

### **Paso 1: Crear usuario IAM**
```bash
# En AWS Console:
1. IAM → Users → Add User
2. Nombre: grove-system-backend
3. Access type: Programmatic access
4. Attach policies: DynamoDB, S3, CloudWatch
5. Descargar credenciales CSV
```

### **Paso 2: Crear bucket S3**
```bash
# Usando AWS CLI (opcional):
aws s3api create-bucket \
  --bucket grove-system-storage-prod \
  --region us-east-1

aws s3api put-bucket-encryption \
  --bucket grove-system-storage-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### **Paso 3: Desplegar infraestructura DynamoDB**
```bash
# Opción A: Usando Terraform (recomendado)
cd infrastructure
terraform init
terraform apply

# Opción B: Script de creación manual
npm run setup:database
```

### **Paso 4: Configurar variables de entorno**
```bash
# Copiar template y completar
cp .env.example .env

# Editar .env con tus credenciales
nano .env
```

### **Paso 5: Verificar conexión**
```bash
# El sistema verificará automáticamente las conexiones al iniciar
npm run start:dev

# Deberías ver:
✅ Connected to DynamoDB
✅ S3 bucket accessible
✅ All tables verified
```

---

## ✅ **CHECKLIST FINAL ANTES DE ARRANCAR**

Marca lo que ya tienes configurado:

- [ ] **Usuario IAM creado** con permisos de DynamoDB, S3 y CloudWatch
- [ ] **Access Key ID y Secret Key** guardados de forma segura
- [ ] **Región de AWS seleccionada** (ej: us-east-1)
- [ ] **Bucket S3 creado** con cifrado habilitado
- [ ] **Tablas DynamoDB creadas** (11 tablas)
- [ ] **JWT Secret generado** (mínimo 32 caracteres)
- [ ] **Archivo .env configurado** con todas las variables
- [ ] **Terraform instalado** (si usarás IaC)
- [ ] **AWS CLI instalado** (opcional pero recomendado)

---

## 🔍 **¿QUÉ NECESITO DE TI AHORA?**

### **OPCIÓN A - Tienes cuenta AWS configurada:**
Dame:
1. ✅ **AWS_ACCESS_KEY_ID**
2. ✅ **AWS_SECRET_ACCESS_KEY**
3. ✅ **AWS_REGION**
4. ✅ **S3_BUCKET_NAME** (nombre único que quieras usar)

### **OPCIÓN B - No tienes nada configurado aún:**
Puedo ayudarte a:
1. Guiarte paso a paso para crear la cuenta AWS
2. Configurar las credenciales necesarias
3. Crear scripts de inicialización automática
4. Usar DynamoDB Local para desarrollo sin AWS

### **OPCIÓN C - Desarrollo local (sin AWS):**
Puedo configurar:
- **DynamoDB Local** (corre en tu máquina)
- **MinIO** (S3 local)
- **LocalStack** (simula todos los servicios AWS)

---

## 💡 **RECOMENDACIONES DE SEGURIDAD**

### **⚠️ NUNCA:**
- Subir credenciales a GitHub
- Compartir Access Keys en mensajes no cifrados
- Usar las mismas credenciales para desarrollo y producción
- Dejar buckets S3 públicos

### **✅ SIEMPRE:**
- Usar variables de entorno (.env)
- Rotar credenciales cada 90 días
- Habilitar MFA en cuenta AWS
- Usar diferentes usuarios IAM por ambiente
- Configurar alertas de facturación

---

## 📞 **¿Cómo quieres proceder?**

**Opción 1:** Ya tienes AWS → Dame las credenciales y arrancamos
**Opción 2:** Necesitas ayuda con AWS → Te guío paso a paso
**Opción 3:** Quieres probar local primero → Configuro ambiente local

¿Qué opción prefieres?