// dto/upload-tally.dto.ts
export class UploadTallyDto {
  userid: string;
  companyName: string;
  products: any[]; // Array of products from Tally
}