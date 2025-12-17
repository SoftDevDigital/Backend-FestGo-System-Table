import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Category } from '../../common/entities/product.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/product.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly tableName: string;
  private readonly productsTableName: string;

  constructor(private readonly dynamoService: DynamoDBService) {
    this.tableName = this.dynamoService.getTableName('categories');
    this.productsTableName = this.dynamoService.getTableName('products');
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

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    try {
      const category = await this.findOne(id);

      // Validar categoría padre si se proporciona y es diferente a la actual
      if (updateCategoryDto.parentCategoryId && updateCategoryDto.parentCategoryId !== category.parentCategoryId) {
        // No permitir que una categoría sea su propia padre
        if (updateCategoryDto.parentCategoryId === id) {
          throw new BadRequestException('Una categoría no puede ser su propia categoría padre');
        }

        const parentCategory = await this.dynamoService.get(
          this.tableName,
          { id: updateCategoryDto.parentCategoryId }
        );
        if (!parentCategory) {
          throw new BadRequestException(`La categoría padre con ID ${updateCategoryDto.parentCategoryId} no existe`);
        }
      }

      const updatedCategory: Category = {
        ...category,
        ...updateCategoryDto,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };

      await this.dynamoService.put(this.tableName, updatedCategory);
      this.logger.log(`Categoría actualizada: ${updatedCategory.name} (${id})`);
      
      return updatedCategory;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado actualizando categoría ${id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al actualizar la categoría. Verifica que todos los datos sean correctos.');
    }
  }

  /**
   * Verifica si hay productos usando esta categoría
   */
  private async hasProductsUsingCategory(categoryId: string): Promise<boolean> {
    try {
      const result = await this.dynamoService.query(
        this.productsTableName,
        'categoryId = :categoryId',
        undefined,
        { ':categoryId': categoryId },
        undefined,
        'category-index',
      );

      return (result.items && result.items.length > 0) || false;
    } catch (error) {
      this.logger.error(
        `Error verificando productos con categoría ${categoryId}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      // En caso de error, asumimos que hay productos para evitar eliminaciones accidentales
      return true;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const category = await this.findOne(id);

      // Validar que no haya productos usando esta categoría
      const hasProducts = await this.hasProductsUsingCategory(id);
      if (hasProducts) {
        throw new BadRequestException(
          `No se puede eliminar la categoría "${category.name}" porque hay productos asociados a ella. ` +
          `Primero elimina o cambia la categoría de los productos que la usan.`
        );
      }

      await this.dynamoService.delete(this.tableName, { id });
      this.logger.log(`Categoría eliminada: ${category.name} (${id})`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado eliminando categoría ${id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al eliminar la categoría. Verifica que no haya productos asociados.');
    }
  }
}




