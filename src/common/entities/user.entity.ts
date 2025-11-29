import { UserRole } from '../enums';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface User extends BaseEntity {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  profileImageUrl?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface Employee extends BaseEntity {
  userId: string;
  employeeNumber: string;
  hireDate: string;
  salary: number;
  commissionRate?: number;
  status: string;
  department: string;
  position: string;
  schedule: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
}