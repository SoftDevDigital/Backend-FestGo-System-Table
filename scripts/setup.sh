#!/bin/bash

# Grove System Setup Script
echo "🍽️ Configurando Grove System..."

# Verificar prerrequisitos
echo "Verificando prerrequisitos..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Instale Node.js 18+ antes de continuar."
    exit 1
fi

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI no está instalado. Instale AWS CLI antes de continuar."
    exit 1
fi

# Verificar Terraform
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform no está instalado. Instale Terraform antes de continuar."
    exit 1
fi

echo "✅ Prerrequisitos verificados"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Configurar variables de entorno
if [ ! -f .env ]; then
    echo "📝 Configurando variables de entorno..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edite el archivo .env con sus configuraciones"
fi

# Inicializar Terraform
echo "🏗️ Inicializando infraestructura..."
cd infrastructure
terraform init

echo "✅ Configuración inicial completada"
echo ""
echo "🚀 Pasos siguientes:"
echo "1. Editar archivo .env con sus configuraciones"
echo "2. Configurar AWS CLI: aws configure"
echo "3. Aplicar infraestructura: npm run terraform:apply"
echo "4. Iniciar desarrollo: npm run start:dev"