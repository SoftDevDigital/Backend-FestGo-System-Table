import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Category } from '../../common/entities/product.entity';
import { CreateCategoryDto } from './dto/product.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoDBService) {
    this.tableName = this.dynamoService.getTableName('categories');
  }

  async findAll() {
    try {
      const result = await this.dynamoService.scan(this.tableName);
      const categories = (result.items || []).sort((a: any, b: any) => 
        (a.sortOrder || 999) - (b.sortOrder || 999)
      );
      return categories;
    } catch (error) {
      this.logger.error(
        `Error inesperado obteniendo categorías: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Error al obtener categorías. Por favor, intenta nuevamente.');
    }
  }

  async findOne(id: string): Promise<Category> {
    try {
      const category = await this.dynamoService.get(this.tableName, { id });
      if (!category) {
        throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
      }
      return category as Category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo categoría ${id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al obtener la categoría. Verifica que el ID sea válido.');
    }
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      // Validar categoría padre si se proporciona
      if (createCategoryDto.parentCategoryId) {
        const parentCategory = await this.dynamoService.get(
          this.tableName,
          { id: createCategoryDto.parentCategoryId }
        );
        if (!parentCategory) {
          throw new BadRequestException(`La categoría padre con ID ${createCategoryDto.parentCategoryId} no existe`);
        }
      }

      const category: Category = {
        id: uuidv4(),
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        imageUrl: createCategoryDto.imageUrl,
        isActive: true,
        sortOrder: createCategoryDto.sortOrder || 1,
        parentCategoryId: createCategoryDto.parentCategoryId,
        color: createCategoryDto.color,
        icon: createCategoryDto.icon,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      await this.dynamoService.put(this.tableName, category);
      this.logger.log(`Categoría creada: ${category.name}`);
      
      return category;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado creando categoría: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al crear la categoría. Verifica que todos los datos sean correctos.');
    }
  }
}


