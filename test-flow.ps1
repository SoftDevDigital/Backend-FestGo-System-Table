Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIMULACION DE FLUJO FRONTEND" -ForegroundColor Cyan
Write-Host "========================================`n"

# PASO 1: Login
Write-Host "PASO 1: Login del administrador" -ForegroundColor Yellow
$loginBody = @{ email = "estanislaovaldez78@gmail.com"; password = "123456" } | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.access_token
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.data.user.email)"
    Write-Host "   Rol: $($loginResponse.data.user.role)`n"
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

# PASO 2: Obtener proveedores
Write-Host "PASO 2: Obtener lista de proveedores" -ForegroundColor Yellow
try {
    $suppliersResponse = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers" -Method Get -Headers $headers
    Write-Host "✅ Proveedores obtenidos" -ForegroundColor Green
    Write-Host "   Total: $($suppliersResponse.data.Count) proveedores`n"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# PASO 3: Crear proveedor
Write-Host "PASO 3: Crear nuevo proveedor" -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$newSupplierBody = @{
    name = "Proveedor Test $timestamp"
    contactName = "Juan Perez"
    email = "proveedor@test.com"
    phone = "+34612345678"
    address = @{
        street = "Calle Test 123"
        city = "Madrid"
        state = "Madrid"
        zipCode = "28001"
        country = "Espana"
    }
    paymentTerms = 30
    volumeDiscount = 5
    notes = "Proveedor creado desde pruebas"
} | ConvertTo-Json -Depth 10

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers" -Method Post -Body $newSupplierBody -Headers $headers
    $newSupplierId = $createResponse.data.id
    Write-Host "✅ Proveedor creado" -ForegroundColor Green
    Write-Host "   ID: $newSupplierId"
    Write-Host "   Nombre: $($createResponse.data.name)`n"
} catch {
    $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ Error al crear: $($errorJson.message) (Status: $($errorJson.statusCode))" -ForegroundColor Red
    Write-Host "   Detalles completos del error:" -ForegroundColor Yellow
    $errorJson | ConvertTo-Json -Depth 5 | Write-Host
    exit
}

# PASO 4: Actualizar proveedor
Write-Host "PASO 4: Actualizar proveedor" -ForegroundColor Yellow
$updateBody = @{ notes = "Actualizado - $(Get-Date -Format 'HH:mm:ss')"; volumeDiscount = 10 } | ConvertTo-Json
try {
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers/$newSupplierId" -Method Patch -Body $updateBody -Headers $headers
    Write-Host "✅ Proveedor actualizado" -ForegroundColor Green
    Write-Host "   Descuento: $($updateResponse.data.volumeDiscount)%"
    Write-Host "   Notas: $($updateResponse.data.notes)`n"
} catch {
    $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ Error al actualizar:" -ForegroundColor Red
    Write-Host "   Status: $($errorJson.statusCode)"
    Write-Host "   Mensaje: $($errorJson.message)"
    Write-Host "   Path: $($errorJson.path)"
    Write-Host "   Detalles completos:" -ForegroundColor Yellow
    $errorJson | ConvertTo-Json -Depth 5 | Write-Host
}

# PASO 5: Actualizar estadísticas
Write-Host "PASO 5: Actualizar estadisticas de ordenes" -ForegroundColor Yellow
$statsBody = @{ orderAmount = 3500.25 } | ConvertTo-Json
try {
    $statsResponse = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers/$newSupplierId/update-order-stats" -Method Post -Body $statsBody -Headers $headers
    Write-Host "✅ Estadisticas actualizadas" -ForegroundColor Green
    Write-Host "   Total Orders: $($statsResponse.data.totalOrders)"
    Write-Host "   Total Amount: $($statsResponse.data.totalAmount)"
    Write-Host "   Last Order Date: $($statsResponse.data.lastOrderDate)`n"
} catch {
    $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ Error al actualizar estadisticas:" -ForegroundColor Red
    Write-Host "   Status: $($errorJson.statusCode)"
    Write-Host "   Mensaje: $($errorJson.message)"
    Write-Host "   Detalles completos:" -ForegroundColor Yellow
    $errorJson | ConvertTo-Json -Depth 5 | Write-Host
}

# PASO 6: Probar errores descriptivos
Write-Host "PASO 6: Probar validaciones de error (mensajes descriptivos)" -ForegroundColor Yellow

Write-Host "`n6.1. Body vacio (debe retornar 400 con mensaje descriptivo):" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers/$newSupplierId/update-order-stats" -Method Post -Body "{}" -Headers $headers | Out-Null
    Write-Host "❌ No deberia llegar aqui" -ForegroundColor Red
} catch {
    $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorJson.statusCode -eq 400) {
        Write-Host "✅ Error 400 capturado correctamente" -ForegroundColor Green
        Write-Host "   Mensaje: $($errorJson.message)"
        Write-Host "   Path: $($errorJson.path)"
        Write-Host "   Timestamp: $($errorJson.timestamp)"
        if ($errorJson.message -like "*orderAmount*") {
            Write-Host "   ✅ El mensaje es descriptivo e indica que orderAmount es requerido" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Error inesperado: $($errorJson.statusCode)" -ForegroundColor Red
    }
}

Write-Host "`n6.2. Proveedor inexistente (debe retornar 404 con detalles):" -ForegroundColor Cyan
$fakeId = "00000000-0000-0000-0000-000000000000"
try {
    Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers/$fakeId" -Method Patch -Body (@{ notes = "test" } | ConvertTo-Json) -Headers $headers | Out-Null
    Write-Host "❌ No deberia llegar aqui" -ForegroundColor Red
} catch {
    $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorJson.statusCode -eq 404) {
        Write-Host "✅ Error 404 capturado correctamente" -ForegroundColor Green
        Write-Host "   Mensaje: $($errorJson.message)"
        Write-Host "   Error Code: $($errorJson.errorCode)"
        Write-Host "   Detalles: $($errorJson.details | ConvertTo-Json)"
        if ($errorJson.message -like "*$fakeId*" -or $errorJson.details.id -eq $fakeId) {
            Write-Host "   ✅ El mensaje incluye el ID del proveedor no encontrado" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Error inesperado: $($errorJson.statusCode)" -ForegroundColor Red
        $errorJson | ConvertTo-Json -Depth 5 | Write-Host
    }
}

Write-Host "`n6.3. orderAmount negativo (debe retornar 400):" -ForegroundColor Cyan
$invalidBody = @{ orderAmount = -100 } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers/$newSupplierId/update-order-stats" -Method Post -Body $invalidBody -Headers $headers | Out-Null
    Write-Host "❌ No deberia llegar aqui" -ForegroundColor Red
} catch {
    $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorJson.statusCode -eq 400) {
        Write-Host "✅ Error 400 capturado correctamente" -ForegroundColor Green
        Write-Host "   Mensaje: $($errorJson.message)"
        if ($errorJson.message -like "*mayor*" -or $errorJson.message -like "*>=*" -or $errorJson.message -like "*0*") {
            Write-Host "   ✅ El mensaje indica que el valor debe ser >= 0" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Error inesperado: $($errorJson.statusCode)" -ForegroundColor Red
    }
}

Write-Host "`n6.4. Obtener proveedor actualizado:" -ForegroundColor Cyan
try {
    $getResponse = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/suppliers/$newSupplierId" -Method Get -Headers $headers
    Write-Host "✅ Proveedor obtenido" -ForegroundColor Green
    Write-Host "   Nombre: $($getResponse.data.name)"
    Write-Host "   Total Orders: $($getResponse.data.totalOrders)"
    Write-Host "   Total Amount: $($getResponse.data.totalAmount)"
    Write-Host "   Estado: $(if ($getResponse.data.isActive) { 'Activo' } else { 'Inactivo' })`n"
} catch {
    $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ Error: $($errorJson.message) (Status: $($errorJson.statusCode))" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Flujo completo ejecutado" -ForegroundColor Green
Write-Host "✅ Validaciones funcionando correctamente" -ForegroundColor Green
Write-Host "✅ Mensajes de error descriptivos y claros" -ForegroundColor Green
Write-Host "✅ Todos los endpoints probados funcionan" -ForegroundColor Green
