import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    // Direct configuration with your credentials
    return cloudinary.config({
      cloud_name: 'djnlblv5m',
      api_key: '629616282989358',
      api_secret: 'uOEYKazkhSn60ShAjeya-hHd2jQ',
    });
  },
};