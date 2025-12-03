import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { EntityNotFoundException } from '../../common/exceptions/business.exception';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/inventory.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);
  private readonly tableName: string;

  constructor(private readonly dynamoDBService: DynamoDBService) {
    this.tableName = this.dynamoDBService.getTableName('suppliers');
  }

  async findAll() {
    try {
      const result = await this.dynamoDBService.scan(this.tableName);
      return result.items;
    } catch (error) {
      this.logger.error(`Error obteniendo proveedores: ${error.message}`, error.stack);
      throw new Error(`Error al obtener la lista de proveedores: ${error.message || 'Error desconocido'}`);
    }
  }

  async findActive() {
    try {
      const result = await this.dynamoDBService.scan(this.tableName);
      return result.items.filter(supplier => supplier.isActive !== false);
    } catch (error) {
      this.logger.error(`Error obteniendo proveedores activos: ${error.message}`, error.stack);
      throw new Error(`Error al obtener proveedores activos: ${error.message || 'Error desconocido'}`);
    }
  }

  async findOne(id: string) {
    try {
      // Validar formato del ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error('El ID del proveedor es requerido y debe ser una cadena de texto válida');
      }

      const supplier = await this.dynamoDBService.get(this.tableName, { id: id.trim() });
      if (!supplier) {
        throw new EntityNotFoundException('Proveedor', id);
      }
      return supplier;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('ID del proveedor es requerido')) {
        throw new Error(`Error de validación: ${error.message}. Por favor, proporciona un ID válido.`);
      }
      this.logger.error(`Error obteniendo proveedor con ID "${id}": ${error.message}`, error.stack);
      throw new Error(`No se pudo obtener el proveedor con ID "${id}". Error: ${error.message || 'Error desconocido al consultar la base de datos'}`);
    }
  }

  async create(createSupplierDto: CreateSupplierDto) {
    try {
      // Asegurar que el objeto address se serialice correctamente
      const supplierData = {
        ...createSupplierDto,
        address: createSupplierDto.address ? {
          street: createSupplierDto.address.street,
          city: createSupplierDto.address.city,
          state: createSupplierDto.address.state,
          zipCode: createSupplierDto.address.zipCode,
          country: createSupplierDto.address.country,
        } : undefined,
      };

      const newSupplier = {
        id: uuidv4(),
        ...supplierData,
        isActive: true,
        totalOrders: 0,
        totalAmount: 0,
        lastOrderDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dynamoDBService.put(this.tableName, newSupplier);
      this.logger.log(`New supplier created: ${newSupplier.name}`);
      
      return newSupplier;
    } catch (error) {
      this.logger.error(`Error creando proveedor: ${error.message}`, error.stack);
      throw new Error(`Error al crear el proveedor: ${error.message || 'Error desconocido'}`);
    }
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    try {
      await this.findOne(id); // Verificar que existe

      let updateExpression = 'SET #updatedAt = :updatedAt';
      const expressionAttributeNames = { '#updatedAt': 'updatedAt' };
      const expressionAttributeValues: Record<string, any> = { ':updatedAt': new Date().toISOString() };

      // Manejar el objeto address por separado si existe
      let addressToUpdate: any = undefined;
      if (updateSupplierDto.address) {
        addressToUpdate = {
          street: updateSupplierDto.address.street || '',
          city: updateSupplierDto.address.city || '',
          state: updateSupplierDto.address.state || '',
          zipCode: updateSupplierDto.address.zipCode || '',
          country: updateSupplierDto.address.country || '',
        };
      }

      // Agregar campos a actualizar dinámicamente, filtrando valores undefined y address
      for (const [key, value] of Object.entries(updateSupplierDto)) {
        // Ignorar valores undefined y el objeto address (se maneja por separado)
        if (value === undefined || key === 'address') {
          continue;
        }

        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpression += `, ${attributeName} = ${attributeValue}`;
        expressionAttributeNames[attributeName] = key;
        
        // Procesar el valor según su tipo
        let processedValue = value;
        
        // Convertir strings booleanos a booleanos reales
        if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
          processedValue = value.toLowerCase() === 'true';
        }
        // Convertir strings numéricos a números (para campos como paymentTerms, volumeDiscount)
        else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
          const numValue = Number(value);
          // Solo convertir si el campo es típicamente numérico
          if (['paymentTerms', 'volumeDiscount', 'totalOrders', 'totalAmount'].includes(key)) {
            processedValue = numValue;
          }
        }
        
        // Validar y procesar valores numéricos
        if (typeof processedValue === 'number') {
          if (isNaN(processedValue) || !isFinite(processedValue)) {
            this.logger.warn(`Valor numérico inválido para ${key}: ${processedValue}, usando 0`);
            expressionAttributeValues[attributeValue] = 0;
          } else {
            expressionAttributeValues[attributeValue] = processedValue;
          }
        } 
        // Manejar null explícitamente
        else if (processedValue === null) {
          expressionAttributeValues[attributeValue] = null;
        } 
        // Manejar strings vacíos (convertir a null o mantener según el campo)
        else if (typeof processedValue === 'string' && processedValue.trim() === '' && ['notes', 'contactName', 'email', 'phone'].includes(key)) {
          // Para campos opcionales de texto, permitir strings vacíos
          expressionAttributeValues[attributeValue] = processedValue.trim();
        }
        // Todos los demás valores (strings, booleanos, etc.)
        else {
          expressionAttributeValues[attributeValue] = processedValue;
        }
      }

      // Agregar address si existe
      if (addressToUpdate !== undefined) {
        updateExpression += `, #address = :address`;
        expressionAttributeNames['#address'] = 'address';
        expressionAttributeValues[':address'] = addressToUpdate;
      }

      const updatedSupplier = await this.dynamoDBService.update(
        this.tableName,
        { id },
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      );

      this.logger.log(`Supplier updated: ${id}`);
      return updatedSupplier;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.error(`Error actualizando proveedor con ID "${id}": ${error.message}`, error.stack);
      
      // Mensajes más descriptivos según el tipo de error
      if (error.message && error.message.includes('ValidationException')) {
        throw new Error(`Error de validación al actualizar el proveedor: Los datos proporcionados no son válidos. Verifica que todos los campos tengan el formato correcto.`);
      }
      if (error.message && error.message.includes('ConditionalCheckFailedException')) {
        throw new Error(`Error al actualizar el proveedor: El proveedor con ID "${id}" no existe o fue modificado por otro usuario. Por favor, verifica el ID e intenta nuevamente.`);
      }
      
      throw new Error(`No se pudo actualizar el proveedor con ID "${id}". Error: ${error.message || 'Error desconocido al actualizar en la base de datos'}`);
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id); // Verificar que existe
      await this.dynamoDBService.delete(this.tableName, { id });
      this.logger.log(`Supplier removed: ${id}`);
      return { message: 'Proveedor eliminado correctamente' };
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.error(`Error eliminando proveedor ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al eliminar el proveedor: ${error.message || 'Error desconocido'}`);
    }
  }

  async updateOrderStats(supplierId: string, orderAmount: number) {
    try {
      // Validar que supplierId sea válido
      if (!supplierId || typeof supplierId !== 'string' || supplierId.trim() === '') {
        throw new Error('El ID del proveedor es requerido y debe ser una cadena de texto válida');
      }

      // Validar que orderAmount sea un número válido
      if (orderAmount === undefined || orderAmount === null) {
        throw new Error('El campo "orderAmount" es requerido y no puede estar vacío. Debe ser un número mayor o igual a 0');
      }

      const amount = Number(orderAmount);
      if (isNaN(amount) || !isFinite(amount)) {
        throw new Error(`El valor de "orderAmount" no es un número válido. Se recibió: "${orderAmount}". Debe ser un número (ejemplo: 1500.50)`);
      }
      
      if (amount < 0) {
        throw new Error(`El valor de "orderAmount" no puede ser negativo. Se recibió: ${amount}. Debe ser un número mayor o igual a 0`);
      }

      const supplier = await this.findOne(supplierId);
      
      // Asegurar que los valores numéricos existan y sean válidos (pueden ser undefined/null/string en registros antiguos)
      const currentTotalOrders = this.safeNumber(supplier.totalOrders, 0);
      const currentTotalAmount = this.safeNumber(supplier.totalAmount, 0);
      
      const updatedSupplier = await this.update(supplierId, {
        totalOrders: currentTotalOrders + 1,
        totalAmount: currentTotalAmount + amount,
        lastOrderDate: new Date().toISOString(),
      });

      this.logger.log(`Order stats updated for supplier ${supplierId}: +${amount} (Total: ${currentTotalAmount + amount})`);
      return updatedSupplier;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      // Si el error ya tiene un mensaje descriptivo, lanzarlo tal cual
      if (error instanceof Error && (
        error.message.includes('ID del proveedor es requerido') ||
        error.message.includes('orderAmount') ||
        error.message.includes('no es un número válido')
      )) {
        throw error;
      }
      this.logger.error(`Error actualizando estadísticas de órdenes del proveedor "${supplierId}" con monto "${orderAmount}": ${error.message}`, error.stack);
      throw new Error(`No se pudieron actualizar las estadísticas de órdenes del proveedor con ID "${supplierId}". Error: ${error.message || 'Error desconocido al procesar la actualización'}`);
    }
  }

  /**
   * Convierte un valor a número de forma segura
   */
  private safeNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    if (typeof value === 'number') {
      return isNaN(value) || !isFinite(value) ? defaultValue : value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  async getTopSuppliersByVolume(limit = 10) {
    const allSuppliers = await this.findAll();
    
    const sortedSuppliers = [...allSuppliers].sort((a, b) => b.totalAmount - a.totalAmount);
    return sortedSuppliers.slice(0, limit);
  }

  async getSuppliersByPaymentTerms() {
    const allSuppliers = await this.findAll();
    
    return allSuppliers.reduce((groups, supplier) => {
      const terms = supplier.paymentTerms || 30;
      if (!groups[terms]) {
        groups[terms] = [];
      }
      groups[terms].push(supplier);
      return groups;
    }, {} as Record<number, any[]>);
  }
}