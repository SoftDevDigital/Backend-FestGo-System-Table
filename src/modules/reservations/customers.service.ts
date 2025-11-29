import { Injectable, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Customer } from '../../common/entities/reservation.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/reservation.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CustomersService {
  constructor(private readonly dynamoService: DynamoDBService) {}

  async createCustomer(createCustomerDto: CreateCustomerDto): Promise<Customer> {
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

    await this.dynamoService.put('customers', customer);
    
    return customer;
  }

  async findAllCustomers(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Customer>> {
    const result = await this.dynamoService.scan('customers', undefined, undefined, undefined, limit);
    
    return new PaginatedResponse(
      result.items as Customer[],
      page,
      limit,
      result.count || 0
    );
  }

  async findCustomerById(customerId: string): Promise<Customer> {
    const customer = await this.dynamoService.get('customers', { customerId });
    
    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${customerId} no encontrado`);
    }
    
    return customer as Customer;
  }

  async findCustomerByPhone(phone: string): Promise<Customer> {
    const result = await this.dynamoService.scan(
      'customers',
      'phone = :phone',
      undefined,
      { ':phone': phone },
      1
    );
    
    if (!result.items || result.items.length === 0) {
      throw new NotFoundException(`Cliente con teléfono ${phone} no encontrado`);
    }
    
    return result.items[0] as Customer;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const result = await this.dynamoService.scan('customers');
    
    const searchTerms = query.toLowerCase();
    const filteredCustomers = (result.items as Customer[]).filter(customer =>
      customer.firstName.toLowerCase().includes(searchTerms) ||
      customer.lastName.toLowerCase().includes(searchTerms) ||
      (customer.email?.toLowerCase().includes(searchTerms))
    );

    return filteredCustomers;
  }

  async updateCustomer(customerId: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findCustomerById(customerId);

    const updatedCustomer = {
      ...customer,
      ...updateCustomerDto,
      notes: Array.isArray(updateCustomerDto.notes) ? updateCustomerDto.notes : customer.notes,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put('customers', updatedCustomer);
    
    return updatedCustomer;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.findCustomerById(customerId);
    await this.dynamoService.delete('customers', { customerId });
  }

  async getCustomerReservationHistory(customerId: string): Promise<any[]> {
    const result = await this.dynamoService.scan(
      'reservations',
      'customerId = :customerId',
      undefined,
      { ':customerId': customerId }
    );

    return result.items || [];
  }

  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    const result = await this.dynamoService.scan('customers');
    const customers = result.items as Customer[];
    
    return customers
      .filter(customer => customer.totalVisits > 0)
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, limit);
  }

  async getVipCustomers(): Promise<Customer[]> {
    const result = await this.dynamoService.scan('customers');
    const customers = result.items as Customer[];
    
    return customers.filter(customer => 
      (customer.totalVisits || 0) >= 10 || (customer.totalSpent || 0) >= 1000
    );
  }

  async promoteToVip(customerId: string): Promise<Customer> {
    const customer = await this.findCustomerById(customerId);
    const updatedCustomer = {
      ...customer,
      vipStatus: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put('customers', updatedCustomer);
    return updatedCustomer;
  }

  async removeVipStatus(customerId: string): Promise<Customer> {
    const customer = await this.findCustomerById(customerId);
    const updatedCustomer = {
      ...customer,
      vipStatus: false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    await this.dynamoService.put('customers', updatedCustomer);
    return updatedCustomer;
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

    await this.dynamoService.put('customers', updatedCustomer);
    return updatedCustomer;
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

    await this.dynamoService.put('customers', updatedCustomer);
    return updatedCustomer;
  }
}