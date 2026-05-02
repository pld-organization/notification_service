import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

type MulterFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

export interface UploadedFileResult {
  filename: string;
  url: string;
  size?: number;
}

@Injectable()
export class StorageListener {
  private readonly logger = new Logger(StorageListener.name);
  private readonly storageUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {
    this.storageUrl =
      this.config.get<string>('STORAGE_SERVICE_URL') ??
      'https://storage-service-yxqy.onrender.com';
  }

  async uploadSingle(params: {
    file: MulterFile;
    patientId: string;
    doctorId: string;
    type: string;
  }): Promise<UploadedFileResult> {
    this.logger.log(`Uploading single file — patient: ${params.patientId} / doctor: ${params.doctorId}`);

    const form = new FormData();
    form.append('file', params.file.buffer, {
      filename: params.file.originalname,
      contentType: params.file.mimetype,
    });
    form.append('patientId', params.patientId);
    form.append('doctorId', params.doctorId);
    form.append('type', params.type);

    const response = await firstValueFrom(
      this.httpService.post<UploadedFileResult>(
        `${this.storageUrl}/upload/single`,
        form,
        { headers: form.getHeaders() },
      ),
    );

    const uploadedFile = response.data;

    await this.notificationService.notifyFileUploaded({
      patientId: params.patientId,
      doctorId: params.doctorId,
      type: params.type,
      files: [uploadedFile],
    });

    this.logger.log(`Single file uploaded & notifications sent — ${uploadedFile.filename}`);
    return uploadedFile;
  }

  async uploadMultiple(params: {
    files: MulterFile[];
    patientId: string;
    doctorId: string;
    type: string;
  }): Promise<UploadedFileResult[]> {
    this.logger.log(`Uploading ${params.files.length} files — patient: ${params.patientId} / doctor: ${params.doctorId}`);

    const form = new FormData();
    for (const file of params.files) {
      form.append('files', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }
    form.append('patientId', params.patientId);
    form.append('doctorId', params.doctorId);
    form.append('type', params.type);

    const response = await firstValueFrom(
      this.httpService.post<UploadedFileResult[]>(
        `${this.storageUrl}/upload/multiple`,
        form,
        { headers: form.getHeaders() },
      ),
    );

    const uploadedFiles = response.data;

    await this.notificationService.notifyFileUploaded({
      patientId: params.patientId,
      doctorId: params.doctorId,
      type: params.type,
      files: uploadedFiles,
    });

    this.logger.log(`${uploadedFiles.length} files uploaded & notifications sent`);
    return uploadedFiles;
  }
}
