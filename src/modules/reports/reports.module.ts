import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [DatabaseModule, FinancialModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}