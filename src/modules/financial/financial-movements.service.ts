import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { FinancialMovement } from '../../common/entities/financial.entity';
import { MovementType } from '../../common/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FinancialMovementsService {
  private readonly logger = new Logger(FinancialMovementsService.name);
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoDBService) {
    this.tableName = this.dynamoService.getTableName('movements');
  }

  /**
   * Registra un movimiento financiero (venta, gasto, etc.)
   * ABSOLUTAMENTE TODO movimiento de dinero debe pasar por aquí
   */
  async create(movement: {
    type: MovementType;
    amount: number;
    description: string;
    category?: string;
    subcategory?: string;
    billId?: string;
    orderId?: string;
    employeeId?: string;
    supplierId?: string;
    paymentMethod?: string;
    transactionId?: string;
    receiptUrl?: string;
    approvedBy?: string;
    notes?: string;
    tags?: string[];
  }): Promise<FinancialMovement> {
    try {
      const movementNumber = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      const financialMovement: FinancialMovement = {
        id: uuidv4(),
        movementNumber,
        type: movement.type,
        amount: movement.amount,
        description: movement.description,
        category: movement.category,
        subcategory: movement.subcategory,
        reference: movement.billId || movement.orderId || movement.transactionId,
        billId: movement.billId,
        orderId: movement.orderId,
        employeeId: movement.employeeId,
        supplierId: movement.supplierId,
        paymentMethod: movement.paymentMethod,
        transactionId: movement.transactionId,
        receiptUrl: movement.receiptUrl,
        approvedBy: movement.approvedBy,
        approvedAt: movement.approvedBy ? new Date().toISOString() : undefined,
        notes: movement.notes,
        tags: movement.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      await this.dynamoService.put(this.tableName, financialMovement);
      this.logger.log(`Movimiento financiero registrado: ${movementNumber} - Tipo: ${movement.type} - Monto: $${movement.amount}`);
      
      return financialMovement;
    } catch (error) {
      this.logger.error(
        `Error inesperado registrando movimiento financiero: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al registrar el movimiento financiero.');
    }
  }

  async findAll(startDate?: string, endDate?: string, type?: MovementType) {
    try {
      const result = await this.dynamoService.scan(this.tableName);
      let movements = (result.items || []) as FinancialMovement[];

      // Filtrar por fecha
      if (startDate || endDate) {
        movements = movements.filter(movement => {
          const movementDate = new Date(movement.createdAt);
          if (startDate && movementDate < new Date(startDate)) return false;
          if (endDate && movementDate > new Date(endDate + 'T23:59:59')) return false;
          return true;
        });
      }

      // Filtrar por tipo
      if (type) {
        movements = movements.filter(movement => movement.type === type);
      }

      return movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      this.logger.error(
        `Error inesperado obteniendo movimientos financieros: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Error al obtener movimientos financieros.');
    }
  }

  async findOne(id: string): Promise<FinancialMovement> {
    try {
      const movement = await this.dynamoService.get(this.tableName, { id });
      if (!movement) {
        throw new NotFoundException(`Movimiento financiero con ID ${id} no encontrado`);
      }
      return movement as FinancialMovement;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo movimiento financiero ${id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener el movimiento financiero.');
    }
  }

  /**
   * Obtiene el resumen financiero completo
   * Incluye todos los ingresos y gastos
   */
  async getFinancialSummary(startDate?: string, endDate?: string) {
    try {
      const movements = await this.findAll(startDate, endDate);

      const summary = {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        byType: {} as Record<MovementType, number>,
        byCategory: {} as Record<string, number>,
        count: movements.length,
      };

      movements.forEach(movement => {
        // Ingresos
        if (movement.type === MovementType.SALE) {
          summary.totalIncome += movement.amount;
        } else {
          // Gastos
          summary.totalExpenses += movement.amount;
        }

        // Por tipo
        summary.byType[movement.type] = (summary.byType[movement.type] || 0) + movement.amount;

        // Por categoría
        if (movement.category) {
          summary.byCategory[movement.category] = (summary.byCategory[movement.category] || 0) + movement.amount;
        }
      });

      summary.netIncome = summary.totalIncome - summary.totalExpenses;

      return summary;
    } catch (error) {
      this.logger.error(
        `Error obteniendo resumen financiero: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Error al obtener el resumen financiero.');
    }
  }
}

