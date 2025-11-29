import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { S3Service } from './s3.service';

@ApiTags('files')
@Controller('files')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: any) {
    return this.s3Service.uploadFile(file);
  }
}