import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';

export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'admin@restaurant.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'user@restaurant.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({
    description: 'Rol del usuario',
    enum: UserRole,
    default: UserRole.CUSTOMER,
    example: UserRole.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role?: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token JWT de acceso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    example: {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@restaurant.com',
      role: 'customer',
    },
  })
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}
