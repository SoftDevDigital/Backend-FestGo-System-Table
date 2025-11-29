import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { WaitlistEntry } from '../../common/entities/reservation.entity';
import { CreateWaitlistEntryDto } from './dto/reservation.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WaitlistService {
  constructor(private readonly dynamoService: DynamoDBService) {}

  async addToWaitlist(createWaitlistDto: CreateWaitlistEntryDto): Promise<WaitlistEntry> {
    // Verificar si ya existe una entrada para este cliente en esta fecha
    const existingEntries = await this.dynamoService.scan(
      'waitlist',
      'customerId = :customerId AND requestedDate = :date',
      undefined,
      {
        ':customerId': createWaitlistDto.customerId,
        ':date': createWaitlistDto.requestedDate
      }
    );

    if (existingEntries.items && existingEntries.items.length > 0) {
      throw new BadRequestException('El cliente ya está en la lista de espera para esta fecha');
    }

    const waitlistId = uuidv4();

    const waitlistEntry: WaitlistEntry = {
      waitlistId,
      customerId: createWaitlistDto.customerId,
      customerDetails: createWaitlistDto.customerDetails,
      partySize: createWaitlistDto.partySize,
      requestedDate: createWaitlistDto.requestedDate,
      requestedTime: createWaitlistDto.requestedTime,
      timeFlexibility: createWaitlistDto.timeFlexibility || 30, // 30 minutos por defecto
      status: 'waiting',
      addedAt: new Date().toISOString(),
      expiresAt: this.calculateExpiryDate(createWaitlistDto.requestedDate),
      position: await this.getNextPosition(createWaitlistDto.requestedDate),
      priority: 'normal',
      specialRequests: [],
      notificationPreferences: ['sms', 'email'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    };

    await this.dynamoService.put('waitlist', waitlistEntry);
    
    return waitlistEntry;
  }

  async getWaitlistForDate(date: string): Promise<WaitlistEntry[]> {
    const result = await this.dynamoService.scan(
      'waitlist',
      'requestedDate = :date AND #status = :status',
      { '#status': 'status' },
      {
        ':date': date,
        ':status': 'waiting'
      }
    );
    
    const entries = result.items as WaitlistEntry[];
    return entries.sort((a, b) => a.position - b.position);
  }

  async contactWaitlistEntry(waitlistId: string): Promise<WaitlistEntry> {
    const entry = await this.findWaitlistEntryById(waitlistId);
    
    if (entry.status !== 'waiting') {
      throw new BadRequestException('Esta entrada ya no está en espera');
    }

    const updatedEntry = {
      ...entry,
      status: 'contacted' as const,
      contactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.dynamoService.put('waitlist', updatedEntry);
    
    return updatedEntry;
  }

  async convertWaitlistToReservation(waitlistId: string, reservationId: string): Promise<WaitlistEntry> {
    const entry = await this.findWaitlistEntryById(waitlistId);
    
    if (entry.status === 'converted') {
      throw new BadRequestException('Esta entrada ya fue convertida a reserva');
    }

    const updatedEntry = {
      ...entry,
      status: 'converted' as const,
      convertedReservationId: reservationId,
      updatedAt: new Date().toISOString()
    };

    await this.dynamoService.put('waitlist', updatedEntry);
    
    // Reposicionar otras entradas
    await this.repositionEntries(entry.requestedDate);
    
    return updatedEntry;
  }

  async cancelWaitlistEntry(waitlistId: string): Promise<WaitlistEntry> {
    const entry = await this.findWaitlistEntryById(waitlistId);
    
    if (entry.status === 'cancelled') {
      throw new BadRequestException('Esta entrada ya está cancelada');
    }

    const updatedEntry = {
      ...entry,
      status: 'cancelled' as const,
      updatedAt: new Date().toISOString()
    };

    await this.dynamoService.put('waitlist', updatedEntry);
    
    return updatedEntry;
  }

  async expireOldEntries(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoffDate = yesterday.toISOString().split('T')[0];

    const expiredEntries = await this.dynamoService.scan(
      'waitlist',
      'requestedDate < :cutoffDate AND #status = :status',
      { '#status': 'status' },
      {
        ':cutoffDate': cutoffDate,
        ':status': 'waiting'
      }
    );

    if (expiredEntries.items) {
      for (const entry of expiredEntries.items) {
        const updatedEntry = {
          ...entry,
          status: 'expired' as const,
          updatedAt: new Date().toISOString()
        };
        
        await this.dynamoService.put('waitlist', updatedEntry);
      }
    }
  }

  async getWaitlistStatistics(date?: string): Promise<any> {
    let query = '#status IN (:waiting, :contacted)';
    const expressionAttributeNames = { '#status': 'status' };
    const expressionAttributeValues: any = {
      ':waiting': 'waiting',
      ':contacted': 'contacted'
    };

    if (date) {
      query += ' AND requestedDate = :date';
      expressionAttributeValues[':date'] = date;
    }

    const allEntries = await this.dynamoService.scan(
      'waitlist',
      query,
      expressionAttributeNames,
      expressionAttributeValues
    );

    const entries = allEntries.items || [];
    
    return {
      totalEntries: entries.length,
      waitingEntries: entries.filter((e: any) => e.status === 'waiting').length,
      contactedEntries: entries.filter((e: any) => e.status === 'contacted').length,
      averageWaitTime: this.calculateAverageWaitTime(entries),
      averagePartySize: entries.length > 0 
        ? entries.reduce((sum: number, e: any) => sum + e.partySize, 0) / entries.length 
        : 0
    };
  }

  private async findWaitlistEntryById(waitlistId: string): Promise<WaitlistEntry> {
    const entry = await this.dynamoService.get('waitlist', { waitlistId });
    
    if (!entry) {
      throw new NotFoundException(`Entrada de lista de espera ${waitlistId} no encontrada`);
    }
    
    return entry as WaitlistEntry;
  }

  private async getNextPosition(date: string): Promise<number> {
    const result = await this.dynamoService.scan(
      'waitlist',
      'requestedDate = :date AND #status = :status',
      { '#status': 'status' },
      {
        ':date': date,
        ':status': 'waiting'
      }
    );
    
    return (result.items?.length || 0) + 1;
  }

  private async repositionEntries(date: string): Promise<void> {
    const entries = await this.getWaitlistForDate(date);
    
    for (let i = 0; i < entries.length; i++) {
      const updatedEntry = {
        ...entries[i],
        position: i + 1,
        updatedAt: new Date().toISOString()
      };
      
      await this.dynamoService.put('waitlist', updatedEntry);
    }
  }

  private calculateAverageWaitTime(entries: any[]): number {
    const convertedEntries = entries.filter(e => 
      e.status === 'converted' && e.contactedAt && e.updatedAt
    );
    
    if (convertedEntries.length === 0) return 0;
    
    const totalWaitTime = convertedEntries.reduce((sum, entry) => {
      const contacted = new Date(entry.contactedAt).getTime();
      const converted = new Date(entry.updatedAt).getTime();
      return sum + (converted - contacted);
    }, 0);
    
    return Math.round(totalWaitTime / convertedEntries.length / 1000 / 60); // minutos
  }

  private calculateExpiryDate(requestedDate: string): string {
    const date = new Date(requestedDate);
    date.setHours(23, 59, 59); // Final del día
    return date.toISOString();
  }
}