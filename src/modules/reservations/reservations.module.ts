import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CustomersService } from './customers.service';
import { WaitlistService } from './waitlist.service';
import { ReservationsController } from './reservations.controller';
import { CustomersController } from './customers.controller';
import { WaitlistController } from './waitlist.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ReservationsController, 
    CustomersController, 
    WaitlistController
  ],
  providers: [
    ReservationsService, 
    CustomersService, 
    WaitlistService
  ],
  exports: [
    ReservationsService, 
    CustomersService, 
    WaitlistService
  ]
})
export class ReservationsModule {}