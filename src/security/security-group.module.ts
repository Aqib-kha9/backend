import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityGroup, SecurityGroupSchema } from './schemas/security-group.schema';
import { SecurityPermission,SecurityPermissionSchema } from './schemas/security-permission.schema';
import { SecurityGroupPermission,SecurityGroupPermissionSchema } from './schemas/security-group-permission.schema';
import { SecurityGroupService } from './security-group.service';
import { SecurityPermissionService } from './security-permission.service';
import { SecurityGroupPermissionService } from './security-group-permission.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SecurityGroup.name, schema: SecurityGroupSchema },
      { name: SecurityPermission.name, schema: SecurityPermissionSchema },
      { name: SecurityGroupPermission.name, schema: SecurityGroupPermissionSchema },
    ]),
  ],
  providers: [
    SecurityGroupService,
    SecurityPermissionService,
    SecurityGroupPermissionService,
  ],
  exports: [
    SecurityGroupService,
    SecurityPermissionService,
    SecurityGroupPermissionService,
  ],
})
export class SecurityModule {}
