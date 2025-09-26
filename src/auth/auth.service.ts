import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { RegisteraccessDto } from './dto/registeraccess.dto';

import { UserSecurityGroup } from '../user/schemas/user-security-group.schema';
import { SecurityGroup } from '../security/schemas/security-group.schema';
import { UserSecurityGroupService } from '../user/user-security-group.service';
import { SecurityGroupService } from '../security/security-group.service';
import { SuperAdminService } from '../user/sa.service';
import { AdminService } from '../user/admin.service';
import {Party, PartySchema} from '../user/schemas/party.schema';

@Injectable()   
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly userSecurityGroupService: UserSecurityGroupService, // ✅ INJECT HERE
    private readonly securityGroupService: SecurityGroupService, 
    @InjectModel(UserSecurityGroup.name) private userSecurityGroupModel: Model<UserSecurityGroup>,
    @InjectModel(SecurityGroup.name) private securityGroupModel: Model<SecurityGroup>,
    private readonly userService: UserService,
    private readonly SuperAdminService: SuperAdminService,
    private readonly AdminService: AdminService,
    @InjectModel(Party.name) private readonly partymodel: Model<Party>,
  ) {}
  
  async registeraccessadmin(data: RegisteraccessDto): Promise<User> {
    const userEntry = await this.SuperAdminService.createPreApprovedAdmin(data);
    return userEntry;
    
  }

  async registeraccessretailer(data: RegisteraccessDto): Promise<User> {
    const userEntry = await this.AdminService.createPreApprovedRetailer(data);
    return userEntry;
    
  }

  async register(data: RegisterDto): Promise<User> {
    // 1. Check if email is pre-approved
    const userEntry = await this.userService.findByEmail(data.email);
    if (!userEntry) {
      throw new UnauthorizedException('Email not pre-approved for registration');
    }
    // 4. Hash password
    
    if(data.password !== data.confirmpassword){
      throw new BadRequestException('Passwords do not match');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userid = userEntry.userid;
    const subscription = userEntry.subscription;

    let groupid = 0; 
    if (userid.startsWith("a")) {
      groupid = 2;
    
  } else if (userid.startsWith("r")) {
      groupid = 3;
      
    }
    const lastParty = await this.partymodel
    .findOne({ party_id: { $regex: /^PYT\d+$/ } })
    .sort({ party_id: -1 })
    .exec();

    let newPartyId = 'PYT100'; // default if none exists

    if (lastParty) {
      const lastId = lastParty.party_id;           // e.g., "PYT109"
      const lastNum = parseInt(lastId.replace('PYT', ''), 10); // 109
      const newNum = lastNum + 1;
      newPartyId = `PYT${newNum}`;
    }

    const newparty = new this.partymodel({
      party_id: newPartyId,
      userid: userid,
      party_type: 'supplier',
      store_name: data.store,
      created_at: new Date()
    });

    await newparty.save();


    
    const newusersg = new this.userSecurityGroupModel({
      userid: userEntry.userid,
      groupid: groupid,
      from_date: new Date(),
      thru_date: new Date(Date.now() + subscription * 24 * 60 * 60 * 1000),
    });
    await newusersg.save();
    // 5. Save user
    userEntry.password = hashedPassword;
    userEntry.name = data.name;
    userEntry.phonenumber = data.phonenumber;
    userEntry.city = data.city;
    userEntry.status = 'active';
    userEntry.state = data.state;
    userEntry.zip = data.zip;


    return (await userEntry.save())
    
  }
  
  async validateRetailer(email: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({ email });
    if (!user || !user.password ||!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const userid = user.userid;
    const userSecurityEntry = await this.userSecurityGroupService.findByUserid(userid);
    if (!userSecurityEntry) {
      throw new UnauthorizedException('Not authorized');
    }
    const groupid = userSecurityEntry.groupid;
  
    if (groupid !== 3) {
      throw new UnauthorizedException('Not authorized as Retailer');
    }

    if (user.status !== 'active'){
      throw new UnauthorizedException('Subscription Over, Contact Admin');
    }

    user.lastlogin = new Date();
    await user.save();
    return user;

  }


  async validateAdmin(email: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({ email });
    if (!user || !user.password|| !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const userid = user.userid;
    const userSecurityEntry = await this.userSecurityGroupService.findByUserid(userid);
    if (!userSecurityEntry) {
      throw new UnauthorizedException('Not authorized');
    }
    const groupid = userSecurityEntry.groupid;
  
    if (groupid !== 2) {
      throw new UnauthorizedException('Not authorized as Admin');
    }

    if (user.status !== 'active'){
      throw new UnauthorizedException('Subscription Over, Contact Superadmin');
    }

    user.lastlogin = new Date();
    await user.save();
  
    return user;
  }

  async validateSA(email: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({ email });
    const pass = user?.password;
    if (!user || !pass || !(await bcrypt.compare(password, pass))) {
      const hashedPassword = await bcrypt.hash(password, 10);
      this.logger.log({hashedPassword});
      this.logger.log(pass);
      throw new UnauthorizedException('Invalid credentials');
        
    }
    const userid = user.userid;
    const userSecurityEntry = await this.userSecurityGroupService.findByUserid(userid);
    if (!userSecurityEntry) {
      throw new UnauthorizedException('Not authorized');
    }
    const groupid = userSecurityEntry.groupid;
  
    if (groupid !== 1) {
      throw new UnauthorizedException('Not authorized as Super Admin');
    }

    user.lastlogin = new Date();
    await user.save();
  
    return user;

  }

  async login(user: User): Promise<{ access_token: string }> {
    // Fetch partyid using the user's userid
    const partyid = await this.userService.findpartyidbyuserid(user.userid);
    const payload = { email: user.email, sub: user._id, userid: user.userid, partyid };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
