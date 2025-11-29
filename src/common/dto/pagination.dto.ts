import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  totalItems: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  hasPreviousPage: boolean;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNextPage: boolean;

  constructor(page: number, limit: number, totalItems: number) {
    this.page = page;
    this.limit = limit;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / limit);
    this.hasPreviousPage = page > 1;
    this.hasNextPage = page < this.totalPages;
  }
}

export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: PaginationMetaDto;

  constructor(data: T[], page: number, limit: number, totalItems: number) {
    this.data = data;
    this.meta = new PaginationMetaDto(page, limit, totalItems);
  }
}