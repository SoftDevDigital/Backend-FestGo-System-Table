import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}