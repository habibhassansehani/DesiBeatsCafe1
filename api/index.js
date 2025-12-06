import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getImageKitAuthParams } from "../server/imagekit.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const MONGO_URI = process.env.MONGO_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

let cached = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    cached.promise = mongoose.connect(MONGO_URI, {
      bufferCommands: false,
    }).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "cashier", "waiter", "kitchen"], default: "cashier" },
  isActive: { type: Boolean, default: true },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: "#6366f1" },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const productVariantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  variants: [productVariantSchema],
  isAvailable: { type: Boolean, default: true },
  isTaxable: { type: Boolean, default: true },
  image: { type: String },
  sortOrder: { type: Number, default: 0 },
});

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, default: 4 },
  status: { type: String, enum: ["available", "occupied", "billed"], default: "available" },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  position: { x: { type: Number }, y: { type: Number } },
});

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  variant: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  notes: { type: String },
  isTaxable: { type: Boolean, default: true },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ["cash", "card", "bank_transfer", "wallet"], required: true },
  amount: { type: Number, required: true, min: 0 },
  tip: { type: Number, default: 0 },
  reference: { type: String },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number, required: true, unique: true },
  type: { type: String, enum: ["dine-in", "takeaway"], default: "dine-in" },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
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
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  cashierName: { type: String },
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  waiterName: { type: String },
  customerName: { type: String },
  customerPhone: { type: String },
  notes: { type: String },
}, { timestamps: true });

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const settingsSchema = new mongoose.Schema({
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

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const Table = mongoose.models.Table || mongoose.model("Table", tableSchema);
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);
const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

async function getNextOrderNumber() {
  const counter = await Counter.findByIdAndUpdate(
    "orderNumber",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.post("/api/auth/login", async (req, res) => {
  try {
    await connectDB();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { _id: user._id.toString(), username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      user: { _id: user._id.toString(), username: user.username, name: user.name, role: user.role, isActive: user.isActive },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message || "Login failed" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    await connectDB();
    const users = await User.find().select("-password").lean();
    res.json(users.map(u => ({ ...u, _id: u._id.toString() })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    await connectDB();
    const { username, password, name, role, isActive } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: "Username, password, and name are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username, password: hashedPassword, name, role: role || "cashier", isActive: isActive !== false,
    });

    res.status(201).json({ _id: user._id.toString(), username: user.username, name: user.name, role: user.role, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { username, password, name, role, isActive } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ ...user.toObject(), _id: user._id.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await connectDB();
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    await connectDB();
    const categories = await Category.find().sort({ sortOrder: 1 }).lean();
    res.json(categories.map(c => ({ ...c, _id: c._id.toString() })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    await connectDB();
    const { name, description, color, sortOrder, isActive } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required" });

    const category = await Category.create({ name, description, color: color || "#6366f1", sortOrder: sortOrder || 0, isActive: isActive !== false });
    res.status(201).json({ ...category.toObject(), _id: category._id.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/categories/:id", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { name, description, color, sortOrder, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;
    if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const category = await Category.findByIdAndUpdate(id, updateData, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found" });

    res.json({ ...category.toObject(), _id: category._id.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    await connectDB();
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    await connectDB();
    const products = await Product.find().sort({ sortOrder: 1 }).lean();
    res.json(products.map(p => ({ ...p, _id: p._id.toString(), categoryId: p.categoryId.toString() })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const IMAGEKIT_TRUSTED_DOMAIN = process.env.VITE_IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT || "";

function validateImageUrl(url) {
  if (!url || url === "") return true;
  if (typeof url !== "string") return false;
  try {
    const parsedUrl = new URL(url);
    const trustedUrl = new URL(IMAGEKIT_TRUSTED_DOMAIN);
    return parsedUrl.protocol === "https:" && parsedUrl.hostname === trustedUrl.hostname;
  } catch {
    return false;
  }
}

app.post("/api/products", async (req, res) => {
  try {
    await connectDB();
    const { name, description, price, categoryId, variants, isAvailable, isTaxable, image, sortOrder } = req.body;
    if (!name || price === undefined || !categoryId) {
      return res.status(400).json({ message: "Name, price, and category are required" });
    }

    if (image && !validateImageUrl(image)) {
      return res.status(400).json({ message: "Invalid image URL" });
    }

    const product = await Product.create({
      name, description, price, categoryId: new mongoose.Types.ObjectId(categoryId),
      variants: variants || [], isAvailable: isAvailable !== false, isTaxable: isTaxable !== false, image, sortOrder: sortOrder || 0,
    });

    res.status(201).json({ ...product.toObject(), _id: product._id.toString(), categoryId: product.categoryId.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/products/:id", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { name, description, price, categoryId, variants, isAvailable, isTaxable, image, sortOrder } = req.body;

    if (image !== undefined && image !== "" && !validateImageUrl(image)) {
      return res.status(400).json({ message: "Invalid image URL" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (typeof price === "number") updateData.price = price;
    if (categoryId) updateData.categoryId = new mongoose.Types.ObjectId(categoryId);
    if (variants !== undefined) updateData.variants = variants;
    if (typeof isAvailable === "boolean") updateData.isAvailable = isAvailable;
    if (typeof isTaxable === "boolean") updateData.isTaxable = isTaxable;
    if (image !== undefined) updateData.image = image;
    if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ ...product.toObject(), _id: product._id.toString(), categoryId: product.categoryId.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/tables", async (req, res) => {
  try {
    await connectDB();
    const tables = await Table.find().sort({ number: 1 }).lean();
    res.json(tables.map(t => ({ ...t, _id: t._id.toString(), currentOrderId: t.currentOrderId?.toString() })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/tables", async (req, res) => {
  try {
    await connectDB();
    const { number, name, capacity, status, position } = req.body;
    if (!number || !name) return res.status(400).json({ message: "Table number and name are required" });

    const existingTable = await Table.findOne({ number });
    if (existingTable) return res.status(400).json({ message: "Table number already exists" });

    const table = await Table.create({ number, name, capacity: capacity || 4, status: status || "available", position });
    res.status(201).json({ ...table.toObject(), _id: table._id.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/tables/:id", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { number, name, capacity, status, position, currentOrderId } = req.body;

    const updateData = {};
    if (typeof number === "number") updateData.number = number;
    if (name) updateData.name = name;
    if (typeof capacity === "number") updateData.capacity = capacity;
    if (status) updateData.status = status;
    if (position !== undefined) updateData.position = position;
    if (currentOrderId !== undefined) {
      updateData.currentOrderId = currentOrderId ? new mongoose.Types.ObjectId(currentOrderId) : null;
    }

    const table = await Table.findByIdAndUpdate(id, updateData, { new: true });
    if (!table) return res.status(404).json({ message: "Table not found" });

    res.json({ ...table.toObject(), _id: table._id.toString(), currentOrderId: table.currentOrderId?.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/tables/:id", async (req, res) => {
  try {
    await connectDB();
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ message: "Table not found" });
    res.json({ message: "Table deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    await connectDB();
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(orders.map(o => ({
      ...o, _id: o._id.toString(), tableId: o.tableId?.toString(), cashierId: o.cashierId?.toString(), waiterId: o.waiterId?.toString(),
      items: o.items.map(item => ({ ...item, productId: item.productId.toString() })),
      createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    await connectDB();
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({
      ...order, _id: order._id.toString(), tableId: order.tableId?.toString(), cashierId: order.cashierId?.toString(), waiterId: order.waiterId?.toString(),
      items: order.items.map(item => ({ ...item, productId: item.productId.toString() })),
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    await connectDB();
    const { type, tableId, tableName, items, subtotal, taxAmount, total, payments, paidAmount, remainingAmount, isPaid, cashierId, cashierName, waiterId, waiterName, customerName, customerPhone, notes } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ message: "Order must have at least one item" });

    const orderNumber = await getNextOrderNumber();

    const order = await Order.create({
      orderNumber, type: type || "dine-in", tableId: tableId ? new mongoose.Types.ObjectId(tableId) : undefined, tableName,
      items: items.map(item => ({ ...item, productId: new mongoose.Types.ObjectId(item.productId) })),
      status: "preparing", subtotal, taxAmount, total, payments: payments || [], paidAmount: paidAmount || 0, remainingAmount: remainingAmount || total, isPaid: isPaid || false,
      cashierId: cashierId ? new mongoose.Types.ObjectId(cashierId) : undefined, cashierName,
      waiterId: waiterId ? new mongoose.Types.ObjectId(waiterId) : undefined, waiterName, customerName, customerPhone, notes,
    });

    if (tableId) {
      await Table.findByIdAndUpdate(tableId, { status: "occupied", currentOrderId: order._id });
    }

    res.status(201).json({
      ...order.toObject(), _id: order._id.toString(), tableId: order.tableId?.toString(), cashierId: order.cashierId?.toString(), waiterId: order.waiterId?.toString(),
      items: order.items.map(item => ({ ...item, productId: item.productId.toString() })),
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.tableId) updateData.tableId = new mongoose.Types.ObjectId(updateData.tableId);
    if (updateData.items) {
      updateData.items = updateData.items.map(item => ({ ...item, productId: new mongoose.Types.ObjectId(item.productId) }));
    }

    const order = await Order.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({
      ...order, _id: order._id.toString(), tableId: order.tableId?.toString(), cashierId: order.cashierId?.toString(), waiterId: order.waiterId?.toString(),
      items: order.items.map(item => ({ ...item, productId: item.productId.toString() })),
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { status } = req.body;

    if (!["preparing", "served", "billed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.tableId && (status === "billed" || status === "cancelled")) {
      await Table.findByIdAndUpdate(order.tableId, { status: "available", currentOrderId: null });
    }

    res.json({
      ...order, _id: order._id.toString(), tableId: order.tableId?.toString(), cashierId: order.cashierId?.toString(), waiterId: order.waiterId?.toString(),
      items: order.items.map(item => ({ ...item, productId: item.productId.toString() })),
      createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    await connectDB();
    let settings = await Settings.findOne().lean();
    if (!settings) {
      const newSettings = await Settings.create({
        cafeName: "Desi Beats Café", taxPercentage: 16, isTaxInclusive: false, currency: "Rs.",
        receiptFooter: "Thank you for visiting Desi Beats Café!", enableSoundNotifications: true, autoLogoutMinutes: 30,
      });
      settings = newSettings.toObject();
    }
    res.json({ ...settings, _id: settings._id.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch("/api/settings", async (req, res) => {
  try {
    await connectDB();
    const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true }).lean();
    res.json({ ...settings, _id: settings._id.toString() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    await connectDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({ createdAt: { $gte: today }, status: { $ne: "cancelled" } }).lean();
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = await Order.countDocuments({ status: { $in: ["preparing", "served"] } });
    const cancelledOrders = await Order.countDocuments({ createdAt: { $gte: today }, status: "cancelled" });

    const paymentBreakdown = {};
    todayOrders.forEach((order) => {
      if (order.payments) {
        order.payments.forEach((payment) => {
          if (!paymentBreakdown[payment.method]) {
            paymentBreakdown[payment.method] = { amount: 0, count: 0 };
          }
          paymentBreakdown[payment.method].amount += payment.amount;
          paymentBreakdown[payment.method].count += 1;
        });
      }
    });

    const topProducts = {};
    todayOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.productName;
        if (!topProducts[key]) {
          topProducts[key] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        topProducts[key].quantity += item.quantity;
        topProducts[key].revenue += item.price * item.quantity;
      });
    });

    const sortedProducts = Object.values(topProducts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    res.json({
      todaySales, ordersCount: todayOrders.length, pendingOrders, cancelledOrders, paymentBreakdown, topProducts: sortedProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/imagekit/auth", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const authParams = getImageKitAuthParams();
    res.json(authParams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default app;
