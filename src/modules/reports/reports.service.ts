import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Bill } from '../../common/entities/bill.entity';
import { FinancialMovementsService } from '../financial/financial-movements.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly billsTableName: string;
  private readonly ordersTableName: string;

  constructor(
    private readonly dynamoService: DynamoDBService,
    private readonly financialMovementsService: FinancialMovementsService,
  ) {
    this.billsTableName = this.dynamoService.getTableName('bills');
  }

  async getSales(startDate?: string, endDate?: string, groupBy?: string) {
    try {
      // Obtener todas las facturas (las órdenes ya fueron eliminadas)
      const billsResult = await this.dynamoService.scan(this.billsTableName);
      const bills = (billsResult.items || []) as Bill[];

      // Filtrar por fecha si se proporciona
      let filteredBills = bills;
      if (startDate || endDate) {
        filteredBills = bills.filter(bill => {
          const billDate = new Date(bill.createdAt);
          if (startDate && billDate < new Date(startDate)) return false;
          if (endDate && billDate > new Date(endDate + 'T23:59:59')) return false;
          return true;
        });
      }

      // Calcular totales (sin impuestos)
      const totalSales = filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
      const totalTax = 0; // Sin impuestos
      const totalDiscounts = filteredBills.reduce((sum, bill) => sum + (bill.discountAmount || 0), 0);
      const totalTips = filteredBills.reduce((sum, bill) => sum + (bill.tipAmount || 0), 0);

      // Ventas por método de pago
      const salesByPaymentMethod: Record<string, number> = {};
      filteredBills.forEach(bill => {
        bill.paymentDetails.forEach(payment => {
          const method = payment.method;
          salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + payment.amount;
        });
      });

      // Productos más vendidos (desde las facturas, que tienen los items guardados)
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      filteredBills.forEach(bill => {
        if (bill.items) {
          bill.items.forEach(item => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = {
                name: item.productName,
                quantity: 0,
                revenue: 0,
              };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.totalPrice;
          });
        }
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Obtener resumen financiero completo (incluye TODOS los movimientos)
      const financialSummary = await this.financialMovementsService.getFinancialSummary(startDate, endDate);

      return {
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
          groupBy: groupBy || 'all',
        },
        sales: {
          totalSales,
          totalTax,
          totalDiscounts,
          totalTips,
          netSales: totalSales - totalDiscounts,
          numberOfBills: filteredBills.length,
          averageBill: filteredBills.length > 0 ? totalSales / filteredBills.length : 0,
        },
        financial: {
          totalIncome: financialSummary.totalIncome,
          totalExpenses: financialSummary.totalExpenses,
          netIncome: financialSummary.netIncome,
          movementsByType: financialSummary.byType,
          movementsByCategory: financialSummary.byCategory,
          totalMovements: financialSummary.count,
        },
        byPaymentMethod: Object.entries(salesByPaymentMethod).map(([method, amount]) => ({
          method,
          amount,
          percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
        })),
        topProducts,
        bills: filteredBills.map(bill => ({
          billNumber: bill.billNumber,
          date: bill.createdAt,
          total: bill.totalAmount,
          paymentMethod: bill.paymentDetails[0]?.method,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo reporte de ventas: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(`Error al obtener reporte de ventas: ${error.message || 'Error desconocido'}`);
    }
  }
}