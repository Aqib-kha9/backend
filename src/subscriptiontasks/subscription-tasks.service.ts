// subscription-tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/schemas/user.schema'; // Update path to your User schema
import { Offer } from '../product/schemas/offer.schema';

@Injectable()
export class SubscriptionTasksService {
  private readonly logger = new Logger(SubscriptionTasksService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Offer') private readonly offerModel: Model<Offer>
  ) {}

  // Run this every day at 2 AM
  @Cron('0 2 * * *')  // cron format: minute hour day month weekday
  async handleSubscriptionCheck() {
    this.logger.log('Running daily subscription check...');

    const today = new Date();

    // Find users whose subscription expired
    const expiredUsers = await this.userModel.find({
      status: 'active',
      $expr: {
        $lt: [
          { $add: [
              '$subscription_update',
              { $multiply: ['$subscription', 24 * 60 * 60 * 1000] }
            ]
          },
          today
        ]
      }
    });

    for (const user of expiredUsers) {
      user.status = 'inactive';
      await user.save();
      this.logger.log(`User ${user.userid} set to inactive.`);
    }

    // Find offers that are expired
    const expiredOffers = await this.offerModel.find({
      valid_to: { $lt: today },
    });
    for (const offer of expiredOffers) {
      await this.offerModel.deleteOne({ _id: offer._id });
      this.logger.log(`Offer ${offer.title} deleted.`);
    } 
  }
}
