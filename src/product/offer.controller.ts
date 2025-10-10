import { Controller, Post, Body, Get, Query, Delete, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { OfferService } from './offer.service';
import { OfferDocument } from './schemas/offer.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('offer')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  async createOffer(@Body() data: any) {
    const offer = await this.offerService.createOffer(data);
    // Map _id to id for frontend if available
    if (typeof (offer as any).toObject === 'function') {
      const obj = (offer as OfferDocument).toObject();
      return { ...obj, id: obj._id };
    }
    return offer;
  }

  @Get('active')
  async getActiveOffers(@Query('product_id') productId: string) {
    return this.offerService.getActiveOffersForProduct(productId);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  async getOffersForAdmin(@Req() req) {
    const partyId = req.user.partyid;
    const offers = await this.offerService.getOffersForAdmin(partyId);
    // Map _id to id for frontend
    return offers.map((offer) => {
      const obj = (offer as OfferDocument).toObject();
      return { ...obj, id: obj._id };
    });
  }

  @Delete(':id')
  async removeOffer(@Param('id') id: string) {
    return this.offerService.removeOffer(id);
  }

  @Patch(':id')
  async updateOffer(@Param('id') id: string, @Body() data: any) {
    const offer = await this.offerService.updateOffer(id, data);
    if (!offer) return null;
    if (typeof (offer as any).toObject === 'function') {
      const obj = (offer as OfferDocument).toObject();
      return { ...obj, id: obj._id };
    }
    return offer;
  }

  
}