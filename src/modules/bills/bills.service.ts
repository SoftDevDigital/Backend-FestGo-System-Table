import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Bill, PaymentDetail } from '../../common/entities/bill.entity';
import { Order, OrderItem } from '../../common/entities/order.entity';
import { BillStatus, PaymentMethod, OrderStatus, MovementType, TableStatus } from '../../common/enums';
import { v4 as uuidv4 } from 'uuid';
import { FinancialMovementsService } from '../financial/financial-movements.service';
import { ProductsService } from '../products/products.service';
import { TablesService } from '../tables/tables.service';
import { DirectSaleItemDto } from './dto/bill.dto';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);
  private readonly tableName: string;
  private readonly ordersTableName: string;

  private readonly productsTableName: string;

  constructor(
    private readonly dynamoService: DynamoDBService,
    private readonly financialMovementsService: FinancialMovementsService,
    private readonly productsService: ProductsService,
    private readonly tablesService: TablesService,
  ) {
    this.tableName = this.dynamoService.getTableName('bills');
    this.ordersTableName = this.dynamoService.getTableName('orders');
    this.productsTableName = this.dynamoService.getTableName('products');
  }

  /**
   * Libera una mesa si corresponde (solo para órdenes dine_in)
   */
  private async releaseTableIfNeeded(tableId: string | undefined, orderType: string | undefined): Promise<void> {
    // Solo liberar mesa si es dine_in y tiene tableId
    if (tableId && orderType === 'dine_in') {
      try {
        await this.tablesService.update(tableId, { status: TableStatus.AVAILABLE as any });
        this.logger.log(`Mesa ${tableId} liberada automáticamente después de facturar`);
      } catch (error) {
        this.logger.warn(`No se pudo liberar la mesa ${tableId}: ${error.message}`);
      }
    }
  }

  async findAll() {
    try {
      const result = await this.dynamoService.scan(this.tableName);
      return result.items || [];
    } catch (error) {
      this.logger.error(
        `Error inesperado obteniendo facturas: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Error al obtener facturas. Por favor, intenta nuevamente.');
    }
  }

  async createBillFromOrder(
    orderId: string,
    paymentMethod: PaymentMethod,
    paidAmount: number,
    cashierId?: string,
    discountAmount?: number,
    tipAmount?: number,
  ): Promise<Bill> {
    try {
      // Obtener la orden
      const order = await this.dynamoService.get(this.ordersTableName, { id: orderId });
      if (!order) {
        throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
      }

      const orderData = order as Order;

      // Validar que la orden no esté cancelada
      if (orderData.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('No se puede crear una factura de una orden cancelada');
      }

      // Validar que no exista ya una factura para esta orden
      const existingBills = await this.dynamoService.scan(
        this.tableName,
        'orderId = :orderId',
        undefined,
        { ':orderId': orderId }
      );

      if (existingBills.items && existingBills.items.length > 0) {
        // Si ya existe una factura pendiente, actualizarla
        const existingBill = existingBills.items[0] as Bill;
        if (existingBill.status === BillStatus.PENDING) {
          return await this.updateBillPayment(existingBill.id, paymentMethod, paidAmount, tipAmount);
        }
        throw new BadRequestException('Ya existe una factura para esta orden');
      }

      // Calcular totales (sin impuestos)
      const subtotal = orderData.subtotal;
      const taxAmount = 0; // Sin impuestos
      const taxRate = 0; // Sin impuestos
      const finalDiscountAmount = discountAmount || orderData.discountAmount || 0;
      const finalTipAmount = tipAmount || orderData.tipAmount || 0;
      const serviceChargeAmount = 0; // Opcional
      const totalAmount = subtotal - finalDiscountAmount + finalTipAmount + serviceChargeAmount;

      // Validar monto pagado
      if (paidAmount < totalAmount) {
        throw new BadRequestException(`El monto pagado ($${paidAmount}) es menor al total ($${totalAmount.toFixed(2)})`);
      }

      const changeAmount = paidAmount - totalAmount;

      // Crear detalle de pago
      const paymentDetail: PaymentDetail = {
        id: uuidv4(),
        method: paymentMethod,
        amount: paidAmount,
        processedAt: new Date().toISOString(),
      };

      // Generar número de factura
      const billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Crear factura con TODA la información de la orden (items completos)
      const bill: Bill = {
        id: uuidv4(),
        billNumber,
        orderId: orderId,
        tableId: orderData.tableId,
        customerId: orderData.customerId,
        cashierId: cashierId,
        subtotal,
        taxAmount,
        taxRate,
        discountAmount: finalDiscountAmount,
        tipAmount: finalTipAmount,
        serviceChargeAmount,
        totalAmount,
        paidAmount,
        changeAmount: changeAmount > 0 ? changeAmount : undefined,
        status: BillStatus.PAID,
        paymentDetails: [paymentDetail],
        // Guardar TODA la información de la orden para registro permanente
        items: orderData.items, // Items completos con productos, cantidades, precios
        orderNumber: orderData.orderNumber,
        waiterId: orderData.waiterId,
        orderType: orderData.orderType, // Guardar orderType para liberar mesa correctamente
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      // Remover campos undefined antes de guardar en DynamoDB
      const cleanBill = Object.fromEntries(
        Object.entries(bill).filter(([_, value]) => value !== undefined)
      ) as Bill;

      await this.dynamoService.put(this.tableName, cleanBill);

      // Actualizar estado de la orden a COMPLETED antes de eliminar (para auditoría)
      try {
        const completedOrder: Order = {
          ...orderData,
          status: OrderStatus.COMPLETED,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
        };
        await this.dynamoService.put(this.ordersTableName, completedOrder);
        this.logger.log(`Orden ${orderId} actualizada a COMPLETED antes de eliminar`);
      } catch (error) {
        this.logger.warn(`No se pudo actualizar el estado de la orden a COMPLETED: ${error.message}`);
      }

      // Registrar movimiento financiero de VENTA
      // ABSOLUTAMENTE TODO movimiento de dinero debe registrarse
      await this.financialMovementsService.create({
        type: MovementType.SALE,
        amount: totalAmount,
        description: `Venta - Factura ${billNumber} - Mesa ${orderData.tableId || 'N/A'}`,
        category: 'ventas',
        subcategory: 'restaurante',
        billId: bill.id,
        orderId: orderId,
        paymentMethod: paymentMethod,
        transactionId: paymentDetail.transactionId,
        notes: `Factura generada para orden ${orderData.orderNumber}`,
      });

      // Liberar mesa automáticamente si corresponde (solo dine_in)
      await this.releaseTableIfNeeded(orderData.tableId, orderData.orderType);

      // ELIMINAR la orden de la tabla Orders
      // La orden ya cumplió su función, toda la info está en la factura
      await this.dynamoService.delete(this.ordersTableName, { id: orderId });
      this.logger.log(`Orden ${orderId} eliminada después de crear factura ${billNumber}`);

      this.logger.log(`Factura creada: ${billNumber} - Total: $${totalAmount.toFixed(2)} - Pagado: $${paidAmount.toFixed(2)}`);
      
      return bill;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado creando factura: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al crear la factura. Verifica que todos los datos sean correctos.');
    }
  }

  private async updateBillPayment(
    billId: string,
    paymentMethod: PaymentMethod,
    paidAmount: number,
    tipAmount?: number
  ): Promise<Bill> {
    const bill = await this.dynamoService.get(this.tableName, { id: billId }) as Bill;
    
    const finalTipAmount = tipAmount || bill.tipAmount || 0;
    // Asegurar que taxAmount siempre sea 0 (sin impuestos)
    const taxAmount = 0;
    const taxRate = 0;
    const newTotalAmount = bill.subtotal - (bill.discountAmount || 0) + finalTipAmount;

    if (paidAmount < newTotalAmount) {
      throw new BadRequestException(`El monto pagado es menor al total`);
    }

    // Obtener orderType de la factura (ya guardado) o intentar obtenerlo de la orden si aún existe
    let orderType: string | undefined = bill.orderType;
    if (!orderType && bill.orderId && bill.orderId !== 'DIRECT_SALE') {
      try {
        const order = await this.dynamoService.get(this.ordersTableName, { id: bill.orderId });
        if (order) {
          orderType = (order as Order).orderType;
        }
      } catch (error) {
        // La orden ya fue eliminada, esto es normal
        this.logger.debug(`Orden ${bill.orderId} ya fue eliminada, usando orderType de la factura si existe`);
      }
    }

    const paymentDetail: PaymentDetail = {
      id: uuidv4(),
      method: paymentMethod,
      amount: paidAmount,
      processedAt: new Date().toISOString(),
    };

    const updatedBill: Bill = {
      ...bill,
      taxAmount, // Siempre 0 (sin impuestos)
      taxRate, // Siempre 0 (sin impuestos)
      tipAmount: finalTipAmount,
      totalAmount: newTotalAmount,
      paidAmount: bill.paidAmount + paidAmount,
      changeAmount: paidAmount - newTotalAmount,
      status: BillStatus.PAID,
      paymentDetails: [...bill.paymentDetails, paymentDetail],
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };

    // Remover campos undefined antes de guardar en DynamoDB
    const cleanBill = Object.fromEntries(
      Object.entries(updatedBill).filter(([_, value]) => value !== undefined)
    ) as Bill;

    await this.dynamoService.put(this.tableName, cleanBill);

    // Liberar mesa automáticamente si corresponde (solo dine_in)
    // Esto es importante porque updateBillPayment se llama cuando se completa un pago pendiente
    await this.releaseTableIfNeeded(bill.tableId, orderType);

    return cleanBill;
  }

  async findOne(id: string): Promise<Bill> {
    try {
      const bill = await this.dynamoService.get(this.tableName, { id });
      if (!bill) {
        throw new NotFoundException(`Factura con ID ${id} no encontrada`);
      }
      return bill as Bill;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo factura ${id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener la factura. Verifica que el ID sea válido.');
    }
  }

  async getBillWithOrder(billId: string): Promise<{ bill: Bill; order?: Order }> {
    try {
      const bill = await this.findOne(billId);
      
      // La orden ya fue eliminada después de crear la factura
      // Toda la información está en la factura (items, orderNumber, etc.)
      // Solo intentamos obtener la orden si aún existe (por compatibilidad)
      let order: Order | undefined;
      try {
        const orderData = await this.dynamoService.get(this.ordersTableName, { id: bill.orderId });
        if (orderData) {
          order = orderData as Order;
        }
      } catch (error) {
        // La orden ya fue eliminada, esto es normal
        this.logger.debug(`Orden ${bill.orderId} ya fue eliminada, usando datos de la factura`);
      }
      
      return { bill, order };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo factura ${billId}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener la factura.');
    }
  }

  /**
   * Crear factura directa sin orden (venta rápida/takeaway)
   * Para clientes que compran productos sin sentarse en mesa
   */
  async createDirectSale(
    items: DirectSaleItemDto[],
    paymentMethod: PaymentMethod,
    paidAmount: number,
    cashierId?: string,
    customerId?: string,
    discountAmount?: number,
    notes?: string,
  ): Promise<Bill> {
    try {
      // Obtener productos y crear items
      const billItems: OrderItem[] = [];
      let subtotal = 0;

      for (const itemDto of items) {
        // Obtener producto
        const product = await this.productsService.findOne(itemDto.productId);
        
        if (!product.isAvailable) {
          throw new BadRequestException(`El producto ${product.name} no está disponible`);
        }

        const unitPrice = product.price;
        const totalPrice = unitPrice * itemDto.quantity;
        subtotal += totalPrice;

        const billItem: OrderItem = {
          id: uuidv4(),
          productId: itemDto.productId,
          productName: product.name,
          quantity: itemDto.quantity,
          unitPrice,
          totalPrice,
          preparationStatus: 'pending',
        };

        billItems.push(billItem);
      }

      // Calcular totales (sin impuestos)
      const taxAmount = 0; // Sin impuestos
      const taxRate = 0; // Sin impuestos
      const finalDiscountAmount = discountAmount || 0;
      const tipAmount = 0; // No hay propina en ventas directas
      const serviceChargeAmount = 0;
      const totalAmount = subtotal - finalDiscountAmount + tipAmount + serviceChargeAmount;

      // Validar monto pagado
      if (paidAmount < totalAmount) {
        throw new BadRequestException(`El monto pagado ($${paidAmount}) es menor al total ($${totalAmount.toFixed(2)})`);
      }

      const changeAmount = paidAmount - totalAmount;

      // Crear detalle de pago
      const paymentDetail: PaymentDetail = {
        id: uuidv4(),
        method: paymentMethod,
        amount: paidAmount,
        processedAt: new Date().toISOString(),
      };

      // Generar número de factura
      const billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Crear factura directa (sin orden)
      const bill: Bill = {
        id: uuidv4(),
        billNumber,
        orderId: 'DIRECT_SALE', // Identificador especial para ventas directas
        tableId: undefined, // No hay mesa
        customerId: customerId,
        cashierId: cashierId,
        subtotal,
        taxAmount,
        taxRate,
        discountAmount: finalDiscountAmount,
        tipAmount,
        serviceChargeAmount,
        totalAmount,
        paidAmount,
        changeAmount: changeAmount > 0 ? changeAmount : undefined,
        status: BillStatus.PAID,
        paymentDetails: [paymentDetail],
        // Guardar items directamente
        items: billItems,
        orderNumber: `DIRECT-${Date.now()}`,
        notes: notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      // Remover campos undefined antes de guardar
      const cleanBill = Object.fromEntries(
        Object.entries(bill).filter(([_, value]) => value !== undefined)
      ) as Bill;

      await this.dynamoService.put(this.tableName, cleanBill);

      // Registrar movimiento financiero de VENTA
      await this.financialMovementsService.create({
        type: MovementType.SALE,
        amount: totalAmount,
        description: `Venta directa - Factura ${billNumber}`,
        category: 'ventas',
        subcategory: 'venta_directa',
        billId: bill.id,
        paymentMethod: paymentMethod,
        notes: notes || 'Venta directa sin orden',
      });

      this.logger.log(`Venta directa creada: ${billNumber} - Total: $${totalAmount.toFixed(2)} - Pagado: $${paidAmount.toFixed(2)}`);
      
      return cleanBill;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado creando venta directa: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al crear la venta directa. Verifica que todos los datos sean correctos.');
    }
  }
}
