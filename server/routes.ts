import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  User,
  Category,
  Product,
  Table,
  Order,
  Settings,
  getNextOrderNumber,
} from "./models";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

// Auth middleware
interface AuthRequest extends Request {
  user?: {
    _id: string;
    username: string;
    name: string;
    role: string;
  };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // =====================
  // AUTH ROUTES
  // =====================
  
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
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
        user: {
          _id: user._id.toString(),
          username: user.username,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  // =====================
  // USERS ROUTES
  // =====================
  
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const users = await User.find().select("-password").lean();
      res.json(users.map(u => ({ ...u, _id: u._id.toString() })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
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
        username,
        password: hashedPassword,
        name,
        role: role || "cashier",
        isActive: isActive !== false,
      });

      res.status(201).json({
        _id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { username, password, name, role, isActive } = req.body;

      const updateData: any = {};
      if (username) updateData.username = username;
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (typeof isActive === "boolean") updateData.isActive = isActive;
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...user.toObject(), _id: user._id.toString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // CATEGORIES ROUTES
  // =====================
  
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await Category.find().sort({ sortOrder: 1 }).lean();
      res.json(categories.map(c => ({ ...c, _id: c._id.toString() })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/categories", async (req: Request, res: Response) => {
    try {
      const { name, description, color, sortOrder, isActive } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const category = await Category.create({
        name,
        description,
        color: color || "#6366f1",
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      });

      res.status(201).json({ ...category.toObject(), _id: category._id.toString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, color, sortOrder, isActive } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (color) updateData.color = color;
      if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;
      if (typeof isActive === "boolean") updateData.isActive = isActive;

      const category = await Category.findByIdAndUpdate(id, updateData, { new: true });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({ ...category.toObject(), _id: category._id.toString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await Category.findByIdAndDelete(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ message: "Category deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // PRODUCTS ROUTES
  // =====================
  
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const products = await Product.find().sort({ sortOrder: 1 }).lean();
      res.json(products.map(p => ({ 
        ...p, 
        _id: p._id.toString(),
        categoryId: p.categoryId.toString()
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      const { name, description, price, categoryId, variants, isAvailable, isTaxable, image, sortOrder } = req.body;
      
      if (!name || price === undefined || !categoryId) {
        return res.status(400).json({ message: "Name, price, and category are required" });
      }

      const product = await Product.create({
        name,
        description,
        price,
        categoryId: new mongoose.Types.ObjectId(categoryId),
        variants: variants || [],
        isAvailable: isAvailable !== false,
        isTaxable: isTaxable !== false,
        image,
        sortOrder: sortOrder || 0,
      });

      res.status(201).json({ 
        ...product.toObject(), 
        _id: product._id.toString(),
        categoryId: product.categoryId.toString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, price, categoryId, variants, isAvailable, isTaxable, image, sortOrder } = req.body;

      const updateData: any = {};
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
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ 
        ...product.toObject(), 
        _id: product._id.toString(),
        categoryId: product.categoryId.toString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await Product.findByIdAndDelete(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ message: "Product deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // TABLES ROUTES
  // =====================
  
  app.get("/api/tables", async (req: Request, res: Response) => {
    try {
      const tables = await Table.find().sort({ number: 1 }).lean();
      res.json(tables.map(t => ({ 
        ...t, 
        _id: t._id.toString(),
        currentOrderId: t.currentOrderId?.toString()
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tables", async (req: Request, res: Response) => {
    try {
      const { number, name, capacity, status, position } = req.body;
      
      if (!number || !name) {
        return res.status(400).json({ message: "Table number and name are required" });
      }

      const existingTable = await Table.findOne({ number });
      if (existingTable) {
        return res.status(400).json({ message: "Table number already exists" });
      }

      const table = await Table.create({
        number,
        name,
        capacity: capacity || 4,
        status: status || "available",
        position,
      });

      res.status(201).json({ ...table.toObject(), _id: table._id.toString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/tables/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { number, name, capacity, status, position, currentOrderId } = req.body;

      const updateData: any = {};
      if (typeof number === "number") updateData.number = number;
      if (name) updateData.name = name;
      if (typeof capacity === "number") updateData.capacity = capacity;
      if (status) updateData.status = status;
      if (position !== undefined) updateData.position = position;
      if (currentOrderId !== undefined) {
        updateData.currentOrderId = currentOrderId ? new mongoose.Types.ObjectId(currentOrderId) : null;
      }

      const table = await Table.findByIdAndUpdate(id, updateData, { new: true });
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json({ 
        ...table.toObject(), 
        _id: table._id.toString(),
        currentOrderId: table.currentOrderId?.toString()
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/tables/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const table = await Table.findByIdAndDelete(id);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json({ message: "Table deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // ORDERS ROUTES
  // =====================
  
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const orders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      
      res.json(orders.map(o => ({
        ...o,
        _id: o._id.toString(),
        tableId: o.tableId?.toString(),
        cashierId: o.cashierId?.toString(),
        waiterId: o.waiterId?.toString(),
        items: o.items.map(item => ({
          ...item,
          productId: item.productId.toString()
        })),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await Order.findById(id).lean();
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json({
        ...order,
        _id: order._id.toString(),
        tableId: order.tableId?.toString(),
        cashierId: order.cashierId?.toString(),
        waiterId: order.waiterId?.toString(),
        items: order.items.map(item => ({
          ...item,
          productId: item.productId.toString()
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const {
        type, tableId, tableName, items, subtotal, taxAmount, total,
        payments, paidAmount, remainingAmount, isPaid,
        cashierId, cashierName, waiterId, waiterName,
        customerName, customerPhone, notes
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ message: "Order must have at least one item" });
      }

      const orderNumber = await getNextOrderNumber();

      const order = await Order.create({
        orderNumber,
        type: type || "dine-in",
        tableId: tableId ? new mongoose.Types.ObjectId(tableId) : undefined,
        tableName,
        items: items.map((item: any) => ({
          ...item,
          productId: new mongoose.Types.ObjectId(item.productId),
        })),
        status: "preparing",
        subtotal,
        taxAmount,
        total,
        payments: payments || [],
        paidAmount: paidAmount || 0,
        remainingAmount: remainingAmount || total,
        isPaid: isPaid || false,
        cashierId: cashierId ? new mongoose.Types.ObjectId(cashierId) : undefined,
        cashierName,
        waiterId: waiterId ? new mongoose.Types.ObjectId(waiterId) : undefined,
        waiterName,
        customerName,
        customerPhone,
        notes,
      });

      // Update table status if dine-in
      if (tableId) {
        await Table.findByIdAndUpdate(tableId, {
          status: "occupied",
          currentOrderId: order._id,
        });
      }

      res.status(201).json({
        ...order.toObject(),
        _id: order._id.toString(),
        tableId: order.tableId?.toString(),
        cashierId: order.cashierId?.toString(),
        waiterId: order.waiterId?.toString(),
        items: order.items.map(item => ({
          ...item,
          productId: item.productId.toString()
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Handle ObjectId conversions
      if (updateData.tableId) {
        updateData.tableId = new mongoose.Types.ObjectId(updateData.tableId);
      }
      if (updateData.items) {
        updateData.items = updateData.items.map((item: any) => ({
          ...item,
          productId: new mongoose.Types.ObjectId(item.productId),
        }));
      }

      const order = await Order.findByIdAndUpdate(id, updateData, { new: true }).lean();
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json({
        ...order,
        _id: order._id.toString(),
        tableId: order.tableId?.toString(),
        cashierId: order.cashierId?.toString(),
        waiterId: order.waiterId?.toString(),
        items: order.items.map(item => ({
          ...item,
          productId: item.productId.toString()
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/orders/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["preparing", "served", "billed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const order = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).lean();

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Update table status when order is billed or cancelled
      if (order.tableId && (status === "billed" || status === "cancelled")) {
        await Table.findByIdAndUpdate(order.tableId, {
          status: "available",
          currentOrderId: null,
        });
      }

      res.json({
        ...order,
        _id: order._id.toString(),
        tableId: order.tableId?.toString(),
        cashierId: order.cashierId?.toString(),
        waiterId: order.waiterId?.toString(),
        items: order.items.map(item => ({
          ...item,
          productId: item.productId.toString()
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // SETTINGS ROUTES
  // =====================
  
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      let settings = await Settings.findOne().lean();
      if (!settings) {
        // Create default settings if none exist
        const newSettings = await Settings.create({
          cafeName: "Desi Beats Café",
          taxPercentage: 16,
          isTaxInclusive: false,
          currency: "Rs.",
          receiptFooter: "Thank you for visiting Desi Beats Café!",
          enableSoundNotifications: true,
          autoLogoutMinutes: 30,
        });
        settings = newSettings.toObject();
      }
      res.json({ ...settings, _id: settings._id.toString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings", async (req: Request, res: Response) => {
    try {
      const updateData = req.body;
      
      let settings = await Settings.findOneAndUpdate(
        {},
        updateData,
        { new: true, upsert: true }
      ).lean();

      res.json({ ...settings, _id: settings._id.toString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================
  // DASHBOARD ROUTES
  // =====================
  
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Today's orders
      const todayOrders = await Order.find({
        createdAt: { $gte: today },
        status: { $ne: "cancelled" },
      }).lean();

      // Calculate stats
      const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
      const pendingOrders = await Order.countDocuments({
        status: { $in: ["preparing", "served"] },
      });
      const cancelledOrders = await Order.countDocuments({
        createdAt: { $gte: today },
        status: "cancelled",
      });

      // Payment breakdown
      const paymentBreakdown: { [key: string]: { amount: number; count: number } } = {};
      todayOrders.forEach((order) => {
        order.payments.forEach((payment) => {
          if (!paymentBreakdown[payment.method]) {
            paymentBreakdown[payment.method] = { amount: 0, count: 0 };
          }
          paymentBreakdown[payment.method].amount += payment.amount;
          paymentBreakdown[payment.method].count += 1;
        });
      });

      // Top selling items
      const itemSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
      todayOrders.forEach((order) => {
        order.items.forEach((item) => {
          const key = item.productName;
          if (!itemSales[key]) {
            itemSales[key] = { name: item.productName, quantity: 0, revenue: 0 };
          }
          itemSales[key].quantity += item.quantity;
          itemSales[key].revenue += item.price * item.quantity;
        });
      });

      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Category sales
      const categories = await Category.find().lean();
      const products = await Product.find().lean();
      const productCategoryMap: { [key: string]: string } = {};
      products.forEach((p) => {
        productCategoryMap[p._id.toString()] = p.categoryId.toString();
      });

      const categorySales: { [key: string]: number } = {};
      categories.forEach((c) => {
        categorySales[c._id.toString()] = 0;
      });

      todayOrders.forEach((order) => {
        order.items.forEach((item) => {
          const catId = productCategoryMap[item.productId.toString()];
          if (catId && categorySales[catId] !== undefined) {
            categorySales[catId] += item.price * item.quantity;
          }
        });
      });

      const categorySalesData = categories.map((c) => ({
        category: c.name,
        amount: categorySales[c._id.toString()] || 0,
      })).filter((c) => c.amount > 0);

      // Recent orders
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      res.json({
        todaySales,
        todayOrders: todayOrders.length,
        pendingOrders,
        cancelledOrders,
        paymentBreakdown: Object.entries(paymentBreakdown).map(([method, data]) => ({
          method,
          amount: data.amount,
          count: data.count,
        })),
        topSellingItems,
        categorySales: categorySalesData,
        recentOrders: recentOrders.map((o) => ({
          ...o,
          _id: o._id.toString(),
          tableId: o.tableId?.toString(),
          items: o.items.map(item => ({
            ...item,
            productId: item.productId.toString()
          })),
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
