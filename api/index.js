import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ImageKit from "imagekit";

const app = express();

let imagekit = null;

function getImageKit() {
  if (!imagekit) {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    
    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error("ImageKit credentials not configured");
    }
    
    imagekit = new ImageKit({ publicKey, privateKey, urlEndpoint });
  }
  return imagekit;
}

function getImageKitAuthParams() {
  return getImageKit().getAuthenticationParameters();
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const MONGO_URI = process.env.MONGO_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

let cached = { conn: null, promise: null, initialized: false };

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
    
    // Initialize default admin user if no users exist
    if (!cached.initialized) {
      cached.initialized = true;
      await initializeDefaultData();
    }
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
  imageFileId: { type: String },
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
  type: { type: String, enum: ["dine-in", "takeaway", "delivery"], default: "takeaway" },
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

const menuCategories = [
  { name: "Break Fast", color: "#f59e0b", sortOrder: 0 },
  { name: "Halwa Pori Nashta", color: "#ef4444", sortOrder: 1 },
  { name: "Hot Wings", color: "#dc2626", sortOrder: 2 },
  { name: "Fries / Refreshment", color: "#eab308", sortOrder: 3 },
  { name: "Salad", color: "#22c55e", sortOrder: 4 },
  { name: "Tandoor", color: "#a16207", sortOrder: 5 },
  { name: "Main Course", color: "#ea580c", sortOrder: 6 },
  { name: "Karahi", color: "#b91c1c", sortOrder: 7 },
  { name: "Rice", color: "#facc15", sortOrder: 8 },
  { name: "Fish", color: "#0ea5e9", sortOrder: 9 },
  { name: "B.B.Q", color: "#7c2d12", sortOrder: 10 },
  { name: "Burger", color: "#f97316", sortOrder: 11 },
  { name: "Shawarma", color: "#ca8a04", sortOrder: 12 },
  { name: "Roll Paratha", color: "#d97706", sortOrder: 13 },
  { name: "Fried Chicken", color: "#c2410c", sortOrder: 14 },
  { name: "Drinks", color: "#0284c7", sortOrder: 15 },
  { name: "Sweet", color: "#db2777", sortOrder: 16 },
];

const menuItems = [
  { category: "Break Fast", name: "Whole Wheat Paratha", price: 80 },
  { category: "Break Fast", name: "Allu Paratha", price: 150 },
  { category: "Break Fast", name: "Allu Cheese Paratha", price: 220 },
  { category: "Break Fast", name: "Chicken Paratha", price: 250 },
  { category: "Break Fast", name: "Chicken Cheese Paratha", price: 300 },
  { category: "Break Fast", name: "Saag Paratha", price: 250 },
  { category: "Break Fast", name: "Fry Egg", price: 80 },
  { category: "Break Fast", name: "Omelette", price: 90 },
  { category: "Break Fast", name: "Cheese Omelette", price: 150 },
  { category: "Halwa Pori Nashta", name: "Puri", price: 70 },
  { category: "Halwa Pori Nashta", name: "Halwa 250g", price: 220 },
  { category: "Halwa Pori Nashta", name: "Aloo Bhujia", price: 250 },
  { category: "Halwa Pori Nashta", name: "Chanay", price: 300 },
  { category: "Halwa Pori Nashta", name: "Desi Ghee Paratha", price: 180 },
  { category: "Halwa Pori Nashta", name: "Sarson ka Saag", price: 650 },
  { category: "Halwa Pori Nashta", name: "Makki ki Roti", price: 210 },
  { category: "Halwa Pori Nashta", name: "Omelette (2 Eggs)", price: 160 },
  { category: "Halwa Pori Nashta", name: "Fry Eggs (2)", price: 150 },
  { category: "Halwa Pori Nashta", name: "Chai", price: 110 },
  { category: "Halwa Pori Nashta", name: "Desi Beats Special Chai", price: 200 },
  { category: "Hot Wings", name: "Masala Hot Wings (6 pcs)", price: 650 },
  { category: "Hot Wings", name: "Sesame Seed Hot Wings (6 pcs)", price: 780 },
  { category: "Hot Wings", name: "Garlic B.B.Q Wings (6 pcs)", price: 850 },
  { category: "Fries / Refreshment", name: "Plain Fries", price: 200, variants: [{ name: "Regular", price: 200 }, { name: "Large", price: 400 }] },
  { category: "Fries / Refreshment", name: "Masala Fries", price: 220, variants: [{ name: "Regular", price: 220 }, { name: "Large", price: 440 }] },
  { category: "Fries / Refreshment", name: "Garlic Mayo Fries", price: 250, variants: [{ name: "Regular", price: 250 }, { name: "Large", price: 450 }] },
  { category: "Fries / Refreshment", name: "Sesame Seed Fries", price: 250, variants: [{ name: "Regular", price: 250 }, { name: "Large", price: 499 }] },
  { category: "Fries / Refreshment", name: "Samosa Plate", price: 180 },
  { category: "Fries / Refreshment", name: "Pakoray 250g", price: 220 },
  { category: "Fries / Refreshment", name: "Chicken Pakoray 250g", price: 400 },
  { category: "Salad", name: "Green Salad", price: 100 },
  { category: "Salad", name: "Mint Raita", price: 120 },
  { category: "Salad", name: "Mint Sauce", price: 140 },
  { category: "Tandoor", name: "Roti", price: 25 },
  { category: "Tandoor", name: "Naan", price: 30 },
  { category: "Tandoor", name: "Chapati", price: 70 },
  { category: "Tandoor", name: "Tawa Paratha", price: 80 },
  { category: "Tandoor", name: "Roghni Naan", price: 70 },
  { category: "Tandoor", name: "Tandoori Paratha", price: 70 },
  { category: "Tandoor", name: "Kulcha", price: 50 },
  { category: "Main Course", name: "Beef Nehari", price: 700 },
  { category: "Main Course", name: "Lahori Chanay", price: 300 },
  { category: "Main Course", name: "Special Daal", price: 350 },
  { category: "Main Course", name: "Special Sabzi", price: 350 },
  { category: "Main Course", name: "Chicken Qorma", price: 450 },
  { category: "Main Course", name: "Chicken Haleem", price: 480 },
  { category: "Main Course", name: "Chicken Qeema", price: 480 },
  { category: "Main Course", name: "Chicken Jalfarezi", price: 590 },
  { category: "Main Course", name: "Chicken Madrasi", price: 950 },
  { category: "Karahi", name: "Chicken Karahi", price: 1150, variants: [{ name: "Half", price: 1150 }, { name: "Full", price: 2250 }] },
  { category: "Karahi", name: "Chicken Handi", price: 1490, variants: [{ name: "Half", price: 1490 }, { name: "Full", price: 2790 }] },
  { category: "Karahi", name: "Desi Murgh Karahi", price: 1900, variants: [{ name: "Half", price: 1900 }, { name: "Full", price: 3700 }] },
  { category: "Karahi", name: "Mutton Karahi", price: 1950, variants: [{ name: "Half", price: 1950 }, { name: "Full", price: 3800 }] },
  { category: "Rice", name: "Daal Chawal", price: 450 },
  { category: "Rice", name: "Plain Rice", price: 300 },
  { category: "Rice", name: "Chicken Pulao", price: 480 },
  { category: "Rice", name: "Chicken Bariyani", price: 500 },
  { category: "Rice", name: "Chicken Fried Rice", price: 600 },
  { category: "Rice", name: "Egg Fried Rice", price: 500 },
  { category: "Rice", name: "Plain Bariyani", price: 300 },
  { category: "Fish", name: "Rahu Grilled Fish 1kg", price: 1850 },
  { category: "Fish", name: "Rahu Fried Fish 1kg", price: 2000 },
  { category: "Fish", name: "Finger Fried Fish 1kg", price: 2350 },
  { category: "B.B.Q", name: "Chicken Tikka Boti", price: 200 },
  { category: "B.B.Q", name: "Chicken Malai Boti", price: 400 },
  { category: "B.B.Q", name: "Chicken Tikka Piece Leg", price: 370 },
  { category: "B.B.Q", name: "Chicken Tikka Piece Chest", price: 380 },
  { category: "B.B.Q", name: "Chicken Tikka Per Plate", price: 400 },
  { category: "B.B.Q", name: "Malai Boti 6 Seekh", price: 2400 },
  { category: "Burger", name: "Zinger Burger with Fries", price: 350 },
  { category: "Burger", name: "Beef Smash Burger with Fries", price: 400 },
  { category: "Burger", name: "Crispy Chicken Patty Burger with Fries", price: 350 },
  { category: "Burger", name: "Anda Shami Burger", price: 220 },
  { category: "Shawarma", name: "Chicken Shawarma", price: 220 },
  { category: "Shawarma", name: "Chicken Cheese Shawarma", price: 300 },
  { category: "Shawarma", name: "Zinger Shawarma", price: 300 },
  { category: "Shawarma", name: "Shawarma Platter", price: 480 },
  { category: "Roll Paratha", name: "Garlic Mayo Roll", price: 350 },
  { category: "Roll Paratha", name: "B.B.Q Paratha Roll", price: 400 },
  { category: "Roll Paratha", name: "Zinger Paratha Roll", price: 380 },
  { category: "Fried Chicken", name: "Chicken Hot Shots", price: 450, variants: [{ name: "Half", price: 450 }, { name: "Full", price: 800 }] },
  { category: "Fried Chicken", name: "Chicken Fried 2 Piece with Fries", price: 499 },
  { category: "Fried Chicken", name: "Chicken Fried 6 Piece with Fries", price: 1250 },
  { category: "Fried Chicken", name: "Nuggets 6 Pcs with Fries", price: 499 },
  { category: "Drinks", name: "Mint Margarita", price: 350 },
  { category: "Drinks", name: "Lassi", price: 260 },
  { category: "Drinks", name: "Seasonal Shake", price: 450 },
  { category: "Drinks", name: "Cold Drink Can", price: 150 },
  { category: "Drinks", name: "Cold Drink 1Ltr", price: 180 },
  { category: "Drinks", name: "Cold Drink 1.5 Ltr", price: 250 },
  { category: "Drinks", name: "Mineral Water Large", price: 110 },
  { category: "Drinks", name: "Mineral Water Small", price: 70 },
  { category: "Sweet", name: "DBC Special Kheer", price: 320, variants: [{ name: "Small", price: 320 }, { name: "Large", price: 580 }] },
  { category: "Sweet", name: "DBC Special Gajar Halwa 250g", price: 900 },
];

async function seedMenuData() {
  try {
    console.log("Deleting existing products and categories...");
    await Product.deleteMany({});
    await Category.deleteMany({});
    
    console.log("Creating categories...");
    const createdCategories = await Category.insertMany(
      menuCategories.map((cat) => ({
        name: cat.name,
        color: cat.color,
        sortOrder: cat.sortOrder,
        isActive: true,
      }))
    );
    console.log(`Created ${createdCategories.length} categories`);
    
    const categoryMap = new Map();
    createdCategories.forEach((cat) => {
      categoryMap.set(cat.name, cat._id);
    });
    
    console.log("Creating products...");
    const products = menuItems.map((item, index) => ({
      name: item.name,
      price: item.price,
      categoryId: categoryMap.get(item.category),
      variants: item.variants || [],
      isAvailable: true,
      isTaxable: true,
      sortOrder: index,
    }));
    
    const createdProducts = await Product.insertMany(products);
    console.log(`Created ${createdProducts.length} products`);
    
    return { categories: createdCategories.length, products: createdProducts.length };
  } catch (error) {
    console.error("Error seeding menu data:", error);
    throw error;
  }
}

async function initializeDefaultData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("No users found. Creating default admin user...");
      const hashedPassword = await bcrypt.hash("admin", 10);
      await User.create({
        username: "admin",
        password: hashedPassword,
        name: "Administrator",
        role: "admin",
        isActive: true,
      });
      console.log("Default admin user created (username: admin, password: admin)");
    }
    
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      console.log("No settings found. Creating default settings...");
      await Settings.create({
        cafeName: "Desi Beats Café",
        taxPercentage: 16,
        isTaxInclusive: false,
        currency: "Rs.",
        receiptFooter: "Thank you for visiting Desi Beats Café!",
        enableSoundNotifications: true,
        autoLogoutMinutes: 30,
      });
      console.log("Default settings created");
    }
    
    // Seed menu data if no categories exist (fresh deployment)
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log("No categories found. Seeding menu data...");
      await seedMenuData();
      console.log("Menu data seeded successfully");
    }
  } catch (error) {
    console.error("Error initializing default data:", error);
  }
}

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

function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
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
    const { name, description, price, categoryId, variants, isAvailable, isTaxable, image, imageFileId, sortOrder } = req.body;
    if (!name || price === undefined || !categoryId) {
      return res.status(400).json({ message: "Name, price, and category are required" });
    }

    if (image && !validateImageUrl(image)) {
      return res.status(400).json({ message: "Invalid image URL" });
    }

    if (imageFileId && !/^\/cafe-pos\/(products|settings)\//.test(imageFileId)) {
      return res.status(400).json({ message: "Invalid image file path" });
    }

    const product = await Product.create({
      name, description, price, categoryId: new mongoose.Types.ObjectId(categoryId),
      variants: variants || [], isAvailable: isAvailable !== false, isTaxable: isTaxable !== false, image, imageFileId, sortOrder: sortOrder || 0,
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
    const { name, description, price, categoryId, variants, isAvailable, isTaxable, image, imageFileId, sortOrder } = req.body;

    if (image !== undefined && image !== "" && !validateImageUrl(image)) {
      return res.status(400).json({ message: "Invalid image URL" });
    }

    if (imageFileId !== undefined && imageFileId !== "" && !/^\/cafe-pos\/(products|settings)\//.test(imageFileId)) {
      return res.status(400).json({ message: "Invalid image file path" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (typeof price === "number") updateData.price = price;
    if (categoryId) updateData.categoryId = new mongoose.Types.ObjectId(categoryId);
    if (variants !== undefined) updateData.variants = variants;
    if (typeof isAvailable === "boolean") updateData.isAvailable = isAvailable;
    if (typeof isTaxable === "boolean") updateData.isTaxable = isTaxable;
    if (image !== undefined && image !== "") updateData.image = image;
    if (imageFileId !== undefined && imageFileId !== "") updateData.imageFileId = imageFileId;
    // Allow clearing both fields explicitly
    if (image === "" && imageFileId === "") {
      updateData.image = "";
      updateData.imageFileId = "";
    }
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
    // Use UTC-based date for consistent behavior across timezones
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const ordersForStats = await Order.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: "cancelled" },
    }).lean();

    const todaySales = ordersForStats.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = await Order.countDocuments({ status: { $in: ["preparing", "served"] } });
    const cancelledOrders = await Order.countDocuments({ createdAt: { $gte: todayStart }, status: "cancelled" });

    const paymentBreakdown = {};
    ordersForStats.forEach((order) => {
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

    const itemSales = {};
    ordersForStats.forEach((order) => {
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

    const categories = await Category.find().lean();
    const products = await Product.find().lean();
    const productCategoryMap = {};
    products.forEach((p) => {
      productCategoryMap[p._id.toString()] = p.categoryId.toString();
    });

    const categorySalesMap = {};
    categories.forEach((c) => {
      categorySalesMap[c._id.toString()] = 0;
    });

    ordersForStats.forEach((order) => {
      order.items.forEach((item) => {
        const catId = productCategoryMap[item.productId.toString()];
        if (catId && categorySalesMap[catId] !== undefined) {
          categorySalesMap[catId] += item.price * item.quantity;
        }
      });
    });

    const categorySales = categories.map((c) => ({
      category: c.name,
      amount: categorySalesMap[c._id.toString()] || 0,
    })).filter((c) => c.amount > 0);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      todaySales,
      todayOrders: ordersForStats.length,
      pendingOrders,
      cancelledOrders,
      paymentBreakdown: Object.entries(paymentBreakdown).map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
      })),
      topSellingItems,
      categorySales,
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

app.post("/api/imagekit/signed-url", authMiddleware, (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }
    // Validate that filePath is within allowed folder to prevent unauthorized access
    const allowedFolderPattern = /^\/cafe-pos\/(products|settings)\//;
    if (!allowedFolderPattern.test(filePath)) {
      return res.status(403).json({ message: "Access to this file path is not allowed" });
    }
    const ik = getImageKit();
    const signedUrl = ik.url({
      path: filePath,
      signed: true,
      expireSeconds: 3600,
    });
    res.json({ signedUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/seed/menu", async (req, res) => {
  try {
    await connectDB();
    const result = await seedMenuData();
    res.json({ 
      message: "Menu data seeded successfully", 
      categories: result.categories, 
      products: result.products 
    });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/reports", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    if (startDate && endDate) {
      const startParts = String(startDate).split('-').map(Number);
      const endParts = String(endDate).split('-').map(Number);
      
      const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0));
      const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999));
      
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    } else if (startDate) {
      const startParts = String(startDate).split('-').map(Number);
      const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0));
      dateFilter = { createdAt: { $gte: start } };
    }

    const orders = await Order.find({
      ...dateFilter,
      status: { $ne: "cancelled" },
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.taxAmount, 0);
    const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);

    const paymentBreakdown = {};
    orders.forEach((order) => {
      order.payments.forEach((payment) => {
        if (!paymentBreakdown[payment.method]) {
          paymentBreakdown[payment.method] = { amount: 0, count: 0 };
        }
        paymentBreakdown[payment.method].amount += payment.amount;
        paymentBreakdown[payment.method].count += 1;
      });
    });

    const dineInOrders = orders.filter(o => o.type === "dine-in");
    const takeawayOrders = orders.filter(o => o.type === "takeaway");

    const itemSales = {};
    orders.forEach((order) => {
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
      .slice(0, 20);

    res.json({
      summary: {
        totalOrders,
        totalRevenue,
        totalTax,
        totalSubtotal,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        dineInCount: dineInOrders.length,
        dineInRevenue: dineInOrders.reduce((sum, o) => sum + o.total, 0),
        takeawayCount: takeawayOrders.length,
        takeawayRevenue: takeawayOrders.reduce((sum, o) => sum + o.total, 0),
      },
      paymentBreakdown: Object.entries(paymentBreakdown).map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
      })),
      topSellingItems,
      orders: orders.map((o) => ({
        _id: o._id.toString(),
        orderNumber: o.orderNumber,
        type: o.type,
        tableName: o.tableName,
        status: o.status,
        subtotal: o.subtotal,
        taxAmount: o.taxAmount,
        total: o.total,
        isPaid: o.isPaid,
        cashierName: o.cashierName,
        waiterName: o.waiterName,
        customerName: o.customerName,
        itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default app;
