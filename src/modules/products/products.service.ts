import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';
import { Product } from '../../common/entities/product.entity';
import { ProductStatus } from '../../common/enums';
import { CreateProductDto } from './dto/product.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoDBService,
  ) {
    this.tableName = this.dynamoService.getTableName('products');
  }

  async findAll(categoryId?: string, availableOnly: boolean = true): Promise<Product[]> {
    let result;
    
    if (categoryId) {
      // Usar query con índice category-index
      result = await this.dynamoService.query(
        this.tableName,
        'categoryId = :categoryId',
        undefined,
        { ':categoryId': categoryId },
        availableOnly ? 'isAvailable = :available' : undefined,
        'category-index',
      );
    } else {
      // Scan completo con filtro opcional
      result = await this.dynamoService.scan(
        this.tableName,
        availableOnly ? 'isAvailable = :available' : undefined,
        undefined,
        availableOnly ? { ':available': true } : undefined,
      );
    }
    
    return (result.items || []) as Product[];
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.dynamoService.get(this.tableName, { id });
    return product as Product | null;
  }

  // Alias para compatibilidad con código existente
  async findOne(id: string): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const product: Product = {
        id: uuidv4(),
        name: createProductDto.name,
        code: createProductDto.code,
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
        isVegan: createProductDto.isVegan,
        isGlutenFree: createProductDto.isGlutenFree,
        isSpicy: createProductDto.isSpicy,
        spicyLevel: createProductDto.spicyLevel,
        isPopular: createProductDto.isPopular,
        discountPercentage: createProductDto.discountPercentage,
        minimumAge: createProductDto.minimumAge,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      };

      await this.dynamoService.put(this.tableName, product);
      
      this.logger.log(`Producto creado: ${product.name} (${product.id})`);
      
      return product;
    } catch (error) {
      this.logger.error(`Error creando producto: ${error.message}`, error.stack);
      throw new BadRequestException(`Error al crear el producto: ${error.message}`);
    }
  }

  async update(id: string, updateData: Partial<CreateProductDto>): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    const updatedProduct: Product = {
      ...product,
      ...updateData,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };

    await this.dynamoService.put(this.tableName, updatedProduct);
    
    return updatedProduct;
  }

  async delete(id: string): Promise<void> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    await this.dynamoService.delete(this.tableName, { id });
  }
}
