import { Controller, Get, Headers, Put, UseGuards, Body, UnauthorizedException, NotFoundException, Post, Req, UseInterceptors, UploadedFile, BadRequestException, Query, Delete, Param, Patch } from "@nestjs/common";
import { User } from "./schemas/user.schema"
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AdminService } from "./admin.service";
import { AuthGuard } from '@nestjs/passport';
import { Request } from "express";
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CategoryService } from './category.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { Wallpaper } from './schemas/wallpaper.schema';
import * as fs from 'fs';
import { Retailerfield } from './schemas/retailerfields.schema';
import { Party } from "./schemas/party.schema";


@Controller('/retailer')
export class RetailerController {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Party.name) private partyModel: Model<Party>,
        @InjectModel(Wallpaper.name) private wallpaperModel: Model<Wallpaper>,
        private readonly categoryService: CategoryService,
    ) {}

@Get('/profile')  
@UseGuards(JwtAuthGuard)
async getProfile(@Req() req) {
    const user = await this.userModel.findOne({ userid: req.user.userid }).select('name userid email phonenumber city state zip subscription subscription_update adminid');
    const party = await this.partyModel.findOne({ userid: req.user.userid });
        if (party) {
            const store_name= party.store_name
            return { user, store_name };
        }
        return { user };
}

@Patch('/profile')
@UseGuards(JwtAuthGuard)
async updateProfile(@Req() req, @Body() body) {
    const user = await this.userModel.findOne({ userid: req.user.userid });
    if (!user) {
        throw new NotFoundException('User not found');
    }
    user.name = body.name;
    user.email = body.email;
    user.phonenumber = body.phonenumber;
    user.city = body.city;
    user.state = body.state;
    user.zip = body.zip;
    await user.save();

    const party = await this.partyModel.findOne({ userid: req.user.userid });
    if (party) {
        party.store_name = body.storename;
        await party.save();
    }
    return { user, party };
}


@Post('custom-categories')
@UseGuards(JwtAuthGuard)
async saveCustomCategories(@Req() req, @Body() body) {
  // body: { categories: [{ name: string, productIds: string[] }] }
  return this.categoryService.saveUserCategories(req.user.userid, body.categories);
}

@Get('custom-categories')
@UseGuards(JwtAuthGuard)
async getCustomCategories(@Req() req) {
  return this.categoryService.getUserCategories(req.user.userid);
}

@Delete('custom-categories')
@UseGuards(JwtAuthGuard)
async deleteCustomCategories(@Req() req, @Body() body) {
  return this.categoryService.deleteUserCategories(req.user.userid, body.name);
}



@Get('wallpaper')
@UseGuards(JwtAuthGuard)
async getWallpaper(@Req() req, @Query('device') device: 'desktop' | 'mobile') {
const user = await this.userModel.findOne({ userid: req.user.userid });
if (!user) {
    throw new NotFoundException('User not found');
}
const doc = await this.wallpaperModel.findOne({ userid: user.adminid });
if (!doc) return { url: null };
const found = doc.images.find(img => img.type === 'wallpaper' && img.device === device);
return { url: found ? found.url : null };
}

@Get('banner')
@UseGuards(JwtAuthGuard)
async getBanner(@Req() req, @Query('device') device: 'desktop' | 'mobile') {
const user = await this.userModel.findOne({ userid: req.user.userid });
if (!user) {
    throw new NotFoundException('User not found');
}
const doc = await this.wallpaperModel.findOne({ userid: user.adminid });
if (!doc) return { url: null };
const found = doc.images.find(img => img.type === 'banner' && img.device === device);
return { url: found ? found.url : null };
}


}