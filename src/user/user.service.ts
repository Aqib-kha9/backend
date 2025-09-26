import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { Party } from './schemas/party.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(@InjectModel(User.name) private userModel: Model<User>,
  @InjectModel(Party.name) private partyModel : Model<Party>){}

  async findAll(): Promise<User[]> {
    const users = await this.userModel.find().exec();
    return users;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async finduseridbydocumentid (docid: string):Promise<string> {
    const user = await this.userModel.findById(docid);
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    return user.userid;
  }

  async findpartyidbyuserid(userid: string): Promise<string> {
    const party = await this.partyModel.findOne({ userid }).exec();
    if (!party) {
      throw new NotFoundException(`Party not found for user ${userid}`);
    }
    return party.party_id;
  }

  async findpartybyuserid(userid: string): Promise<Party> {
    const party = await this.partyModel.findOne({ userid }).exec();
    if (!party) {
      throw new NotFoundException(`Party not found for user ${userid}`);
    }
    return party;
  }


}
