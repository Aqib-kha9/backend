// cloudinary.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface CloudinaryUploadResponse extends UploadApiResponse {
  secure_url: string;
  public_id: string;
}

export interface CloudinaryDeleteResponse {
  result: string;
}

@Injectable()
export class CloudinaryService {
  constructor(@Inject('CLOUDINARY') private readonly cloudinary) {}

  async uploadImage(file: Express.Multer.File, folder: string = 'products'): Promise<CloudinaryUploadResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as CloudinaryUploadResponse);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadImageFromUrl(url: string, folder: string = 'products'): Promise<CloudinaryUploadResponse> {
    return await cloudinary.uploader.upload(url, {
      folder: folder,
    }) as CloudinaryUploadResponse;
  }

  async deleteImage(publicId: string): Promise<CloudinaryDeleteResponse> {
    return await cloudinary.uploader.destroy(publicId) as CloudinaryDeleteResponse;
  }
}