// cloudinary.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

export interface CloudinaryDeleteResponse {
  result: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly uploadsPath = path.join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'products'): Promise<CloudinaryUploadResponse> {
    try {
      const folderPath = path.join(this.uploadsPath, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileExtension = path.extname(file.originalname) || '.jpg';
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(folderPath, fileName);

      fs.writeFileSync(filePath, file.buffer);

      const appUrl = this.configService.get<string>('APP_URL') || '';
      const secure_url = `${appUrl}/uploads/${folder}/${fileName}`;

      this.logger.log(`File uploaded locally: ${secure_url}`);

      return {
        secure_url,
        public_id: `${folder}/${fileName}`,
      } as CloudinaryUploadResponse;
    } catch (error) {
      this.logger.error('Local upload error:', error);
      throw error;
    }
  }

  async uploadImageFromUrl(url: string, folder: string = 'products'): Promise<CloudinaryUploadResponse> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      const folderPath = path.join(this.uploadsPath, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileExtension = '.jpg'; // Fallback
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(folderPath, fileName);

      fs.writeFileSync(filePath, buffer);

      const appUrl = this.configService.get<string>('APP_URL') || '';
      const secure_url = `${appUrl}/uploads/${folder}/${fileName}`;

      return {
        secure_url,
        public_id: `${folder}/${fileName}`,
      } as CloudinaryUploadResponse;
    } catch (error) {
      this.logger.error('Local upload from URL error:', error);
      throw error;
    }
  }

  async deleteImage(publicId: string): Promise<CloudinaryDeleteResponse> {
    try {
      const filePath = path.join(this.uploadsPath, publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { result: 'ok' };
      }
      return { result: 'not found' };
    } catch (error) {
      this.logger.error('Local delete error:', error);
      return { result: 'error' };
    }
  }
}