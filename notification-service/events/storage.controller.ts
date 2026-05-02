import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import { StorageListener } from './storage.listener';

type MulterFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@Controller('storage')
@UseGuards(AuthGuard('jwt'))
export class StorageController {
  constructor(private readonly storageListener: StorageListener) {}

  
  @Post('upload/single')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadSingle(
    @UploadedFile() file: MulterFile,
    @Body('patientId') patientId: string,
    @Body('doctorId') doctorId: string,
    @Body('type') type: string,
  ) {
    if (!file) throw new BadRequestException('No file provided.');
    if (!patientId || !doctorId) throw new BadRequestException('patientId and doctorId are required.');

    return this.storageListener.uploadSingle({
      file,
      patientId,
      doctorId,
      type: type ?? 'document',
    });
  }

 
  @Post('upload/multiple')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async uploadMultiple(
    @UploadedFiles() files: MulterFile[],
    @Body('patientId') patientId: string,
    @Body('doctorId') doctorId: string,
    @Body('type') type: string,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('No files provided.');
    if (!patientId || !doctorId) throw new BadRequestException('patientId and doctorId are required.');

    return this.storageListener.uploadMultiple({
      files,
      patientId,
      doctorId,
      type: type ?? 'document',
    });
  }
}
