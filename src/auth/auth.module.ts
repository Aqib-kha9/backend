import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User, UserSchema } from '../user/schemas/user.schema';
import { UserSecurityGroup, UserSecurityGroupSchema } from '../user/schemas/user-security-group.schema';
import { SecurityGroup, SecurityGroupSchema } from '../security/schemas/security-group.schema';
import { UserSecurityGroupService } from '../user/user-security-group.service';
import { SecurityGroupService } from '../security/security-group.service';
import { UserService } from '../user/user.service';
import { AdminService } from 'src/user/admin.service';
import { SuperAdminService } from 'src/user/sa.service';
import { Product, ProductSchema } from 'src/product/schemas/product.schema';
import { Party, PartySchema } from '../user/schemas/party.schema';
import { Inventory, InventorySchema } from 'src/product/schemas/inventory.schema';


@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'super-secret-key', // move to .env
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema },
      { name: UserSecurityGroup.name, schema: UserSecurityGroupSchema },
      { name: SecurityGroup.name, schema: SecurityGroupSchema },
      { name: Product.name, schema: ProductSchema },
      {name:Party.name, schema: PartySchema},
      {name:Inventory.name, schema:InventorySchema}
    ]),
  ],
  providers: [AuthService, JwtStrategy, UserSecurityGroupService, SecurityGroupService, UserService, AdminService, SuperAdminService],
  controllers: [AuthController],
})
export class AuthModule {}
