import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @AdminOnly()
  @ApiOperation({ 
    summary: '📊 Dashboard del administrador',
    description: 'Obtiene métricas y estadísticas generales del sistema. Solo para administradores.'
  })
  getDashboard() {
    return this.adminService.getDashboard();
  }
}