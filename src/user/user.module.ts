import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserSecurityGroup, UserSecurityGroupSchema } from './schemas/user-security-group.schema';
import { UserService } from './user.service';
import { UserSecurityGroupService } from './user-security-group.service';
import { Product, ProductSchema } from 'src/product/schemas/product.schema';
import { SuperAdminService } from './sa.service';
import { AdminService } from './admin.service';
import { SAController } from './sa.controller';
import { AdminController } from './admin.controller';
import {ProductModule} from '../product/product.module'
import { Party, PartySchema } from './schemas/party.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoryService } from './category.service';
import {Retailerfield,RetailerfieldSchema} from './schemas/retailerfields.schema'
import { RetailerController } from './retailer.controller';
import { Inventory, InventorySchema } from 'src/product/schemas/inventory.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSecurityGroup.name, schema: UserSecurityGroupSchema },
      { name: Product.name, schema: ProductSchema },
      {name:Party.name, schema: PartySchema},
      { name: Category.name, schema: CategorySchema },
      {name:Retailerfield.name, schema:RetailerfieldSchema },
      {name:Inventory.name, schema:InventorySchema}

      
    ]), 
    forwardRef(() => ProductModule),
  ],
  providers: [UserService, UserSecurityGroupService, SuperAdminService, AdminService, CategoryService],
  controllers: [ SAController, AdminController, RetailerController],
  exports: [UserService, UserSecurityGroupService, CategoryService],
})
export class UserModule {}
