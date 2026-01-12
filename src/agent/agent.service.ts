import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UploadTallyDto } from './dto/upload-tally.dto';
import { ScheduleDto } from './dto/schedule.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReceiveTallyDto } from './dto/receive-tally.dto';
import { User } from '../user/schemas/user.schema';
import { Inventory } from '../product/schemas/inventory.schema';
import { Product } from '../product/schemas/product.schema';
import { PendingTask } from './schemas/pending-task.schema';
import { Agent } from './schemas/agent.schema';
import { Task } from './schemas/task.schema';
import { TallyData } from './schemas/tallydata.schema';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { signPayload } from '../security/hmac.util';
import { parseStringPromise } from 'xml2js';
import { Party } from '../user/schemas/party.schema';

/**
 * Top-level helper types (same as AdminService)
 */
type TallyStockItem = Record<string, any>;

interface SyncResult {
  success: boolean;
  message: string;
}

interface CounterDoc {
  _id: string;
  seq: number;
  createdAt?: Date;
}

interface InventoryDoc {
  product_id?: string;
  party_id: string;
  quantity: number;
  batch_no?: string;
  updated_at?: Date;
  [k: string]: any;
}

interface ProductDoc {
  product_id?: string;
  sku?: string;
  name?: string;
  base_unit?: string;
  price?: number;
  opening_balance?: number;
  opening_value?: number;
  party_id?: string;
  parent?: string;
  hsn?: string;
  gst?: string;
  [k: string]: any;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  // Normalization helper
  private _normalizeString(str: string): string {
    return (str || '')
      .replace(/\u00A0/g, ' ') // Replace non-breaking space with normal space
      .replace(/\s+/g, ' ')    // Collapse multiple spaces
      .trim()
      .toLowerCase();
  }

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Party.name) private readonly partyModel: Model<Party>,
    @InjectModel(PendingTask.name) private readonly taskModel: Model<PendingTask>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(Agent.name) public readonly agentModel: Model<Agent>, // ✅ CHANGE: private se public karo
    @InjectModel(Task.name) private readonly agentTaskModel: Model<Task>,
    @InjectModel(TallyData.name) private readonly tallyDataModel: Model<TallyData>,
  ) {}

  /* ----------------------- Helper Methods (same as AdminService) ----------------------- */

  private _cleanTallyString = (value: any): string =>
    String(value ?? '')
      .replace(/\u0004/g, '')
      .trim();

  private _extractTallyValue(
    item: any,
    possibleKeys: string[],
  ): string | undefined {
    for (const k of possibleKeys) {
      if (!k) continue;

      if (k.startsWith('$')) {
        const attr = k.slice(1);
        const val = item.$?.[attr];
        if (val !== undefined) return this._cleanTallyString(val);
      }

      if (item[k] !== undefined) {
        const v =
          typeof item[k] === 'object' && item[k]._ !== undefined
            ? item[k]._
            : item[k];
        if (v !== undefined) return this._cleanTallyString(v);
      }

      const nested = Object.keys(item).find((x) =>
        x.toUpperCase().includes(k.toUpperCase()),
      );
      if (nested && item[nested]) {
        const nestedNode = item[nested];
        if (nestedNode['NAME.LIST']?.NAME)
          return this._cleanTallyString(nestedNode['NAME.LIST'].NAME);
        if (nestedNode.NAME) return this._cleanTallyString(nestedNode.NAME);
      }

      const udfVal = item[`UDF:${k}`] ?? item[`UDF${k}`];
      if (udfVal) return this._cleanTallyString(udfVal);
    }
    return undefined;
  }

  private _processTallyItem(
    tallyItem: TallyStockItem,
    context: { party_id: string; fieldMapping: Record<string, string> },
  ) {
    const { party_id } = context;
    const item = tallyItem;

    // 1. GUID & Name
    const guid = this._extractTallyValue(item, ['GUID', '$GUID', 'GUID._']);
    const nameRaw = this._extractTallyValue(item, [
      'NAME',
      '$NAME',
      'LANGUAGENAME.LIST',
    ]);
    
    // Normalize Name
    const name = nameRaw ? this._cleanTallyString(nameRaw) : undefined;
    
    // 2. SKU Generation: Prefer Name -> GUID
    // The user specifically wants readable SKUs ("Iphone" -> "Iphone", not "852f...")
    let sku = name; 
    if (!sku && guid) sku = guid; // Fallback if name is somehow missing
    if (!sku) return null; // fail-safe

    const baseUnit = this._extractTallyValue(item, [
      'BASEUNITS',
      'BASEUNITS._',
    ]);
    const openingBalanceRaw = this._extractTallyValue(item, ['OPENINGBALANCE']);
    const openingBalance = openingBalanceRaw
      ? parseFloat((openingBalanceRaw.match(/[\d.]+/) || ['0'])[0])
      : 0;

    const openingValueRaw = this._extractTallyValue(item, [
      'OPENINGVALUE',
      'OPENINGRATE',
      'STANDARDCOST',
    ]);
    const openingValue = openingValueRaw
      ? parseFloat(openingValueRaw.replace(/[^0-9.-]+/g, ''))
      : 0;

    const priceRaw = this._extractTallyValue(item, [
      'STANDARDCOST',
      'OPENINGVALUE', // Fallback to opening value if std cost missing
    ]);
    const price = priceRaw ? parseFloat(priceRaw.replace(/[^0-9.-]+/g, '')) : 0;

    // 3. Category & Brand from PARENT
    const parentRaw = this._extractTallyValue(item, ['PARENT', 'PARENT._']);
    const parent = parentRaw ? this._cleanTallyString(parentRaw) : 'Uncategorized';
    
    // Tally doesn't have "Brand", so we use Parent (Stock Group) as Brand too, 
    // or "Generic" if it's top-level.
    const brand = parent !== 'Uncategorized' ? parent : 'Generic';

    const hsn = this._extractTallyValue(item, ['HSN']);
    const gst = this._extractTallyValue(item, ['GSTAPPLICABLE']);
    const description = this._extractTallyValue(item, ['DESCRIPTION', 'DESC']);

    // 4. Attributes - Capture everything else
    const attributes = {
      hsn,
      gst,
      guid, // Keep GUID in attributes for reference
      parent_group: parent,
      base_unit: baseUnit,
    };

    const product: ProductDoc = {
      sku: sku, // Readable SKU
      name: name || sku,
      base_unit: baseUnit,
      price: price || openingValue, // Use opening value if price is 0
      opening_balance: openingBalance,
      opening_value: openingValue,
      party_id,
      parent, // Kept for backward compat if needed
      category: parent, // ✅ Mapped to Category
      brand: brand,     // ✅ Mapped to Brand
      hsn,
      gst,
      attributes,       // ✅ Store extra data
      short_description: description, // if Tally provides it
    };

    const inventories: InventoryDoc[] = [
      {
        party_id,
        quantity: openingBalance,
        batch_no: 'default',
        updated_at: new Date(),
      },
    ];

    return { product, inventories };
  }



  /* ----------------------- Main Tally Processing ----------------------- */
  async processTallyData(
    userId: string,
    companyName: string,
    xmlData: string,
  ): Promise<SyncResult> {
    try {
      this.logger.log(`Processing Tally data for user ${userId}, company: ${companyName}`);

      const user = await this.userModel.findOne({ userid: userId }).lean().exec();
      if (!user) throw new NotFoundException('User not found.');

      const party = await this.partyModel.findOne({ userid: userId }).lean().exec();
      if (!party) throw new BadRequestException(`Party not found for user ${userId}`);

      const party_id = party.party_id;
      const fieldMapping = (user as any).tallyFieldMapping || {};

      const parsedData = await parseStringPromise(xmlData, { 
        explicitArray: false, 
        trim: true 
      });

      const collection = parsedData?.ENVELOPE?.BODY?.DATA?.COLLECTION;
      if (!collection || !collection.STOCKITEM) {
        return { success: true, message: 'Sync complete: No stock items found.' };
      }

      const stockItems: TallyStockItem[] = Array.isArray(collection.STOCKITEM) 
        ? collection.STOCKITEM 
        : [collection.STOCKITEM];

      const allSkus = stockItems.map((si) => 
        this._cleanTallyString(si.$?.GUID ?? si.$?.NAME ?? '')
      ).filter(Boolean);

      // Fetch existing products
      const existingProducts = await this.productModel.find({ 
        sku: { $in: allSkus },
        party_id // Scope to this party
      }).select('sku product_id').lean();
      
      const skuToProductIdMap = new Map(existingProducts.map((p: any) => [p.sku, p.product_id]));

      const productOps: any[] = [];
      const inventoryOps: any[] = [];
      const itemsToProcess: { product: ProductDoc, inventories: InventoryDoc[] }[] = [];
      const newSkus: string[] = [];

      // 1. First pass: Process items and identify new ones
      for (const tallyItem of stockItems) {
        const processed = this._processTallyItem(tallyItem, { party_id, fieldMapping });
        if (!processed) continue;

        if (!skuToProductIdMap.has(processed.product.sku!)) {
          newSkus.push(processed.product.sku!);
        }
        itemsToProcess.push(processed);
      }

      // 2. Bulk ID generation for new items
      if (newSkus.length > 0) {
        const counters = this.productModel.db.collection<CounterDoc>('counters');
        const counterDoc: any = await counters.findOneAndUpdate(
          { _id: 'productid' } as any,
          { $inc: { seq: newSkus.length } },
          { upsert: true, returnDocument: 'before' }
        );
        
        // Handle different MongoDB driver return structures
        const resultDoc = counterDoc?.value || counterDoc;
        let startSeq = resultDoc?.seq ?? 1000;
        
        if (!resultDoc?.seq) {
           const fresh = await counters.findOne({ _id: 'productid' } as any);
           startSeq = (fresh?.seq || 1000) - newSkus.length;
        }

        for (let i = 0; i < newSkus.length; i++) {
          skuToProductIdMap.set(newSkus[i], `PRD${startSeq + i}`);
        }
      }

      // 3. Second pass: Build bulk ops
      for (const item of itemsToProcess) {
        const productId = skuToProductIdMap.get(item.product.sku!);
        if (!productId) continue;

        item.product.product_id = productId;
        productOps.push({
          updateOne: {
            filter: { sku: item.product.sku!, party_id },
            update: { $set: item.product },
            upsert: true
          }
        });

        for (const inv of item.inventories) {
          inventoryOps.push({
            updateOne: {
              filter: { product_id: productId, party_id: inv.party_id || party_id },
              update: { $set: { ...inv, product_id: productId, party_id: inv.party_id || party_id } },
              upsert: true
            }
          });
        }
      }

      // 4. Execute Bulk Writes
      if (productOps.length > 0) await this.productModel.bulkWrite(productOps);
      if (inventoryOps.length > 0) await this.inventoryModel.bulkWrite(inventoryOps);

      return { 
        success: true, 
        message: `Sync successful. Processed ${itemsToProcess.length} items. New: ${newSkus.length}` 
      };

    } catch (error: any) {
      this.logger.error(`Sync failed: ${error.message}`);
      return { success: false, message: `Sync failed: ${error.message}` };
    }
  }


  /* ----------------------- Updated receiveTally Method ----------------------- */
  /* ----------------------- Updated receiveTally Method ----------------------- */
  async receiveTally(tokenHash: string, dto: ReceiveTallyDto) {
    const agent = await this.agentModel.findOne({ tokenHash }).lean();
    if (!agent) throw new UnauthorizedException('Invalid token');
  
    const task = await this.agentTaskModel.findOne({ requestId: dto.requestId });
    if (!task || task.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Invalid or inactive requestId');
    }

    if (dto.error) {
      task.status = 'FAILED';
      task.error = dto.error;
      await task.save();
      this.logger.warn(`Agent reported error for task ${dto.requestId}: ${dto.error}`);
      return { success: true, message: 'Error reported successfully' };
    }
  
    // Company name case-insensitive match with aggressive normalization
    const expectedRaw = task.payload?.companyName || '';
    const actualRaw = dto.companyName;

    const expectedNormalized = this._normalizeString(expectedRaw);
    const actualNormalized = this._normalizeString(actualRaw);

    if (expectedNormalized !== actualNormalized) {
      const errorMsg = `Company name mismatch. Expected "${expectedRaw}", Got "${actualRaw}" (Normalized: "${expectedNormalized}" vs "${actualNormalized}")`;
      task.status = 'FAILED';
      task.error = errorMsg;
      await task.save();
      this.logger.error(`ReceiveTally Failed: ${errorMsg}`);
      throw new BadRequestException(errorMsg);
    }
  
    // ✅ Ab userid directly agent se mil jayega
    const userId = agent.userid;
  
    // Process Tally data directly to products and inventory
    const processResult = await this.processTallyData(
      userId,
      dto.companyName,
      dto.data.xml
    );
  
    if (!processResult.success) {
      task.status = 'FAILED';
      task.error = processResult.message;
      await task.save();
      throw new BadRequestException(processResult.message);
    }
  
    // Optional: Also save raw data for backup
    await new this.tallyDataModel({
      requestId: dto.requestId,
      companyName: dto.companyName,
      data: dto.data,
      timestamp: dto.timestamp,
      agentId: agent.agentId,
    }).save();
  
    // ✅ CHANGE: Task document mein result field ko properly handle karo
    await this.agentTaskModel.updateOne(
      { _id: task._id },
      { 
        status: 'COMPLETED',
        result: processResult.message // ✅ Yeh ab work karega
      }
    );
  
    return { 
      success: true, 
      message: processResult.message 
    };
  }


  /* ----------------------- Your Existing Methods ----------------------- */
  async getPendingTasks(userid: string) {
    return this.taskModel.find({ userid, status: 'pending' }).lean();
  }

  async getSchedule(userid: string) {
    const lastSync = await this.taskModel
      .find({ userid, type: 'tally-sync' })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean<{ updatedAt?: Date }>();

    return {
      userid,
      lastSync: lastSync[0]?.updatedAt || null,
      interval: 30,
    } as ScheduleDto;
  }

  async uploadTallyData(body: UploadTallyDto) {
    const { userid, companyName, products } = body;
    if (!products || products.length === 0) {
      throw new NotFoundException('No products to upload');
    }

    const processedProducts: string[] = [];

    for (const item of products as any[]) {
      const existing = await this.productModel.findOne({ sku: item.sku, userid });
      if (existing) {
        await this.productModel.updateOne({ _id: existing._id }, { $set: item });
      } else {
        const newProduct = new this.productModel({ ...item, userid, companyName });
        await newProduct.save();
      }
      processedProducts.push(item.sku);
    }

    return {
      success: true,
      uploaded: processedProducts.length,
      skus: processedProducts,
    };
  }

  async validateToken(user: any) {
    return {
      valid: true,
      user: {
        userid: user.userid,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getUserInfo(userid: string) {
    const user = await this.userModel.findOne({ userid }).select('-password').lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async registerAgent(payload: {
    backendUrl: string;
    authToken: string;
    tallyPort: number;
    name?: string;
    userid: string;
  }) {
    const { backendUrl, authToken, tallyPort, name, userid } = payload;
  
    if (!backendUrl || !authToken) {
      throw new BadRequestException('backendUrl and authToken are required');
    }
  
    if (tallyPort < 9000 || tallyPort > 10000) {
      throw new BadRequestException('Invalid Tally port range');
    }
  
    const tokenHash = crypto.createHash('sha256').update(authToken).digest('hex');
    const existing = await this.agentModel.findOne({ tokenHash }).lean();
  
    if (existing) {
      return { agentId: existing.agentId, backendUrl };
    }
  
    const agentId = uuidv4();
    const agent = new this.agentModel({
      agentId,
      name,
      tokenHash,
      port: tallyPort,
      userid,
      lastSeen: new Date(),
    });
  
    await agent.save();
  
    return { agentId, backendUrl };
  }

  async createFetchTask(dto: CreateTaskDto) {
    const { token, companyName, port } = dto;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const agent = await this.agentModel.findOne({ tokenHash }).lean();
    if (!agent) throw new UnauthorizedException('Invalid token');

    if (port < 9000 || port > 10000) {
      throw new BadRequestException('Invalid port number');
    }

    const requestId = uuidv4();
    const action = 'FETCH_TALLY';
    const payload = { companyName, port };

    await new this.agentTaskModel({
      requestId,
      agentId: agent.agentId,
      action,
      payload,
      status: 'PENDING',
    }).save();

    const secret = process.env.AGENT_HMAC_SECRET || 'default-secret';
    const command = { requestId, action, payload };
    const signature = signPayload(command, secret);

    return {
      success: true,
      requestId,
      command: { ...command, signature },
    };
  }

  async pollTasks(tokenHash: string) {
    const agent = await this.agentModel.findOne({ tokenHash }).lean();
    if (!agent) throw new UnauthorizedException('Invalid token');

    const task = await this.agentTaskModel
      .findOne({ agentId: agent.agentId, status: 'PENDING' })
      .sort({ createdAt: 1 });

    if (!task) return { task: null };

    task.status = 'IN_PROGRESS';
    await task.save();

    const secret = process.env.AGENT_HMAC_SECRET || 'default-secret';
    const payload = {
      requestId: task.requestId,
      action: task.action,
      payload: task.payload,
    };
    const signature = signPayload(payload, secret);

    return { task: { ...payload, signature } };
  }

  // ✅ ADD: New methods for controller access
  async getAgentByTokenHash(tokenHash: string) {
    return this.agentModel.findOne({ tokenHash }).lean();
  }

  async getUserAgents(userid: string) {
    return this.agentModel
      .find({ userid })
      .select('agentId name port lastSeen')
      .sort({ lastSeen: -1 })
      .lean();
  }

  
}