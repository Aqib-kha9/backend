import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Headers, 
  BadRequestException,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReceiveTallyDto } from './dto/receive-tally.dto';

@Controller('agent/sync')
@UsePipes(new ValidationPipe())
export class AgentSyncController {
  constructor(private readonly agentService: AgentService) {}

  /** Register new Agent */
  @Post('register')
  async register(@Body() body: RegisterAgentDto) {
    const { backendUrl, authToken, tallyPort, name, userid } = body;
    
    return this.agentService.registerAgent({
      backendUrl,
      authToken,
      tallyPort,
      name,
      userid,
    });
  }

  /** 🔹 Frontend/Agent triggers FETCH_TALLY task */
  @Get('fetch-tally')
  async createFetch(
    @Headers('authorization') authHeader: string,
    @Query() query: { companyName: string; port: string },
  ) {
    const { companyName, port } = query;
    
    if (!companyName || !port) {
      throw new BadRequestException('Missing required params: companyName, port');
    }

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      throw new BadRequestException('Missing or invalid Authorization header');
    }

    return this.agentService.createFetchTask({
      token,
      companyName,
      port: Number(port),
    } as CreateTaskDto);
  }

  /** 🔄 Agent polls backend for pending tasks */
  @Get('poll-tasks')
  async poll(@Query('tokenHash') tokenHash: string) {
    if (!tokenHash) {
      throw new BadRequestException('tokenHash required');
    }
    return this.agentService.pollTasks(tokenHash);
  }

  /** 📤 Agent sends processed Tally data back to backend */
  @Post('receive-tally')
  async receive(
    @Query('tokenHash') tokenHash: string,
    @Body() body: ReceiveTallyDto,
  ) {
    if (!tokenHash) {
      throw new BadRequestException('tokenHash required');
    }
    return this.agentService.receiveTally(tokenHash, body);
  }

  /** ✅ Additional endpoints for better UX */
  
  /** Get agent info by tokenHash */
  @Get('info')
  async getAgentInfo(@Query('tokenHash') tokenHash: string) {
    if (!tokenHash) {
      throw new BadRequestException('tokenHash required');
    }
    
    // ✅ CHANGE: Service method use karo directly agentModel access ke bajaye
    const agent = await this.agentService.getAgentByTokenHash(tokenHash);
    if (!agent) {
      throw new BadRequestException('Agent not found');
    }
    
    return {
      agentId: agent.agentId,
      name: agent.name,
      port: agent.port,
      userid: agent.userid,
      lastSeen: agent.lastSeen,
    };
  }

  /** Get user's agents */
  @Get('my-agents')
  async getUserAgents(@Query('userid') userid: string) {
    if (!userid) {
      throw new BadRequestException('userid required');
    }
    
    // ✅ CHANGE: Service method use karo
    const agents = await this.agentService.getUserAgents(userid);
    
    return { agents };
  }
}