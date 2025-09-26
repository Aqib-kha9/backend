// scripts/seed-superadmin.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/user/schemas/user.schema';
import { UserSecurityGroup } from '../src/user/schemas/user-security-group.schema';
import { Party } from '../src/user/schemas/party.schema';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get(getModelToken(User.name));
  const userSecurityGroupModel = app.get(getModelToken(UserSecurityGroup.name));
  const partyModel = app.get(getModelToken(Party.name));

  const email = 'superadmin@example.com';
  const plainPassword = 'SuperAdmin@123';
  const userid = 'u101';

  // check if already exists
  const existing = await userModel.findOne({ userid });
  if (existing) {
    console.log('❌ SuperAdmin already exists:', existing.email);
    await app.close();
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const superAdmin = await userModel.create({
    userid,
    email,
    password: hashedPassword,
    name: 'Super Admin',
    phonenumber: '9999999999',
    city: 'Delhi',
    state: 'Delhi',
    zip: '110001',
    status: 'active',
    subscription: 9999,
    subscription_update: new Date(),
    created_stamp: new Date(),
  });

  await userSecurityGroupModel.create({
    userid,
    groupid: 1, // 1 = SuperAdmin
    from_date: new Date(),
    thru_date: new Date('2099-12-31'),
  });

  await partyModel.create({
    party_id: 'PYT100',
    userid: userid,
    party_type: 'superadmin',
    store_name: 'SuperAdmin Store',
    created_at: new Date(),
  });

  console.log('✅ SuperAdmin seeded successfully!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${plainPassword}`);

  await app.close();
}

bootstrap();
