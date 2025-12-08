import { z } from "zod";

// User Roles
export const UserRole = {
  ADMIN: "admin",
  CASHIER: "cashier",
  WAITER: "waiter",
  KITCHEN: "kitchen",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// User Schema
export const userSchema = z.object({
  _id: z.string(),
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string(),
  role: z.enum(["admin", "cashier", "waiter", "kitchen"]),
  isActive: z.boolean().default(true),
});

export const insertUserSchema = userSchema.omit({ _id: true });
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Category Schema
export const categorySchema = z.object({
  _id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

export const insertCategorySchema = categorySchema.omit({ _id: true });
export type Category = z.infer<typeof categorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Product Variant Schema
export const productVariantSchema = z.object({
  name: z.string(),
  price: z.number().min(0),
});

export type ProductVariant = z.infer<typeof productVariantSchema>;

// Product Schema
export const productSchema = z.object({
  _id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  categoryId: z.string(),
  variants: z.array(productVariantSchema).default([]),
  isAvailable: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  image: z.string().optional(),
  imageFileId: z.string().optional(),
  sortOrder: z.number().default(0),
});

export const insertProductSchema = productSchema.omit({ _id: true });
export type Product = z.infer<typeof productSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Table Status
export const TableStatus = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  BILLED: "billed",
} as const;

export type TableStatusType = (typeof TableStatus)[keyof typeof TableStatus];

// Table Schema
export const tableSchema = z.object({
  _id: z.string(),
  number: z.number().min(1),
  name: z.string(),
  capacity: z.number().min(1).default(4),
  status: z.enum(["available", "occupied", "billed"]).default("available"),
  currentOrderId: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
});

export const insertTableSchema = tableSchema.omit({ _id: true });
export type Table = z.infer<typeof tableSchema>;
export type InsertTable = z.infer<typeof insertTableSchema>;

// Order Item Schema
export const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  variant: z.string().optional(),
  quantity: z.number().min(1),
  price: z.number().min(0),
  notes: z.string().optional(),
  isTaxable: z.boolean().default(true),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Order Status
export const OrderStatus = {
  PREPARING: "preparing",
  SERVED: "served",
  BILLED: "billed",
  CANCELLED: "cancelled",
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

// Order Type
export const OrderType = {
  DINEIN: "dine-in",
  TAKEAWAY: "takeaway",
  DELIVERY: "delivery",
} as const;

export type OrderTypeType = (typeof OrderType)[keyof typeof OrderType];

// Payment Method
export const PaymentMethod = {
  CASH: "cash",
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  WALLET: "wallet",
} as const;

export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// Payment Schema
export const paymentSchema = z.object({
  method: z.enum(["cash", "card", "bank_transfer", "wallet"]),
  amount: z.number().min(0),
  tip: z.number().min(0).default(0),
  reference: z.string().optional(),
});

export type Payment = z.infer<typeof paymentSchema>;

// Order Schema
export const orderSchema = z.object({
  _id: z.string(),
  orderNumber: z.number(),
  type: z.enum(["dine-in", "takeaway", "delivery"]).default("takeaway"),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  items: z.array(orderItemSchema),
  status: z.enum(["preparing", "served", "billed", "cancelled"]).default("preparing"),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  total: z.number().min(0),
  payments: z.array(paymentSchema).default([]),
  paidAmount: z.number().min(0).default(0),
  remainingAmount: z.number().min(0).default(0),
  isPaid: z.boolean().default(false),
  cashierId: z.string().optional(),
  cashierName: z.string().optional(),
  waiterId: z.string().optional(),
  waiterName: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertOrderSchema = orderSchema.omit({ _id: true, orderNumber: true, createdAt: true, updatedAt: true });
export type Order = z.infer<typeof orderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Settings Schema
export const settingsSchema = z.object({
  _id: z.string(),
  cafeName: z.string().default("Desi Beats Café"),
  cafeAddress: z.string().optional(),
  cafePhone: z.string().optional(),
  cafeLogo: z.string().optional(),
  taxPercentage: z.number().min(0).max(100).default(16),
  isTaxInclusive: z.boolean().default(false),
  currency: z.string().default("Rs."),
  receiptFooter: z.string().default("Thank you for visiting Desi Beats Café!"),
  enableSoundNotifications: z.boolean().default(true),
  autoLogoutMinutes: z.number().min(0).default(30),
});

export const insertSettingsSchema = settingsSchema.omit({ _id: true });
export type Settings = z.infer<typeof settingsSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Dashboard Stats
export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  paymentBreakdown: {
    method: string;
    amount: number;
    count: number;
  }[];
  topSellingItems: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  categorySales: {
    category: string;
    amount: number;
  }[];
  recentOrders: Order[];
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  token: string;
}

// Cart Item for POS
export interface CartItem extends OrderItem {
  id: string;
}
