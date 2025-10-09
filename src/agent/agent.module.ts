import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentSyncController } from './agent.sync.controller'; // Make sure this is imported
import { Agent, AgentSchema } from './schemas/agent.schema';
import { Task, TaskSchema } from './schemas/task.schema';
import { TallyData, TallyDataSchema } from './schemas/tallydata.schema';
import { PendingTask, PendingTaskSchema } from './schemas/pending-task.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Party, PartySchema } from '../user/schemas/party.schema';
import { Product, ProductSchema } from '../product/schemas/product.schema';
import { Inventory, InventorySchema } from '../product/schemas/inventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Party.name, schema: PartySchema },
      { name: PendingTask.name, schema: PendingTaskSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Task.name, schema: TaskSchema },
      { name: TallyData.name, schema: TallyDataSchema },
    ]),
  ],
  controllers: [AgentController, AgentSyncController], // Include both controllers here
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}