import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      // Validar email duplicado (si se proporciona)
      if (createCustomerDto.email) {
        const existingCustomerByEmail = await this.findCustomerByEmail(createCustomerDto.email).catch(() => null);
        if (existingCustomerByEmail) {
          throw new BadRequestException(`Ya existe un cliente registrado con el email ${createCustomerDto.email}`);
        }
      }

      // Validar teléfono duplicado
      const existingCustomerByPhone = await this.findCustomerByPhone(createCustomerDto.phone).catch(() => null);
      if (existingCustomerByPhone) {
        throw new BadRequestException(`Ya existe un cliente registrado con el teléfono ${createCustomerDto.phone}`);
      }

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
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `No se pudo crear el cliente. Verifica que todos los datos sean correctos: nombre, apellido y teléfono son requeridos. ` +
        `El email y teléfono deben ser únicos (no duplicados). Detalle: ${error.message || 'Error desconocido'}`
      );
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
      throw new NotFoundException(
        `No se pudo encontrar el cliente con ID: ${customerId}. Verifica que el ID sea correcto y que el cliente exista en el sistema. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  async findCustomerByPhone(phone: string): Promise<Customer> {
    try {
      // Usar query con el índice phone-index para mejor rendimiento
      const result = await this.dynamoService.query(
        this.customersTableName,
        'phone = :phone',
        undefined,
        { ':phone': phone },
        undefined,
        'phone-index',
        1
      );
      
      if (!result.items || result.items.length === 0) {
        throw new NotFoundException(`Cliente con teléfono ${phone} no encontrado`);
      }
      
      return this.normalizeCustomer(result.items[0]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Fallback a scan si el índice no está disponible
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
  }

  async findCustomerByEmail(email: string): Promise<Customer> {
    try {
      // Usar query con el índice email-index para mejor rendimiento
      const result = await this.dynamoService.query(
        this.customersTableName,
        'email = :email',
        undefined,
        { ':email': email },
        undefined,
        'email-index',
        1
      );
      
      if (!result.items || result.items.length === 0) {
        throw new NotFoundException(`Cliente con email ${email} no encontrado`);
      }
      
      return this.normalizeCustomer(result.items[0]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Fallback a scan si el índice no está disponible
      const result = await this.dynamoService.scan(
        this.customersTableName,
        'email = :email',
        undefined,
        { ':email': email },
        1
      );
      
      if (!result.items || result.items.length === 0) {
        throw new NotFoundException(`Cliente con email ${email} no encontrado`);
      }
      
      return this.normalizeCustomer(result.items[0]);
    }
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

      // Validar email duplicado si se está actualizando
      if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
        const existingCustomerByEmail = await this.findCustomerByEmail(updateCustomerDto.email).catch(() => null);
        if (existingCustomerByEmail && existingCustomerByEmail.customerId !== customerId) {
          throw new BadRequestException(`Ya existe otro cliente registrado con el email ${updateCustomerDto.email}`);
        }
      }

      // Validar teléfono duplicado si se está actualizando
      if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
        const existingCustomerByPhone = await this.findCustomerByPhone(updateCustomerDto.phone).catch(() => null);
        if (existingCustomerByPhone && existingCustomerByPhone.customerId !== customerId) {
          throw new BadRequestException(`Ya existe otro cliente registrado con el teléfono ${updateCustomerDto.phone}`);
        }
      }

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
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `No se pudo actualizar el cliente con ID: ${customerId}. ` +
        `Verifica que el cliente exista y que los datos enviados sean válidos. ` +
        `El email y teléfono deben ser únicos si se están actualizando. Detalle: ${error.message || 'Error desconocido'}`
      );
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
      throw new NotFoundException(
        `No se pudo eliminar el cliente con ID: ${customerId}. ` +
        `Verifica que el ID sea correcto y que el cliente exista en el sistema. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
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

  /**
   * Obtiene el perfil completo del cliente con toda su información
   */
  async getCustomerProfile(customerId?: string, phone?: string): Promise<any> {
    try {
      let customer: Customer;

      if (customerId) {
        customer = await this.findCustomerById(customerId);
      } else if (phone) {
        customer = await this.findCustomerByPhone(phone);
      } else {
        throw new BadRequestException(
          'Para obtener el perfil del cliente debes proporcionar al menos uno de estos parámetros: ' +
          'customerId (ID único del cliente) o phone (teléfono en formato internacional, ej: +1234567890).'
        );
      }

      // Obtener todas las reservas del cliente
      const allReservations = await this.getCustomerReservationHistory(customer.customerId);
      const now = new Date();

      // Separar reservas pasadas y futuras
      const pastReservations = allReservations.filter((r: any) => {
        const reservationDateTime = new Date(`${r.reservationDate}T${r.reservationTime}`);
        const reservationEnd = new Date(reservationDateTime.getTime() + (r.duration || 120) * 60000);
        return reservationEnd < now;
      });

      const upcomingReservations = allReservations.filter((r: any) => {
        const reservationDateTime = new Date(`${r.reservationDate}T${r.reservationTime}`);
        return reservationDateTime > now && 
               r.status !== 'cancelled' && 
               r.status !== 'completed' && 
               r.status !== 'no_show';
      });

      // Calcular estadísticas de reservas
      const completedReservations = allReservations.filter((r: any) => r.status === 'completed');
      const cancelledReservations = allReservations.filter((r: any) => r.status === 'cancelled');
      const noShowReservations = allReservations.filter((r: any) => r.status === 'no_show');

      // Calcular gastos de reservas
      const totalSpentFromReservations = completedReservations.reduce((sum: number, r: any) => {
        return sum + (r.actualSpend || r.estimatedSpend || 0);
      }, 0);

      const averageSpentPerReservation = completedReservations.length > 0
        ? totalSpentFromReservations / completedReservations.length
        : 0;

      // Estadísticas por mes (últimos 6 meses)
      const monthlyStats = this.calculateMonthlyStats(completedReservations);

      // Mesa favorita (más reservada)
      const tableFrequency: Record<number, number> = {};
      completedReservations.forEach((r: any) => {
        if (r.tableNumber) {
          tableFrequency[r.tableNumber] = (tableFrequency[r.tableNumber] || 0) + 1;
        }
      });
      const favoriteTable = Object.keys(tableFrequency).length > 0
        ? parseInt(Object.keys(tableFrequency).reduce((a, b) => 
            tableFrequency[parseInt(a)] > tableFrequency[parseInt(b)] ? a : b
          ))
        : null;

      // Horario favorito
      const timeFrequency: Record<string, number> = {};
      completedReservations.forEach((r: any) => {
        if (r.reservationTime) {
          const hour = r.reservationTime.substring(0, 2);
          timeFrequency[hour] = (timeFrequency[hour] || 0) + 1;
        }
      });
      const favoriteTime = Object.keys(timeFrequency).length > 0
        ? Object.keys(timeFrequency).reduce((a, b) => 
            timeFrequency[a] > timeFrequency[b] ? a : b
          ) + ':00'
        : null;

      return {
        customer: {
          customerId: customer.customerId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          dateOfBirth: customer.dateOfBirth,
          vipStatus: customer.vipStatus,
          allergies: customer.allergies || [],
          dietaryRestrictions: customer.dietaryRestrictions || [],
          preferences: customer.preferences || [],
          address: customer.address,
          communicationPreferences: customer.communicationPreferences,
          createdAt: customer.createdAt
        },
        statistics: {
          totalReservations: allReservations.length,
          completedReservations: completedReservations.length,
          cancelledReservations: cancelledReservations.length,
          noShowReservations: noShowReservations.length,
          upcomingReservations: upcomingReservations.length,
          totalVisits: customer.totalVisits || 0,
          totalSpent: customer.totalSpent || totalSpentFromReservations,
          averageSpent: customer.averageSpent || averageSpentPerReservation,
          averageSpentPerReservation: Math.round(averageSpentPerReservation * 100) / 100,
          lastVisit: customer.lastVisit || (completedReservations.length > 0 
            ? completedReservations[completedReservations.length - 1].completedAt 
            : null),
          favoriteTable: favoriteTable,
          favoriteTime: favoriteTime,
          monthlyStats: monthlyStats
        },
        reservations: {
          upcoming: upcomingReservations.sort((a: any, b: any) => {
            const dateA = new Date(`${a.reservationDate}T${a.reservationTime}`);
            const dateB = new Date(`${b.reservationDate}T${b.reservationTime}`);
            return dateA.getTime() - dateB.getTime();
          }),
          past: pastReservations.sort((a: any, b: any) => {
            const dateA = new Date(`${a.reservationDate}T${a.reservationTime}`);
            const dateB = new Date(`${b.reservationDate}T${b.reservationTime}`);
            return dateB.getTime() - dateA.getTime();
          })
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(
        `No se pudo obtener el perfil del cliente. Verifica que el customerId o teléfono sean correctos y que el cliente exista en el sistema. ` +
        `Detalle: ${error.message || 'Error desconocido'}`
      );
    }
  }

  /**
   * Calcula estadísticas mensuales de las reservas
   */
  private calculateMonthlyStats(reservations: any[]): any[] {
    const now = new Date();
    const monthlyData: Record<string, { month: string, reservations: number, spent: number }> = {};

    // Últimos 6 meses
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      monthlyData[monthKey] = {
        month: monthName,
        reservations: 0,
        spent: 0
      };
    }

    // Agrupar reservas por mes
    reservations.forEach((r: any) => {
      if (r.reservationDate) {
        const reservationDate = new Date(r.reservationDate);
        const monthKey = `${reservationDate.getFullYear()}-${String(reservationDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].reservations += 1;
          monthlyData[monthKey].spent += (r.actualSpend || r.estimatedSpend || 0);
        }
      }
    });

    return Object.values(monthlyData).reverse(); // Más reciente primero
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