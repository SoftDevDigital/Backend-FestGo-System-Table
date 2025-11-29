import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponse<T = any> {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Success message', example: 'Operation completed successfully' })
  message: string;

  @ApiProperty({ description: 'Response data', required: false })
  data?: T;

  constructor(message: string, data?: T) {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}

export class ErrorResponse {
  @ApiProperty({ description: 'Error status', example: false })
  success: boolean;

  @ApiProperty({ description: 'Error message', example: 'An error occurred' })
  message: string;

  @ApiProperty({ description: 'Error code', example: 'INVALID_INPUT' })
  error: string;

  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode: number;

  @ApiProperty({ description: 'Timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: 'Request path', example: '/api/v1/example' })
  path: string;

  constructor(message: string, error: string, statusCode: number, path: string) {
    this.success = false;
    this.message = message;
    this.error = error;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.path = path;
  }
}