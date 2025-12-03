import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "";

export async function connectDB() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not set");
    }
    
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully");
    
    // Initialize default data
    await initializeDefaults();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

async function initializeDefaults() {
  const { User, Settings, Category } = await import("./models");
  
  // Create default admin user if none exists
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
  
  // Create default settings if none exist
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
  
  // Create sample categories if none exist
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
