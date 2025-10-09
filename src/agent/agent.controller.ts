import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadTallyDto } from './dto/upload-tally.dto';

interface JwtUser {
  userid: string;
  email: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /** 1️⃣ Get all pending tasks for agent */
  @Get('pending')
  async getPending(@Req() req: { user: JwtUser }) {
    return this.agentService.getPendingTasks(req.user.userid);
  }

  /** 2️⃣ Get agent's current schedule */
  @Get('schedule')
  async getSchedule(@Req() req: { user: JwtUser }) {
    return this.agentService.getSchedule(req.user.userid);
  }

  /** 3️⃣ Agent uploads tally data (agent → backend) */
  @Post('upload-tally')
  async uploadTally(@Body() body: UploadTallyDto) {
    return this.agentService.uploadTallyData(body);
  }

  /** 4️⃣ Validate agent token (for setup UI) */
  @Get('auth/validate')
  async validateToken(@Req() req: { user: JwtUser }) {
    return this.agentService.validateToken(req.user);
  }

  /** 5️⃣ Get current agent user info */
  @Get('user/me')
  async getMe(@Req() req: { user: JwtUser }) {
    return this.agentService.getUserInfo(req.user.userid);
  }

  /** 6️⃣ Trigger agent to fetch data from Tally - DEPRECATED, use /agent/sync/fetch-tally */
  @Get('legacy-fetch-tally')
  async fetchTallyData(@Query() query) {
    const { token, companyName, port } = query;
    return this.agentService.createFetchTask({ token, companyName, port: Number(port) });
  }
}
