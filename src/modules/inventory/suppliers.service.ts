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
      const supplier = await this.dynamoDBService.get(this.tableName, { id });
      if (!supplier) {
        throw new EntityNotFoundException('Proveedor', id);
      }
      return supplier;
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw error;
      }
      this.logger.error(`Error obteniendo proveedor ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al obtener el proveedor: ${error.message || 'Error desconocido'}`);
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
      const expressionAttributeValues = { ':updatedAt': new Date().toISOString() };

      // Agregar campos a actualizar dinámicamente
      for (const [key, value] of Object.entries(updateSupplierDto)) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpression += `, ${attributeName} = ${attributeValue}`;
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
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
      this.logger.error(`Error actualizando proveedor ${id}: ${error.message}`, error.stack);
      throw new Error(`Error al actualizar el proveedor: ${error.message || 'Error desconocido'}`);
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
    const supplier = await this.findOne(supplierId);
    
    const updatedSupplier = await this.update(supplierId, {
      totalOrders: supplier.totalOrders + 1,
      totalAmount: supplier.totalAmount + orderAmount,
      lastOrderDate: new Date().toISOString(),
    });

    return updatedSupplier;
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