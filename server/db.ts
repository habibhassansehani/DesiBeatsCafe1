import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "";

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = {
  conn: null,
  promise: null,
};

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function initializeDefaults() {
  const { User, Settings, Category } = await import("./models");

  const adminExists = await User.findOne({ role: "admin" });
  if (!adminExists) {
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("admin", 10);
    await User.create({
      username: "admin",
      password: hashedPassword,
      name: "Admin User",
      role: "admin",
      isActive: true,
    });
    console.log("Default admin user created (username: admin, password: admin)");
  }

  const settingsExist = await Settings.findOne();
  if (!settingsExist) {
    await Settings.create({
      cafeName: "Desi Beats Café",
      cafeAddress: "",
      cafePhone: "",
      taxPercentage: 16,
      isTaxInclusive: false,
      currency: "Rs.",
      receiptFooter: "Thank you for visiting Desi Beats Café!",
      enableSoundNotifications: true,
      autoLogoutMinutes: 30,
    });
    console.log("Default settings created");
  }

  const categoriesExist = await Category.countDocuments();
  if (categoriesExist === 0) {
    const sampleCategories = [
      { name: "Hot Drinks", description: "Coffee, tea, and other hot beverages", sortOrder: 0, isActive: true },
      { name: "Cold Drinks", description: "Smoothies, juices, and iced beverages", sortOrder: 1, isActive: true },
      { name: "Breakfast", description: "Morning favorites and brunch items", sortOrder: 2, isActive: true },
      { name: "Main Course", description: "Lunch and dinner entrees", sortOrder: 3, isActive: true },
      { name: "Desserts", description: "Sweet treats and pastries", sortOrder: 4, isActive: true },
      { name: "Snacks", description: "Light bites and appetizers", sortOrder: 5, isActive: true },
    ];
    await Category.insertMany(sampleCategories);
    console.log("Sample categories created");
  }
}

export default connectDB;
