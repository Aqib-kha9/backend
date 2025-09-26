import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { RegisteraccessDto } from './dto/registeraccess.dto';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('registeraccessadmin')
  async registeraccessadmin(@Body() body: RegisteraccessDto) {
    return this.authService.registeraccessadmin(body);
  }

  @Post('registeraccessretailer')
  async registeraccessretailer(@Body() body: RegisteraccessDto) {
    return this.authService.registeraccessretailer(body);
  }

  @Post('loginAdmin')
  async loginAdmin(@Body() body: any) {
    const user = await this.authService.validateAdmin(body.email, body.password);
    return this.authService.login(user);
  }
  @Post('loginRetailer')
  async loginRetailer(@Body() body: any) {
    const user = await this.authService.validateRetailer(body.email, body.password);
    return this.authService.login(user);
  }
  @Post('loginSA')
  async loginSA(@Body() body: any) {
    const user = await this.authService.validateSA(body.email, body.password);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
