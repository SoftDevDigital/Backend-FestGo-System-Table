import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Customer } from '../../common/entities/reservation.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/reservation.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CustomersService {
  private readonly customersTableName: string;
  private readonly reservationsTableName: string;

  constructor(private readonly dynamoService: DynamoDBService) {
    this.customersTableName = this.dynamoService.getTableName('customers');
    this.reservationsTableName = this.dynamoService.getTableName('reservations');
  }

  async createCustomer(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    try {
      const customerId = uuidv4();

      const customer: Customer = {
        customerId,
        firstName: createCustomerDto.firstName,
        lastName: createCustomerDto.lastName,
        email: createCustomerDto.email,
        phone: createCustomerDto.phone,
        dateOfBirth: createCustomerDto.dateOfBirth,
        allergies: createCustomerDto.allergies || [],
        dietaryRestrictions: createCustomerDto.dietaryRestrictions || [],
        preferences: createCustomerDto.preferences || [],
        totalVisits: 0,
        totalSpent: 0,
        averageSpent: 0,
        vipStatus: false,
        notes: Array.isArray(createCustomerDto.notes) ? createCustomerDto.notes : [],
        tags: [],
        communicationPreferences: {
          email: false,
          sms: false,
          whatsapp: false,
          phone: false
        },
        address: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system'
      };

      await this.dynamoService.put(this.customersTableName, customer);
      
      return customer;
    } catch (error) {
      throw new Error(`Error al crear el cliente: ${error.message || 'Error desconocido'}`);
    }
  }

  async findAllCustomers(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Customer>> {
    try {
      const result = await this.dynamoService.scan(this.customersTableName, undefined, undefined, undefined, limit);
      
      const normalizedCustomers = this.normalizeCustomers(result.items as any[] || []);
      
      return new PaginatedResponse(
        normalizedCustomers,
        page,
        limit,
        result.count || 0
      );
    } catch (error) {
      // Si hay error de serialización, retornar lista vacía
      if (error.message?.includes('STRING_VALUE cannot be converted to Integer')) {
        return new PaginatedResponse([], page, limit, 0);
      }
      throw error;
    }
  }

  async findCustomerById(customerId: string): Promise<Customer> {
    try {
      const customer = await this.dynamoService.get(this.customersTableName, { customerId });
      
      if (!customer) {
        throw new NotFoundException(`Cliente con ID ${customerId} no encontrado`);
      }
      
      return this.normalizeCustomer(customer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Error al obtener el cliente: ${error.message || 'Error desconocido'}`);
    }
  }

  async findCustomerByPhone(phone: string): Promise<Customer> {
    const result = await this.dynamoService.scan(
      this.customersTableName,
      'phone = :phone',
      undefined,
      { ':phone': phone },
      1
    );
    
    if (!result.items || result.items.length === 0) {
      throw new NotFoundException(`Cliente con teléfono ${phone} no encontrado`);
    }
    
    return this.normalizeCustomer(result.items[0]);
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const result = await this.dynamoService.scan(this.customersTableName);
      
      const searchTerms = query.toLowerCase();
      const filteredCustomers = this.normalizeCustomers(result.items as any[] || []).filter(customer =>
        customer.firstName.toLowerCase().includes(searchTerms) ||
        customer.lastName.toLowerCase().includes(searchTerms) ||
        (customer.email?.toLowerCase().includes(searchTerms))
      );

      return filteredCustomers;
    } catch (error) {
      // Si hay error de serialización, retornar lista vacía
      if (error.message?.includes('STRING_VALUE cannot be converted to Integer')) {
        return [];
      }
      throw error;
    }
  }

  async updateCustomer(customerId: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    try {
      const customer = await this.findCustomerById(customerId);

      const updatedCustomer = {
        ...customer,
        ...updateCustomerDto,
        notes: Array.isArray(updateCustomerDto.notes) ? updateCustomerDto.notes : customer.notes,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      };

      await this.dynamoService.put(this.customersTableName, updatedCustomer);
      
      return updatedCustomer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Error al actualizar el cliente: ${error.message || 'Error desconocido'}`);
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.findCustomerById(customerId);
      await this.dynamoService.delete(this.customersTableName, { customerId });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Error al eliminar el cliente: ${error.message || 'Error desconocido'}`);
    }
  }

  async getCustomerReservationHistory(customerId: string): Promise<any[]> {
    const result = await this.dynamoService.scan(
      this.reservationsTableName,
      'customerId = :customerId',
      undefined,
      { ':customerId': customerId }
    );

    return result.items || [];
  }

  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    try {
      const result = await this.dynamoService.scan(this.customersTableName);
      const customers = this.normalizeCustomers(result.items as any[] || []);
      
      return customers
        .filter(customer => customer.totalVisits > 0)
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, limit);
    } catch (error) {
      // Si hay error de serialización, retornar lista vacía
      if (error.message?.includes('STRING_VALUE cannot be converted to Integer')) {
        return [];
      }
      throw error;
    }
  }

  async getVipCustomers(): Promise<Customer[]> {
    try {
      const result = await this.dynamoService.scan(this.customersTableName);
      const customers = this.normalizeCustomers(result.items as any[] || []);
      
      return customers.filter(customer => 
        (customer.totalVisits || 0) >= 10 || (customer.totalSpent || 0) >= 1000
      );
    } catch (error) {
      // Si hay error de serialización, retornar lista vacía
      if (error.message?.includes('STRING_VALUE cannot be converted to Integer')) {
        return [];
      }
      throw error;
    }
  }

  async promoteToVip(customerId: string): Promise<Customer> {
    const customer = await this.findCustomerById(customerId);
    const updatedCustomer = {
      ...customer,
      vipStatus: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put(this.customersTableName, updatedCustomer);
    return this.normalizeCustomer(updatedCustomer);
  }

  async removeVipStatus(customerId: string): Promise<Customer> {
    const customer = await this.findCustomerById(customerId);
    const updatedCustomer = {
      ...customer,
      vipStatus: false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put(this.customersTableName, updatedCustomer);
    return this.normalizeCustomer(updatedCustomer);
  }

  async addCustomerNote(customerId: string, note: string): Promise<Customer> {
    const customer = await this.findCustomerById(customerId);
    const updatedNotes = [...(customer.notes || []), note];
    
    const updatedCustomer = {
      ...customer,
      notes: updatedNotes,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put(this.customersTableName, updatedCustomer);
    return this.normalizeCustomer(updatedCustomer);
  }

  async updateCommunicationPreferences(customerId: string, preferences: any): Promise<Customer> {
    const customer = await this.findCustomerById(customerId);
    const updatedCustomer = {
      ...customer,
      communicationPreferences: {
        ...customer.communicationPreferences,
        ...preferences
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put(this.customersTableName, updatedCustomer);
    return this.normalizeCustomer(updatedCustomer);
  }

  /**
   * Normaliza un customer individual, convirtiendo campos numéricos de string a number
   */
  private normalizeCustomer(customer: any): Customer {
    if (!customer) return customer;
    
    // Convertir campos numéricos de forma segura
    const normalizeNumber = (value: any, defaultValue: number = 0): number => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    };
    
    return {
      ...customer,
      totalVisits: normalizeNumber(customer.totalVisits, 0),
      totalSpent: normalizeNumber(customer.totalSpent, 0),
      averageSpent: normalizeNumber(customer.averageSpent, 0),
      vipStatus: customer.vipStatus === true || customer.vipStatus === 'true',
    };
  }

  /**
   * Normaliza un array de customers
   */
  private normalizeCustomers(customers: any[]): Customer[] {
    if (!customers || !Array.isArray(customers)) return [];
    return customers.map(customer => this.normalizeCustomer(customer));
  }
}