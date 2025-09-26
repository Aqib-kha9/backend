import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Offer, OfferDocument } from './schemas/offer.schema';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/schemas/user.schema';


@Injectable()
export class OfferService {
  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<OfferDocument>,
    private readonly UserService: UserService, 
    @InjectModel(User.name) private userModel: Model<User>, ) {}

  async createOffer(data: Partial<Offer>): Promise<Offer> {
    // Validate logic
    const {
      product_id, party_id, title, offer_type,
      offer_value, apply_to, target_retailers,
      valid_from, valid_to, description
    } = data;

    if (!product_id || !party_id || !valid_from || !valid_to || !title || !offer_type || offer_value === undefined) {
      throw new BadRequestException('Missing required offer fields');
    }

    if (offer_value <= 0) {
      throw new BadRequestException('Offer value must be greater than 0');
    }

    if (new Date(valid_from) >= new Date(valid_to)) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (apply_to === 'custom' && (!target_retailers || target_retailers.length === 0)) {
      throw new BadRequestException('You must specify at least one retailer for custom targeting');
    }

    const offer = new this.offerModel({
      product_id,
    party_id,
      title,
      description,
      offer_type,
      offer_value,
      apply_to,
      target_retailers,
      valid_from,
      valid_to,
      created_at: new Date()
    });
    return offer.save();
  }

  async getActiveOffersForRetailer(retailerId: string): Promise<Offer[]> {
    const now = new Date();
    return this.offerModel.find({
      valid_from: { $lte: now },
      valid_to: { $gte: now },
      $or: [
        { apply_to: 'all' },
        { apply_to: 'custom', target_retailers: retailerId }
      ]
    }).exec();
  }

  async getActiveOffersForProduct(productId: string): Promise<Offer[]> {
    const now = new Date();
    return this.offerModel.find({
      product_id: productId,
      valid_from: { $lte: now },
      valid_to: { $gte: now }
    }).exec();
  }

  async updateOffer(id: string, data: Partial<Offer>): Promise<Offer | null> {
    // Validate logic (reuse from createOffer, but allow partial updates)
    if (data.offer_value !== undefined && data.offer_value <= 0) {
      throw new BadRequestException('Offer value must be greater than 0');
    }
    if (data.valid_from && data.valid_to && new Date(data.valid_from) >= new Date(data.valid_to)) {
      throw new BadRequestException('Start date must be before end date');
    }
    if (data.apply_to === 'custom' && (!data.target_retailers || data.target_retailers.length === 0)) {
      throw new BadRequestException('You must specify at least one retailer for custom targeting');
    }
    // Update the offer
    return this.offerModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async removeOffer(id: string) {
    const result = await this.offerModel.findByIdAndDelete(id);
    if (!result) {
      throw new BadRequestException('Offer not found');
    }
    return { success: true, message: 'Offer removed' };
  }

  // Add this method to fetch all offers for a given admin (party_id)
  async getOffersForAdmin(partyId: string): Promise<OfferDocument[]> {
    return this.offerModel.find({ party_id: partyId }).exec();
  }
}
