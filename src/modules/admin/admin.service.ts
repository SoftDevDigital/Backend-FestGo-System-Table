import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  async getDashboard() {
    return { message: 'Admin Dashboard' };
  }
}