import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Product } from '../../common/entities/product.entity';
import { CreateProductDto } from './dto/product.dto';
import { ProductStatus } from '../../common/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoDBService) {
    this.tableName = this.dynamoService.getTableName('products');
  }

  async findAll(category?: string, availableOnly: boolean = true) {
    try {
      const result = await this.dynamoService.scan(this.tableName);
      let products = result.items || [];

      // Filtrar solo disponibles si se solicita
      if (availableOnly) {
        products = products.filter((p: any) => p.isAvailable === true && p.status === 'available');
      }

      // Filtrar por categoría si se proporciona
      if (category) {
        products = products.filter((p: any) => 
          p.categoryId === category || 
          p.category?.toLowerCase().includes(category.toLowerCase())
        );
      }

      return products;
    } catch (error) {
      this.logger.error(
        `Error inesperado obteniendo productos: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('Error al obtener productos. Por favor, intenta nuevamente.');
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const product = await this.dynamoService.get(this.tableName, { id });
      if (!product) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado obteniendo producto ${id}: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new NotFoundException(`Error al obtener el producto: ${error.message}`);
    }
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      // Validar que la categoría exista (opcional, pero recomendado)
      const categoriesTable = this.dynamoService.getTableName('categories');
      try {
        const category = await this.dynamoService.get(categoriesTable, { id: createProductDto.categoryId });
        if (!category) {
          throw new BadRequestException(`La categoría con ID ${createProductDto.categoryId} no existe`);
        }
      } catch (error) {
        // Si la tabla de categorías no existe o hay error, continuar (no es crítico)
        this.logger.warn(`No se pudo validar la categoría: ${error.message}`);
      }

      const product: Product = {
        id: uuidv4(),
        name: createProductDto.name,
        description: createProductDto.description,
        price: createProductDto.price,
        costPrice: createProductDto.costPrice,
        categoryId: createProductDto.categoryId,
        sku: createProductDto.sku,
        barcode: createProductDto.barcode,
        status: createProductDto.status || ProductStatus.AVAILABLE,
        imageUrl: createProductDto.imageUrl,
        images: createProductDto.images,
        isAvailable: createProductDto.isAvailable !== undefined ? createProductDto.isAvailable : true,
        preparationTime: createProductDto.preparationTime,
        calories: createProductDto.calories,
        allergens: createProductDto.allergens,
        ingredients: createProductDto.ingredients,
        nutritionalInfo: createProductDto.nutritionalInfo,
        tags: createProductDto.tags,
        isVegan: createProductDto.isVegan || false,
        isGlutenFree: createProductDto.isGlutenFree || false,
        isSpicy: createProductDto.isSpicy || false,
        spicyLevel: createProductDto.spicyLevel,
        isPopular: createProductDto.isPopular || false,
        discountPercentage: createProductDto.discountPercentage,
        minimumAge: createProductDto.minimumAge,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      await this.dynamoService.put(this.tableName, product);
      this.logger.log(`Producto creado: ${product.name} - Precio: $${product.price}`);
      
      return product;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado creando producto: ${error.message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Error al crear el producto. Verifica que todos los datos sean correctos.');
    }
  }
}
