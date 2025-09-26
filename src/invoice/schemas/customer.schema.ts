import mongoose, { Schema } from 'mongoose';

const CustomerSchema = new Schema({
  // Buyer Info
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  gstin: { type: String },
  email: { type: String },
  // Shipping Info
  shipping_address: { type: String },
  shippingto: { type: String },
  courier: { type: String },
  trackingNo: { type: String },
  party_id: { type: String },
  customerid: { type: String, unique: true, required: true }
});

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
