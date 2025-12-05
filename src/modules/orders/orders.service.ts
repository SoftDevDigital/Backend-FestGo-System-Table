import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Order, OrderItem } from '../../common/entities/order.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/order.dto';
import { OrderStatus, TableStatus } from '../../common/enums';
import { v4 as uuidv4 } from 'uuid';
import { ProductsService } from '../products/products.service';
import { TablesService } from '../tables/tables.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly tableName: string;

  private readonly tablesTableName: string;

  constructor(
    private readonly dynamoService: DynamoDBService,
    private readonly productsService: ProductsService,
    private readonly tablesService: TablesService,
  ) {
    this.tableName = this.dynamoService.getTableName('orders');
    this.tablesTableName = this.dynamoService.getTableName('tables');
  }

  async findAll() {
    try {
      const result = await this.dynamoService.scan(this.tableName);
      return result.items || [];
    } catch (error) {
      this.logger.error(
        `Error inesperado obteniendo pedidos: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Error al obtener pedidos. Por favor, intenta nuevamente.');
    }
  }

  async findOne(id: string): Promise<Order> {
    try {
      const order = await this.dynamoService.get(this.tableName, { id });
      if (!order) {
        throw new NotFoundException(`Orden con ID ${id} no encontrada`);
      }
      return order as Order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo orden ${id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener la orden. Verifica que el ID sea válido.');
    }
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      // Obtener precios de productos y crear items
      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const itemDto of createOrderDto.items) {
        // Obtener producto para validar precio
        const product = await this.getProductById(itemDto.productId);
        
        const unitPrice = product.price;
        const totalPrice = unitPrice * itemDto.quantity;
        subtotal += totalPrice;

        const orderItem: OrderItem = {
          id: uuidv4(),
          productId: itemDto.productId,
          productName: product.name,
          variantId: itemDto.variantId,
          quantity: itemDto.quantity,
          unitPrice,
          totalPrice,
          specialInstructions: itemDto.specialInstructions,
          modifiers: itemDto.modifiers?.map(m => ({
            id: uuidv4(),
            name: m.name,
            price: m.price,
            type: m.type,
          })),
          preparationStatus: 'pending',
        };

        orderItems.push(orderItem);
      }

      // Calcular totales
      const taxRate = 0.16; // 16% IVA (ajustable)
      const taxAmount = subtotal * taxRate;
      const discountAmount = createOrderDto.discountAmount || 0;
      const tipAmount = createOrderDto.tipAmount || 0;
      const totalAmount = subtotal + taxAmount - discountAmount + tipAmount;

      // Generar número de orden
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const order: Order = {
        id: uuidv4(),
        orderNumber,
        tableId: createOrderDto.tableId,
        customerId: createOrderDto.customerId, // Opcional - puede ser undefined para clientes walk-in
        waiterId: createOrderDto.waiterId,
        items: orderItems,
        subtotal,
        taxAmount,
        discountAmount,
        tipAmount,
        totalAmount,
        status: OrderStatus.PENDING,
        orderType: createOrderDto.orderType,
        notes: createOrderDto.notes,
        specialRequests: createOrderDto.specialRequests,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      // Remover campos undefined antes de guardar en DynamoDB
      const cleanOrder = Object.fromEntries(
        Object.entries(order).filter(([_, value]) => value !== undefined)
      ) as Order;

      await this.dynamoService.put(this.tableName, cleanOrder);

      // Actualizar estado de la mesa a "occupied" si es dine_in
      if (createOrderDto.tableId && createOrderDto.orderType === 'dine_in') {
        try {
          await this.tablesService.update(createOrderDto.tableId, { status: TableStatus.OCCUPIED as any });
          this.logger.log(`Mesa ${createOrderDto.tableId} actualizada a ocupada`);
        } catch (error) {
          this.logger.warn(`No se pudo actualizar el estado de la mesa: ${error.message}`);
        }
      }

      this.logger.log(`Orden creada: ${orderNumber} - Total: $${totalAmount.toFixed(2)}`);
      
      return order;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado creando orden: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Lanzar el error real para debugging
      throw new BadRequestException(
        `Error al crear la orden: ${error instanceof Error ? error.message : String(error)}. Verifica que todos los datos sean correctos.`
      );
    }
  }

  async addItems(orderId: string, items: CreateOrderItemDto[]): Promise<Order> {
    try {
      const order = await this.findOne(orderId);

      // Validar que la orden no esté completada o cancelada
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('No se pueden agregar items a una orden completada o cancelada');
      }

      // Clonar items existentes para trabajar con ellos
      const updatedItems = [...order.items];
      let additionalSubtotal = 0;

      for (const itemDto of items) {
        const product = await this.getProductById(itemDto.productId);
        const unitPrice = product.price;

        // Buscar si el producto ya existe en la orden (mismo productId y variantId)
        const existingItemIndex = updatedItems.findIndex(
          item => item.productId === itemDto.productId && 
                  item.variantId === itemDto.variantId &&
                  // Solo actualizar si no hay modificadores o instrucciones especiales diferentes
                  (!itemDto.modifiers || itemDto.modifiers.length === 0) &&
                  (!itemDto.specialInstructions || itemDto.specialInstructions.trim() === '')
        );

        if (existingItemIndex !== -1) {
          // El producto ya existe: actualizar cantidad a la nueva cantidad (no sumar)
          const existingItem = updatedItems[existingItemIndex];
          const oldTotalPrice = existingItem.totalPrice;
          const newQuantity = itemDto.quantity; // Cantidad final, no se suma
          const newTotalPrice = unitPrice * newQuantity;
          
          // Actualizar el item existente con la nueva cantidad
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            totalPrice: newTotalPrice,
          };

          // Calcular la diferencia en subtotal (nuevo total - viejo total)
          additionalSubtotal += (newTotalPrice - oldTotalPrice);
        } else {
          // El producto no existe: agregar como nuevo item
          const totalPrice = unitPrice * itemDto.quantity;
          additionalSubtotal += totalPrice;

          const orderItem: OrderItem = {
            id: uuidv4(),
            productId: itemDto.productId,
            productName: product.name,
            variantId: itemDto.variantId,
            quantity: itemDto.quantity,
            unitPrice,
            totalPrice,
            specialInstructions: itemDto.specialInstructions,
            modifiers: itemDto.modifiers?.map(m => ({
              id: uuidv4(),
              name: m.name,
              price: m.price,
              type: m.type,
            })),
            preparationStatus: 'pending',
          };

          updatedItems.push(orderItem);
        }
      }

      // Recalcular totales de la orden
      const newSubtotal = order.subtotal + additionalSubtotal;
      const taxRate = 0.16;
      const newTaxAmount = newSubtotal * taxRate;
      const discountAmount = order.discountAmount || 0;
      const tipAmount = order.tipAmount || 0;
      const newTotalAmount = newSubtotal + newTaxAmount - discountAmount + tipAmount;

      const updatedOrder: Order = {
        ...order,
        items: updatedItems,
        subtotal: newSubtotal,
        taxAmount: newTaxAmount,
        totalAmount: newTotalAmount,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };

      // Remover campos undefined antes de guardar en DynamoDB
      const cleanOrder = Object.fromEntries(
        Object.entries(updatedOrder).filter(([_, value]) => value !== undefined)
      ) as Order;

      await this.dynamoService.put(this.tableName, cleanOrder);
      this.logger.log(`Items agregados a orden ${order.orderNumber}. Nuevo total: $${newTotalAmount.toFixed(2)}`);
      
      return cleanOrder;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado agregando items a orden ${orderId}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al agregar items a la orden.');
    }
  }

  async removeItem(orderId: string, itemId: string): Promise<Order> {
    try {
      const order = await this.findOne(orderId);

      // Validar que la orden no esté completada o cancelada
      if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('No se pueden quitar items de una orden completada o cancelada');
      }

      // Buscar el item
      const itemIndex = order.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new NotFoundException(`Item con ID ${itemId} no encontrado en la orden`);
      }

      const removedItem = order.items[itemIndex];
      const updatedItems = order.items.filter(item => item.id !== itemId);

      // Recalcular totales
      const newSubtotal = order.subtotal - removedItem.totalPrice;
      const taxRate = 0.16;
      const newTaxAmount = newSubtotal * taxRate;
      const discountAmount = order.discountAmount || 0;
      const tipAmount = order.tipAmount || 0;
      const newTotalAmount = newSubtotal + newTaxAmount - discountAmount + tipAmount;

      const updatedOrder: Order = {
        ...order,
        items: updatedItems,
        subtotal: Math.max(0, newSubtotal),
        taxAmount: Math.max(0, newTaxAmount),
        totalAmount: Math.max(0, newTotalAmount),
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };

      // Remover campos undefined antes de guardar en DynamoDB
      const cleanOrder = Object.fromEntries(
        Object.entries(updatedOrder).filter(([_, value]) => value !== undefined)
      ) as Order;

      await this.dynamoService.put(this.tableName, cleanOrder);
      this.logger.log(`Item removido de orden ${order.orderNumber}. Nuevo total: $${newTotalAmount.toFixed(2)}`);
      
      return updatedOrder;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado removiendo item de orden ${orderId}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al quitar el item de la orden.');
    }
  }

  private async getProductById(productId: string): Promise<any> {
    try {
      const productsTable = this.dynamoService.getTableName('products');
      const product = await this.dynamoService.get(productsTable, { id: productId });
      
      if (!product) {
        throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
      }

      if (!product.isAvailable) {
        throw new BadRequestException(`El producto ${product.name} no está disponible`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al obtener el producto: ${error.message}`);
    }
  }
}
