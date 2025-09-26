import { Controller, Get, Post, Body, UseGuards, UseInterceptors, UploadedFile, Req, UnauthorizedException, UploadedFiles } from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { Express } from 'express';
import * as jwt from 'jsonwebtoken';
import { getProductSchemaStructure } from './product.utils';
import {getInventorySchemaStructure} from './inventory.utils'
import { JwtAuthGuard } from '../auth/jwt-auth.guard';


@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService,

  ) {}

  @Post('add-product')
  @UseGuards(AuthGuard('jwt'))
  async addproduct(@Body() data: any) {
      return this.productService.addproduct(data);
  }

  @Post('add-inventory')
  @UseGuards(AuthGuard('jwt'))
  async addinventory(@Body() data: any) {
    return this.productService.addinventory(data);
  }

  @Post('bulk-import')
  @UseGuards(AuthGuard('jwt'))
  async bulkImportProducts(@Body() data: any, @Req() req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) throw new UnauthorizedException('Token not found');

    const decoded = jwt.decode(token);
    if (!decoded) throw new UnauthorizedException('Token not found');

    const docId = String(decoded.sub);

    
    return this.productService.bulkImportProducts(data.products, docId);
  }

  @Post('upload-images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, uniqueSuffix + extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        cb(new Error('Only image files are allowed!'), false);
      } else {
        cb(null, true);
      }
    }
  }))
  
  async uploadImages(@Req() req,@UploadedFiles() files: Array<Express.Multer.File>) {
    const userid = req.user.userid;
    const urls = files.map(file => `http://localhost:4000/uploads/${userid}/${file.filename}`);
    return { urls };
  }

  @Get('all')
  async getAdminProducts(@Req() req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) throw new UnauthorizedException('Token not found');

    const decoded = jwt.decode(token);
    if (!decoded) throw new UnauthorizedException('Token not found');

    const docId = decoded.sub ;

    return this.productService.getAdminProducts(docId);
}

@Get('all-retailer')
async getRetailerProducts(@Req() req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) throw new UnauthorizedException('Token not found');

  const decoded = jwt.decode(token);
  if (!decoded) throw new UnauthorizedException('Token not found');

  const docId = decoded.sub ;
  

  return this.productService.getRetailerProducts(docId);
}

@Get('schema')
getSchemaStructure() {
  return {
    product: getProductSchemaStructure(),
    inventory: getInventorySchemaStructure(),
  };
}


@Post('update/:product_id')
@UseGuards(AuthGuard('jwt'))
async updateProduct(@Body() changes: any, @Req() req) {
  const productId = req.params.product_id;
  return this.productService.updateProduct(productId, changes);
}
}