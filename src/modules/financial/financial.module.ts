import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FinancialMovementsController } from './financial-movements.controller';
import { FinancialMovementsService } from './financial-movements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialMovementsController],
  providers: [FinancialMovementsService],
  exports: [FinancialMovementsService],
})
export class FinancialModule {}




