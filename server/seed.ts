import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import {
  User,
  Category,
  Product,
  Table,
  Order,
  Settings,
  Counter,
} from "./models";

async function clearDatabase() {
  console.log("Clearing database...");
  await User.deleteMany({});
  await Category.deleteMany({});
  await Product.deleteMany({});
  await Table.deleteMany({});
  await Order.deleteMany({});
  await Settings.deleteMany({});
  await Counter.deleteMany({});
  console.log("Database cleared successfully");
}

async function seedDatabase() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("admin", 10);
  const admin = await User.create({
    username: "admin",
    password: hashedPassword,
    name: "Admin User",
    role: "admin",
    isActive: true,
  });
  console.log("Admin user created (username: admin, password: admin)");

  const cashierPassword = await bcrypt.hash("cashier", 10);
  await User.create({
    username: "cashier",
    password: cashierPassword,
    name: "Cashier Staff",
    role: "cashier",
    isActive: true,
  });

  const kitchenPassword = await bcrypt.hash("kitchen", 10);
  await User.create({
    username: "kitchen",
    password: kitchenPassword,
    name: "Kitchen Staff",
    role: "kitchen",
    isActive: true,
  });
  console.log("Staff users created");

  await Settings.create({
    cafeName: "Desi Beats Café",
    cafeAddress: "123 Main Street, City Center",
    cafePhone: "+92 300 1234567",
    taxPercentage: 16,
    isTaxInclusive: false,
    currency: "Rs.",
    receiptFooter: "Thank you for visiting Desi Beats Café! See you again!",
    enableSoundNotifications: true,
    autoLogoutMinutes: 30,
  });
  console.log("Settings created");

  const categories = await Category.insertMany([
    { name: "Hot Drinks", description: "Coffee, tea, and other hot beverages", color: "#ef4444", sortOrder: 0, isActive: true },
    { name: "Cold Drinks", description: "Smoothies, juices, and iced beverages", color: "#3b82f6", sortOrder: 1, isActive: true },
    { name: "Breakfast", description: "Morning favorites and brunch items", color: "#f59e0b", sortOrder: 2, isActive: true },
    { name: "Main Course", description: "Lunch and dinner entrees", color: "#10b981", sortOrder: 3, isActive: true },
    { name: "Desserts", description: "Sweet treats and pastries", color: "#ec4899", sortOrder: 4, isActive: true },
    { name: "Snacks", description: "Light bites and appetizers", color: "#8b5cf6", sortOrder: 5, isActive: true },
  ]);
  console.log("Categories created");

  const hotDrinksId = categories[0]._id;
  const coldDrinksId = categories[1]._id;
  const breakfastId = categories[2]._id;
  const mainCourseId = categories[3]._id;
  const dessertsId = categories[4]._id;
  const snacksId = categories[5]._id;

  await Product.insertMany([
    { name: "Espresso", description: "Strong Italian coffee", price: 250, categoryId: hotDrinksId, variants: [{ name: "Single", price: 250 }, { name: "Double", price: 350 }], isAvailable: true, isTaxable: true, sortOrder: 0 },
    { name: "Cappuccino", description: "Espresso with steamed milk foam", price: 350, categoryId: hotDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 1 },
    { name: "Latte", description: "Espresso with steamed milk", price: 400, categoryId: hotDrinksId, variants: [{ name: "Regular", price: 400 }, { name: "Large", price: 500 }], isAvailable: true, isTaxable: true, sortOrder: 2 },
    { name: "Chai Latte", description: "Spiced tea with steamed milk", price: 300, categoryId: hotDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 3 },
    { name: "Hot Chocolate", description: "Rich chocolate drink", price: 350, categoryId: hotDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 4 },
    { name: "Green Tea", description: "Healthy green tea", price: 200, categoryId: hotDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 5 },

    { name: "Iced Coffee", description: "Cold brewed coffee over ice", price: 400, categoryId: coldDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 0 },
    { name: "Mango Smoothie", description: "Fresh mango blended smoothie", price: 450, categoryId: coldDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 1 },
    { name: "Strawberry Shake", description: "Creamy strawberry milkshake", price: 500, categoryId: coldDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 2 },
    { name: "Fresh Orange Juice", description: "Freshly squeezed oranges", price: 350, categoryId: coldDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 3 },
    { name: "Lemonade", description: "Refreshing lemon drink", price: 250, categoryId: coldDrinksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 4 },

    { name: "Eggs Benedict", description: "Poached eggs on English muffin", price: 650, categoryId: breakfastId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 0 },
    { name: "Pancakes", description: "Fluffy pancakes with maple syrup", price: 500, categoryId: breakfastId, variants: [{ name: "Stack of 3", price: 500 }, { name: "Stack of 5", price: 700 }], isAvailable: true, isTaxable: true, sortOrder: 1 },
    { name: "French Toast", description: "Classic French toast with berries", price: 450, categoryId: breakfastId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 2 },
    { name: "Omelette", description: "Three egg omelette with veggies", price: 400, categoryId: breakfastId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 3 },
    { name: "Avocado Toast", description: "Smashed avocado on sourdough", price: 550, categoryId: breakfastId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 4 },

    { name: "Grilled Chicken", description: "Herb marinated grilled chicken", price: 950, categoryId: mainCourseId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 0 },
    { name: "Beef Steak", description: "Premium beef steak with sides", price: 1500, categoryId: mainCourseId, variants: [{ name: "Medium", price: 1500 }, { name: "Large", price: 1900 }], isAvailable: true, isTaxable: true, sortOrder: 1 },
    { name: "Pasta Carbonara", description: "Creamy bacon pasta", price: 750, categoryId: mainCourseId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 2 },
    { name: "Fish & Chips", description: "Crispy fish with fries", price: 850, categoryId: mainCourseId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 3 },
    { name: "Chicken Biryani", description: "Fragrant spiced rice with chicken", price: 700, categoryId: mainCourseId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 4 },
    { name: "Vegetable Curry", description: "Mixed vegetable curry with rice", price: 550, categoryId: mainCourseId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 5 },

    { name: "Chocolate Brownie", description: "Rich chocolate brownie", price: 350, categoryId: dessertsId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 0 },
    { name: "Cheesecake", description: "New York style cheesecake", price: 450, categoryId: dessertsId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 1 },
    { name: "Ice Cream Sundae", description: "Vanilla ice cream with toppings", price: 400, categoryId: dessertsId, variants: [{ name: "Single Scoop", price: 400 }, { name: "Double Scoop", price: 550 }], isAvailable: true, isTaxable: true, sortOrder: 2 },
    { name: "Tiramisu", description: "Italian coffee dessert", price: 500, categoryId: dessertsId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 3 },
    { name: "Gulab Jamun", description: "Sweet milk dumplings", price: 250, categoryId: dessertsId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 4 },

    { name: "French Fries", description: "Crispy golden fries", price: 300, categoryId: snacksId, variants: [{ name: "Regular", price: 300 }, { name: "Large", price: 450 }], isAvailable: true, isTaxable: true, sortOrder: 0 },
    { name: "Chicken Wings", description: "Spicy buffalo wings", price: 550, categoryId: snacksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 1 },
    { name: "Nachos", description: "Loaded nachos with cheese", price: 450, categoryId: snacksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 2 },
    { name: "Spring Rolls", description: "Crispy vegetable spring rolls", price: 350, categoryId: snacksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 3 },
    { name: "Garlic Bread", description: "Toasted garlic bread", price: 250, categoryId: snacksId, variants: [], isAvailable: true, isTaxable: true, sortOrder: 4 },
  ]);
  console.log("Products created");

  await Table.insertMany([
    { number: 1, name: "Table 1", capacity: 2, status: "available" },
    { number: 2, name: "Table 2", capacity: 2, status: "available" },
    { number: 3, name: "Table 3", capacity: 4, status: "available" },
    { number: 4, name: "Table 4", capacity: 4, status: "available" },
    { number: 5, name: "Table 5", capacity: 4, status: "available" },
    { number: 6, name: "Table 6", capacity: 6, status: "available" },
    { number: 7, name: "Table 7", capacity: 6, status: "available" },
    { number: 8, name: "Table 8", capacity: 8, status: "available" },
    { number: 9, name: "VIP Room", capacity: 10, status: "available" },
    { number: 10, name: "Outdoor 1", capacity: 4, status: "available" },
  ]);
  console.log("Tables created");

  await Counter.create({ _id: "orderNumber", seq: 0 });
  console.log("Counter initialized");

  console.log("Database seeded successfully!");
}

async function main() {
  try {
    await connectDB();
    await clearDatabase();
    await seedDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

main();
