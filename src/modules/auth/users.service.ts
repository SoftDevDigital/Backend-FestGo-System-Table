import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { User } from '../../common/entities/user.entity';
import { UserRole } from '../../common/enums';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoDBService) {
    this.tableName = this.dynamoService.getTableName('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      // Usar query con el índice email-index para búsqueda eficiente
      const result = await this.dynamoService.query(
        this.tableName,
        'email = :email',
        undefined,
        { ':email': email },
        undefined,
        'email-index', // Usar el índice global secundario
        1
      );
      
      if (result.items && result.items.length > 0) {
        return result.items[0] as User;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error buscando usuario por email ${email}: ${error.message}`, error.stack);
      throw new Error(`Error al buscar usuario: ${error.message || 'Error desconocido'}`);
    }
  }

  async findById(userId: string): Promise<User | null> {
    try {
      const user = await this.dynamoService.get(this.tableName, { id: userId });
      return user as User | null;
    } catch (error) {
      this.logger.error(`Error buscando usuario por ID ${userId}: ${error.message}`, error.stack);
      throw new Error(`Error al buscar usuario: ${error.message || 'Error desconocido'}`);
    }
  }

  async create(userData: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictException(`El email ${userData.email} ya está registrado`);
      }

      // Separar nombre completo en firstName y lastName
      const nameParts = userData.name.trim().split(' ');
      const firstName = nameParts[0] || userData.name;
      const lastName = nameParts.slice(1).join(' ') || '';

      // Hashear contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Crear usuario
      const newUser: User = {
        id: uuidv4(),
        email: userData.email,
        password: hashedPassword,
        firstName,
        lastName,
        role: userData.role || UserRole.CUSTOMER,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      await this.dynamoService.put(this.tableName, newUser);
      this.logger.log(`Usuario creado: ${newUser.email} con rol ${newUser.role}`);
      
      // No retornar la contraseña
      const { password, ...userWithoutPassword } = newUser;
      return userWithoutPassword as User;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error creando usuario: ${error.message}`, error.stack);
      throw new Error(`Error al crear usuario: ${error.message || 'Error desconocido'}`);
    }
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      this.logger.error(`Error validando contraseña: ${error.message}`, error.stack);
      return false;
    }
  }
}