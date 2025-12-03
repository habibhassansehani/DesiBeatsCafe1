import mongoose, { Schema, Document } from "mongoose";

// User Model
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  password: string;
  name: string;
  role: "admin" | "cashier" | "waiter" | "kitchen";
  isActive: boolean;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "cashier", "waiter", "kitchen"], default: "cashier" },
  isActive: { type: Boolean, default: true },
});

export const User = mongoose.model<IUser>("User", userSchema);

// Category Model
export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

const categorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  description: { type: String },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

export const Category = mongoose.model<ICategory>("Category", categorySchema);

// Product Variant Schema
const productVariantSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

// Product Model
export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  categoryId: mongoose.Types.ObjectId;
  variants: Array<{ name: string; price: number }>;
  isAvailable: boolean;
  isTaxable: boolean;
  image?: string;
  sortOrder: number;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  variants: [productVariantSchema],
  isAvailable: { type: Boolean, default: true },
  isTaxable: { type: Boolean, default: true },
  image: { type: String },
  sortOrder: { type: Number, default: 0 },
});

export const Product = mongoose.model<IProduct>("Product", productSchema);

// Table Model
export interface ITable extends Document {
  _id: mongoose.Types.ObjectId;
  number: number;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "billed";
  currentOrderId?: mongoose.Types.ObjectId;
  position?: { x: number; y: number };
}

const tableSchema = new Schema<ITable>({
  number: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, default: 4 },
  status: { type: String, enum: ["available", "occupied", "billed"], default: "available" },
  currentOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
  position: {
    x: { type: Number },
    y: { type: Number },
  },
});

export const Table = mongoose.model<ITable>("Table", tableSchema);

// Order Item Schema
const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  variant: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  notes: { type: String },
  isTaxable: { type: Boolean, default: true },
}, { _id: false });

// Payment Schema
const paymentSchema = new Schema({
  method: { type: String, enum: ["cash", "card", "bank_transfer", "wallet"], required: true },
  amount: { type: Number, required: true, min: 0 },
  tip: { type: Number, default: 0 },
  reference: { type: String },
}, { _id: false });

// Order Model
export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: number;
  type: "dine-in" | "takeaway";
  tableId?: mongoose.Types.ObjectId;
  tableName?: string;
  items: Array<{
    productId: mongoose.Types.ObjectId;
    productName: string;
    variant?: string;
    quantity: number;
    price: number;
    notes?: string;
    isTaxable: boolean;
  }>;
  status: "preparing" | "served" | "billed" | "cancelled";
  subtotal: number;
  taxAmount: number;
  total: number;
  payments: Array<{
    method: "cash" | "card" | "bank_transfer" | "wallet";
    amount: number;
    tip: number;
    reference?: string;
  }>;
  paidAmount: number;
  remainingAmount: number;
  isPaid: boolean;
  cashierId?: mongoose.Types.ObjectId;
  cashierName?: string;
  waiterId?: mongoose.Types.ObjectId;
  waiterName?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  orderNumber: { type: Number, required: true, unique: true },
  type: { type: String, enum: ["dine-in", "takeaway"], default: "dine-in" },
  tableId: { type: Schema.Types.ObjectId, ref: "Table" },
  tableName: { type: String },
  items: [orderItemSchema],
  status: { type: String, enum: ["preparing", "served", "billed", "cancelled"], default: "preparing" },
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  payments: [paymentSchema],
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  cashierId: { type: Schema.Types.ObjectId, ref: "User" },
  cashierName: { type: String },
  waiterId: { type: Schema.Types.ObjectId, ref: "User" },
  waiterName: { type: String },
  customerName: { type: String },
  customerPhone: { type: String },
  notes: { type: String },
}, { timestamps: true });

export const Order = mongoose.model<IOrder>("Order", orderSchema);

// Counter Model (for order numbers)
interface ICounter extends Document {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounter>("Counter", counterSchema);

// Settings Model
export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  cafeName: string;
  cafeAddress?: string;
  cafePhone?: string;
  cafeLogo?: string;
  taxPercentage: number;
  isTaxInclusive: boolean;
  currency: string;
  receiptFooter: string;
  enableSoundNotifications: boolean;
  autoLogoutMinutes: number;
}

const settingsSchema = new Schema<ISettings>({
  cafeName: { type: String, default: "Desi Beats Café" },
  cafeAddress: { type: String },
  cafePhone: { type: String },
  cafeLogo: { type: String },
  taxPercentage: { type: Number, default: 16, min: 0, max: 100 },
  isTaxInclusive: { type: Boolean, default: false },
  currency: { type: String, default: "Rs." },
  receiptFooter: { type: String, default: "Thank you for visiting Desi Beats Café!" },
  enableSoundNotifications: { type: Boolean, default: true },
  autoLogoutMinutes: { type: Number, default: 30, min: 0 },
});

export const Settings = mongoose.model<ISettings>("Settings", settingsSchema);

// Helper function to get next order number
export async function getNextOrderNumber(): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    "orderNumber",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
