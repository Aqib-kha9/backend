import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSecurityGroup } from './schemas/user-security-group.schema';
import { User } from './schemas/user.schema';
import { Product } from 'src/product/schemas/product.schema';
import { UserService } from './user.service';
import axios, { isAxiosError } from 'axios';
import { parseStringPromise } from 'xml2js';
import { Inventory } from 'src/product/schemas/inventory.schema';
import { TallyCompany } from './schemas/user.schema';

/**
 * Top-level helper types (must be outside the class)
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
  [k: string]: any;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(UserSecurityGroup.name)
    private userSecurityGroupModel: Model<UserSecurityGroup>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Inventory.name) private inventoryModel: Model<Inventory>,
    private readonly UserService: UserService,
  ) {}

  /* ----------------------- Company + Mapping ----------------------- */

  async saveCompany(userId: string, companyName: string) {
    const user = await this.userModel.findOne({ userid: userId });
    if (!user) throw new NotFoundException('User not found');

    if (!Array.isArray(user.tallyCompanies)) user.tallyCompanies = [];

    const companyExists = user.tallyCompanies.some(
      (c) => c.name === companyName,
    );
    if (companyExists) {
      throw new BadRequestException(
        `"${companyName}" Company already exists for this user`,
      );
    }

    const lastNumber = user.tallyCompanies.length
      ? Math.max(...user.tallyCompanies.map((c) => c.number))
      : 0;

    const newCompany: TallyCompany = {
      name: companyName,
      number: lastNumber + 1,
    };
    user.tallyCompanies.push(newCompany);

    await user.save();

    return {
      success: true,
      message: `Company "${companyName}" saved successfully`,
    };
  }

  async saveTallyMapping(
    userId: string,
    newfieldMapping: { [key: string]: string },
  ) {
    if (!newfieldMapping || Object.keys(newfieldMapping).length === 0) {
      throw new BadRequestException(
        'Field mapping is empty. Please provide at least one mapped field.',
      );
    }
    const user = await this.userModel.findOne({ userid: userId });
    if (!user)
      throw new NotFoundException('User not found. Please log in again.');

    const existingMapping = user.tallyFieldMapping || {};
    user.tallyFieldMapping = { ...existingMapping, ...newfieldMapping };
    await user.save();

    return { success: true, message: 'Field mapping saved successfully.' };
  }

  async getTallyMapping(userId: string) {
    const user = await this.userModel.findOne({ userid: userId });
    return { fieldMapping: user?.tallyFieldMapping || {} };
  }

  /* ----------------------- Helpers ----------------------- */

  private normalize(field: string): string {
    return field?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  private _cleanTallyString = (value: any): string =>
    String(value ?? '')
      .replace(/\u0004/g, '')
      .trim();

  private _buildCompanyRequestXML(): string {
    return `
  <ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Export</TALLYREQUEST>
      <TYPE>Collection</TYPE>
      <ID>List of Companies</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
        <TDL>
          <TDLMESSAGE>
            <COLLECTION NAME="List of Companies">
              <TYPE>Company</TYPE>
              <FETCH>NAME, STARTINGFROM, ENDINGAT, MAILINGNAME, ADDRESS, STATENAME, COUNTRY, PINCODE, PHONE</FETCH>
            </COLLECTION>
          </TDLMESSAGE>
        </TDL>
      </DESC>
    </BODY>
  </ENVELOPE>
  `;
  }

  private _buildStockItemRequestXML(): string {
    return `
  <ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Export</TALLYREQUEST>
      <TYPE>Collection</TYPE>
      <ID>Stock Items</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
        <TDL>
          <TDLMESSAGE>
            <COLLECTION NAME="Stock Items">
              <TYPE>StockItem</TYPE>
              <FETCH>
                GUID,
                NAME,
                PARENT,
                BASEUNITS,
                OPENINGBALANCE,
                OPENINGVALUE,
                STANDARDCOST,
                HSN,
                GSTAPPLICABLE,
                USERDEFINEDFIELDLIST
              </FETCH>
            </COLLECTION>
          </TDLMESSAGE>
        </TDL>
      </DESC>
    </BODY>
  </ENVELOPE>
  `;
  }

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

    /* ----------------------- Mapper ----------------------- */
  private _processTallyItem(
    tallyItem: TallyStockItem,
    context: { party_id: string; fieldMapping: Record<string, string> },
  ) {
    const { party_id } = context;
    const item = tallyItem;

    const guid = this._extractTallyValue(item, ['GUID', '$GUID', 'GUID._']);
    const name = this._extractTallyValue(item, [
      'NAME',
      '$NAME',
      'LANGUAGENAME.LIST',
    ]);
    const sku = guid || name;

    if (!sku) return null; // fail-safe for missing SKU

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
      'OPENINGVALUE',
    ]);
    const price = priceRaw ? parseFloat(priceRaw.replace(/[^0-9.-]+/g, '')) : 0;

    const parent = this._extractTallyValue(item, ['PARENT', 'PARENT._']);
    const hsn = this._extractTallyValue(item, ['HSN']);
    const gst = this._extractTallyValue(item, ['GSTAPPLICABLE']);

    const product: ProductDoc = {
      sku: this._cleanTallyString(sku),
      name: name || undefined,
      base_unit: baseUnit || undefined,
      price,
      opening_balance: openingBalance,
      opening_value: openingValue,
      party_id,
      parent,
      hsn,
      gst,
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
/* ----------------------- Product ID Counter (Safe) ----------------------- */
private async _peekNextProductId(): Promise<string> {
  const counters = this.productModel.db.collection<CounterDoc>('counters');
  let doc = await counters.findOne({ _id: 'productid' } as any);

  if (!doc?.seq) {
    // Initialize counter if missing
    await counters.updateOne(
      { _id: 'productid' } as any,
      { $set: { seq: 1000, createdAt: new Date() } },
      { upsert: true },
    );
    doc = await counters.findOne({ _id: 'productid' } as any);
  }

  return `PRD${doc!.seq}`;
}

private async _incrementProductId(): Promise<void> {
  const counters = this.productModel.db.collection<CounterDoc>('counters');
  await counters.updateOne(
    { _id: 'productid' } as any,
    { $inc: { seq: 1 } },
    { upsert: true },
  );
}

/* ----------------------- Main Sync ----------------------- */
async syncTallyProducts(
  userId: string,
  dto: { port: string; companyName: string; fieldMapping: { [k: string]: string } },
): Promise<SyncResult> {
  const { port, companyName: expectedCompanyName, fieldMapping: requestMapping } = dto;

  const user = await this.userModel.findOne({ userid: userId }).lean().exec();
  if (!user) throw new NotFoundException('User not found.');

  const party_id = await this.UserService.findpartyidbyuserid(userId);
  const finalMapping = { ...user.tallyFieldMapping, ...requestMapping };
  const tallyUrl = `http://localhost:${port}`;

  // Validate company
  this.logger.log(`Step 1/2: Validating company for user ${userId} on port ${port}`);
  try {
    const companyRequestXML = this._buildCompanyRequestXML();
    const companyResponse = await axios.post(tallyUrl, companyRequestXML, { timeout: 15000 });
    const companyResult = await parseStringPromise(companyResponse.data, { explicitArray: false, trim: true });
    const companyFromTally = this._cleanTallyString(
      companyResult?.ENVELOPE?.BODY?.DATA?.COLLECTION?.COMPANY?.$?.NAME
    );

    if (!companyFromTally) throw new BadRequestException('Could not identify active company from Tally.');
    if (companyFromTally.toLowerCase() !== this._cleanTallyString(expectedCompanyName).toLowerCase())
      throw new BadRequestException(`Company Mismatch. Expected "${expectedCompanyName}" but Tally is active with "${companyFromTally}".`);

    this.logger.log(`Company validation successful. Found "${companyFromTally}".`);
  } catch (err) {
    if (isAxiosError(err)) throw new BadRequestException(`Could not connect to Tally on port ${port} to verify company.`);
    throw err;
  }

  // Fetch stock items
  this.logger.log(`Step 2/2: Fetching product data for user ${userId}`);
  const stockItemRequestXML = this._buildStockItemRequestXML();
  const stockItemResponse = await axios.post(tallyUrl, stockItemRequestXML, { timeout: 60000 });
  const stockItemResult = await parseStringPromise(stockItemResponse.data, { explicitArray: false, trim: true });
  const collection = stockItemResult?.ENVELOPE?.BODY?.DATA?.COLLECTION;

  if (!collection || !collection.STOCKITEM)
    return { success: true, message: 'Sync complete: Company validated, but no stock items found.' };

  const stockItems: TallyStockItem[] = Array.isArray(collection.STOCKITEM) ? collection.STOCKITEM : [collection.STOCKITEM];
  const allSkus = stockItems.map((si) => this._cleanTallyString(si.$?.GUID ?? si.$?.NAME ?? '')).filter(Boolean);

  //Fetch existing products from DB
  const existingProducts = await this.productModel.find({ sku: { $in: allSkus } }).select('sku product_id').lean();
  const skuToProductIdMap = new Map(existingProducts.map((p: any) => [p.sku, p.product_id]));

  // Process stock items
  for (const tallyItem of stockItems) {
    try {
      const processed = this._processTallyItem(tallyItem, { party_id, fieldMapping: finalMapping });
      if (!processed) continue;

      const { product, inventories } = processed;

      let productId = skuToProductIdMap.get(product.sku);
      if (!productId) {
        // Peek current counter
        productId = await this._peekNextProductId();
        product.product_id = productId;

        // Try inserting product
        const inserted = await this.productModel.updateOne(
          { sku: product.sku },
          { $setOnInsert: product },
          { upsert: true },
        );

        // Increment only if insert happened
        if (inserted.upsertedCount > 0) await this._incrementProductId();
        skuToProductIdMap.set(product.sku, productId);
      } else {
        product.product_id = productId;
      }

      // Prepare inventory ops
      for (const inv of inventories) {
        const invDoc: InventoryDoc = { ...inv, product_id: product.product_id, party_id: inv.party_id || party_id };
        await this.inventoryModel.updateOne(
          { product_id: invDoc.product_id, party_id: invDoc.party_id },
          { $set: invDoc },
          { upsert: true },
        );
      }
    } catch (err: any) {
      this.logger.warn(`Skipping item due to processing error: ${err?.message || err}`, { item: tallyItem });
    }
  }

  return { success: true, message: `Sync completed successfully. Processed ${skuToProductIdMap.size} products.` };
}


  /* ----------------------- your existing methods unchanged ----------------------- */
  async createPreApprovedRetailer(data: {
    email: string;
    id: string;
    subscription: number;
  }): Promise<User> {
    const latestUser = await this.userModel
      .find({ userid: { $regex: /^r\d+$/ } })
      .sort({ userid: -1 })
      .limit(1)
      .exec();

    let nextIdNumber = 101;
    if (latestUser.length > 0) {
      const lastId = parseInt(latestUser[0].userid.slice(1));
      if (!isNaN(lastId)) nextIdNumber = lastId + 1;
    }

    const userid = `r${nextIdNumber}`;
    const user = await this.userModel.findById(data.id); // MongoDB _id
    if (!user) throw new NotFoundException('User not found');
    const adminid = user.userid;

    const newEntry = new this.userModel({
      email: data.email,
      created_stamp: new Date(),
      subscription_update: new Date(),
      userid,
      adminid,
      status: 'preapproved',
      subscription: data.subscription,
    });

    return newEntry.save();
  }

  async toggleRetailerStatus(
    UserId: string,
    AdminId: string,
    newStatus: string,
  ): Promise<{ message: string }> {
    const Admin = await this.userModel.findById(AdminId);
    if (!Admin || !Admin.userid.startsWith('a')) {
      throw new UnauthorizedException('Only Admins can toggle admin status');
    }

    const retailer = await this.userModel.findOne({ userid: UserId });
    if (!retailer) throw new NotFoundException('Admin not found');

    if (newStatus === 'active' && !retailer.phonenumber) {
      retailer.status = 'preapproved';
      newStatus = 'preapproved';
    } else {
      retailer.status = newStatus;
    }
    await retailer.save();

    return { message: `Status updated to ${newStatus}` };
  }

  async getAnalytics(data: { id: string }): Promise<any> {
    const user = await this.userModel.findById(data.id);
    if (!user) throw new NotFoundException('User not found');
    const adminid = user.userid;
    const partyid = await this.UserService.findpartyidbyuserid(adminid);

    const allretailer = await this.userModel
      .find({ userid: { $regex: /^r/ }, adminid })
      .select(
        'name city state zip lastlogin userid created_stamp status subscription subscription_update',
      );

    const products = await this.productModel.countDocuments({
      party_id: partyid,
    });

    const activereatailerCount = await this.userModel.countDocuments({
      userid: { $regex: /^r/ },
      status: 'active',
      adminid,
    });

    return { allretailer, products, activereatailerCount };
  }

  async updateRetailerSubscription(
    userid: string,
    days: number,
    action: 'StartNew' | 'HandleDays',
    adminId: string,
    handleDaysType?: 'increase' | 'decrease',
  ): Promise<{ message: string; newSubscription: number }> {
    // console.log(userid, days, action, adminId, handleDaysType);
    // Validate superadmin
    const Admin = await this.userModel.findById(adminId);
    if (!Admin || !Admin.userid.startsWith('a')) {
      throw new UnauthorizedException('Only Admins can update subscription');
    }
    // Find the admin to update
    const admin = await this.userModel.findOne({ userid });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    // Optional: prevent superadmins from modifying themselves
    if (userid === adminId) {
      throw new BadRequestException('You cannot modify your own subscription');
    }
    // Update subscription logic
    if (action === 'StartNew') {
      admin.subscription = days;
      admin.subscription_update = new Date();
    } else if (action === 'HandleDays') {
      if (handleDaysType === 'increase') {
        admin.subscription = (admin.subscription || 0) + days;
      } else if (handleDaysType === 'decrease') {
        admin.subscription = Math.max(0, (admin.subscription || 0) - days);
      }
      // Do not update subscription_update date for HandleDays
    }
    await admin.save();
    return {
      message: `Subscription updated`,
      newSubscription: admin.subscription,
    };
  }
}
