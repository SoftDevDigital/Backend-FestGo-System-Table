import { Controller, Get, Post, Body, Query, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth, ApiCreatedResponse, ApiBody, ApiParam, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { FinancialMovementsService } from './financial-movements.service';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AdminOrEmployee } from '../../common/decorators/admin-employee.decorator';
import { MovementType } from '../../common/enums';
import { SuccessResponse } from '../../common/dto/response.dto';
import { FinancialMovement } from '../../common/entities/financial.entity';

@ApiTags('financial-movements')
@Controller('financial-movements')
export class FinancialMovementsController {
  constructor(private readonly financialMovementsService: FinancialMovementsService) {}

  @Post()
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '💰 Registrar movimiento financiero 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    **📚 FLUJO: Reportes y Administración - Registrar Gastos**
    
    Registra un movimiento financiero (gasto, pago a proveedor, salario, etc.).
    ABSOLUTAMENTE TODO movimiento de dinero debe registrarse aquí.
    
    **Flujo completo de administración:**
    1. ➡️ Ver reportes: GET /reports/sales
    2. ➡️ Registrar gastos (este endpoint)
    3. ➡️ Ver movimientos: GET /financial-movements
    4. ➡️ Ver resumen: GET /financial-movements/summary
    
    **Tipos de movimientos:**
    - INVENTORY_PURCHASE: Compras a proveedores
    - SALARY_PAYMENT: Pagos de salarios
    - UTILITY_PAYMENT: Pagos de servicios
    - TAX_PAYMENT: Pagos de impuestos
    - EXPENSE: Gastos generales
    - CASH_WITHDRAWAL: Retiros de efectivo
    - CASH_DEPOSIT: Depósitos de efectivo
    
    **Nota:** Las ventas (SALE) se registran automáticamente al crear facturas.`
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'amount', 'description'],
      properties: {
        type: { type: 'string', enum: Object.values(MovementType), description: 'Tipo de movimiento' },
        amount: { type: 'number', description: 'Monto del movimiento' },
        description: { type: 'string', description: 'Descripción del movimiento' },
        category: { type: 'string', description: 'Categoría' },
        subcategory: { type: 'string', description: 'Subcategoría' },
        supplierId: { type: 'string', description: 'ID del proveedor (si aplica)' },
        employeeId: { type: 'string', description: 'ID del empleado (si aplica)' },
        paymentMethod: { type: 'string', description: 'Método de pago' },
        receiptUrl: { type: 'string', description: 'URL del recibo' },
        approvedBy: { type: 'string', description: 'ID del aprobador' },
        notes: { type: 'string', description: 'Notas adicionales' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas' },
      }
    }
  })
  @ApiCreatedResponse({ 
    description: '✅ Movimiento financiero registrado exitosamente'
  })
  @ApiBadRequestResponse({ description: '❌ Error de validación' })
  async create(@Body() createMovementDto: any): Promise<SuccessResponse<FinancialMovement>> {
    try {
      const movement = await this.financialMovementsService.create(createMovementDto);
      return { success: true, message: 'Movimiento financiero registrado exitosamente', data: movement };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al registrar el movimiento financiero.');
    }
  }

  @Get()
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '💰 Obtener todos los movimientos financieros 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Obtiene todos los movimientos financieros registrados. ABSOLUTAMENTE TODO movimiento de dinero está aquí.`
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha de inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha de fin (YYYY-MM-DD)' })
  @ApiQuery({ name: 'type', required: false, enum: MovementType, description: 'Filtrar por tipo' })
  @ApiOkResponse({ 
    description: '✅ Movimientos financieros obtenidos exitosamente'
  })
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: MovementType
  ) {
    const movements = await this.financialMovementsService.findAll(startDate, endDate, type);
    return { success: true, message: 'Movimientos financieros obtenidos exitosamente', data: movements };
  }

  @Get('summary')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '📊 Resumen financiero completo 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador
    
    Obtiene el resumen financiero completo con todos los ingresos y gastos.
    No se escapa ni un centavo sin registro.`
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha de inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha de fin (YYYY-MM-DD)' })
  @ApiOkResponse({ 
    description: '✅ Resumen financiero obtenido exitosamente'
  })
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const summary = await this.financialMovementsService.getFinancialSummary(startDate, endDate);
    return { success: true, message: 'Resumen financiero obtenido exitosamente', data: summary };
  }

  @Get(':id')
  @AdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '💰 Obtener movimiento financiero por ID 👑',
    description: `**👑 SOLO ADMIN - Autenticación JWT requerida**
    **👥 Roles permitidos:** Solo Administrador`
  })
  @ApiParam({ name: 'id', description: 'ID del movimiento financiero' })
  @ApiOkResponse({ 
    description: '✅ Movimiento financiero obtenido exitosamente'
  })
  @ApiNotFoundResponse({ description: '❌ Movimiento financiero no encontrado' })
  async findOne(@Param('id') id: string): Promise<SuccessResponse<FinancialMovement>> {
    const movement = await this.financialMovementsService.findOne(id);
    return { success: true, message: 'Movimiento financiero obtenido exitosamente', data: movement };
  }
}

