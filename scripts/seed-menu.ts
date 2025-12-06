import mongoose from "mongoose";
import { Category, Product } from "../server/models";

const MONGO_URI = process.env.MONGO_URI || "";

const categories = [
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

const menuItems: { category: string; name: string; price: number; variants?: { name: string; price: number }[] }[] = [
  // Break Fast
  { category: "Break Fast", name: "Whole Wheat Paratha", price: 80 },
  { category: "Break Fast", name: "Allu Paratha", price: 150 },
  { category: "Break Fast", name: "Allu Cheese Paratha", price: 220 },
  { category: "Break Fast", name: "Chicken Paratha", price: 250 },
  { category: "Break Fast", name: "Chicken Cheese Paratha", price: 300 },
  { category: "Break Fast", name: "Saag Paratha", price: 250 },
  { category: "Break Fast", name: "Fry Egg", price: 80 },
  { category: "Break Fast", name: "Omelette", price: 90 },
  { category: "Break Fast", name: "Cheese Omelette", price: 150 },

  // Halwa Pori Nashta
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

  // Hot Wings
  { category: "Hot Wings", name: "Masala Hot Wings (6 pcs)", price: 650 },
  { category: "Hot Wings", name: "Sesame Seed Hot Wings (6 pcs)", price: 780 },
  { category: "Hot Wings", name: "Garlic B.B.Q Wings (6 pcs)", price: 850 },

  // Fries / Refreshment
  { category: "Fries / Refreshment", name: "Plain Fries", price: 200, variants: [{ name: "Regular", price: 200 }, { name: "Large", price: 400 }] },
  { category: "Fries / Refreshment", name: "Masala Fries", price: 220, variants: [{ name: "Regular", price: 220 }, { name: "Large", price: 440 }] },
  { category: "Fries / Refreshment", name: "Garlic Mayo Fries", price: 250, variants: [{ name: "Regular", price: 250 }, { name: "Large", price: 450 }] },
  { category: "Fries / Refreshment", name: "Sesame Seed Fries", price: 250, variants: [{ name: "Regular", price: 250 }, { name: "Large", price: 499 }] },
  { category: "Fries / Refreshment", name: "Samosa Plate", price: 180 },
  { category: "Fries / Refreshment", name: "Pakoray 250g", price: 220 },
  { category: "Fries / Refreshment", name: "Chicken Pakoray 250g", price: 400 },

  // Salad
  { category: "Salad", name: "Green Salad", price: 100 },
  { category: "Salad", name: "Mint Raita", price: 120 },
  { category: "Salad", name: "Mint Sauce", price: 140 },

  // Tandoor
  { category: "Tandoor", name: "Roti", price: 25 },
  { category: "Tandoor", name: "Naan", price: 30 },
  { category: "Tandoor", name: "Chapati", price: 70 },
  { category: "Tandoor", name: "Tawa Paratha", price: 80 },
  { category: "Tandoor", name: "Roghni Naan", price: 70 },
  { category: "Tandoor", name: "Tandoori Paratha", price: 70 },
  { category: "Tandoor", name: "Kulcha", price: 50 },

  // Main Course
  { category: "Main Course", name: "Beef Nehari", price: 700 },
  { category: "Main Course", name: "Lahori Chanay", price: 300 },
  { category: "Main Course", name: "Special Daal", price: 350 },
  { category: "Main Course", name: "Special Sabzi", price: 350 },
  { category: "Main Course", name: "Chicken Qorma", price: 450 },
  { category: "Main Course", name: "Chicken Haleem", price: 480 },
  { category: "Main Course", name: "Chicken Qeema", price: 480 },
  { category: "Main Course", name: "Chicken Jalfarezi", price: 590 },
  { category: "Main Course", name: "Chicken Madrasi", price: 950 },

  // Karahi
  { category: "Karahi", name: "Chicken Karahi", price: 1150, variants: [{ name: "Half", price: 1150 }, { name: "Full", price: 2250 }] },
  { category: "Karahi", name: "Chicken Handi", price: 1490, variants: [{ name: "Half", price: 1490 }, { name: "Full", price: 2790 }] },
  { category: "Karahi", name: "Desi Murgh Karahi", price: 1900, variants: [{ name: "Half", price: 1900 }, { name: "Full", price: 3700 }] },
  { category: "Karahi", name: "Mutton Karahi", price: 1950, variants: [{ name: "Half", price: 1950 }, { name: "Full", price: 3800 }] },

  // Rice
  { category: "Rice", name: "Daal Chawal", price: 450 },
  { category: "Rice", name: "Plain Rice", price: 300 },
  { category: "Rice", name: "Chicken Pulao", price: 480 },
  { category: "Rice", name: "Chicken Bariyani", price: 500 },
  { category: "Rice", name: "Chicken Fried Rice", price: 600 },
  { category: "Rice", name: "Egg Fried Rice", price: 500 },
  { category: "Rice", name: "Plain Bariyani", price: 300 },

  // Fish
  { category: "Fish", name: "Rahu Grilled Fish 1kg", price: 1850 },
  { category: "Fish", name: "Rahu Fried Fish 1kg", price: 2000 },
  { category: "Fish", name: "Finger Fried Fish 1kg", price: 2350 },

  // B.B.Q
  { category: "B.B.Q", name: "Chicken Tikka Boti", price: 200 },
  { category: "B.B.Q", name: "Chicken Malai Boti", price: 400 },
  { category: "B.B.Q", name: "Chicken Tikka Piece Leg", price: 370 },
  { category: "B.B.Q", name: "Chicken Tikka Piece Chest", price: 380 },
  { category: "B.B.Q", name: "Chicken Tikka Per Plate", price: 400 },
  { category: "B.B.Q", name: "Malai Boti 6 Seekh", price: 2400 },

  // Burger
  { category: "Burger", name: "Zinger Burger with Fries", price: 350 },
  { category: "Burger", name: "Beef Smash Burger with Fries", price: 400 },
  { category: "Burger", name: "Crispy Chicken Patty Burger with Fries", price: 350 },
  { category: "Burger", name: "Anda Shami Burger", price: 220 },

  // Shawarma
  { category: "Shawarma", name: "Chicken Shawarma", price: 220 },
  { category: "Shawarma", name: "Chicken Cheese Shawarma", price: 300 },
  { category: "Shawarma", name: "Zinger Shawarma", price: 300 },
  { category: "Shawarma", name: "Shawarma Platter", price: 480 },

  // Roll Paratha
  { category: "Roll Paratha", name: "Garlic Mayo Roll", price: 350 },
  { category: "Roll Paratha", name: "B.B.Q Paratha Roll", price: 400 },
  { category: "Roll Paratha", name: "Zinger Paratha Roll", price: 380 },

  // Fried Chicken
  { category: "Fried Chicken", name: "Chicken Hot Shots", price: 450, variants: [{ name: "Half", price: 450 }, { name: "Full", price: 800 }] },
  { category: "Fried Chicken", name: "Chicken Fried 2 Piece with Fries", price: 499 },
  { category: "Fried Chicken", name: "Chicken Fried 6 Piece with Fries", price: 1250 },
  { category: "Fried Chicken", name: "Nuggets 6 Pcs with Fries", price: 499 },

  // Drinks
  { category: "Drinks", name: "Mint Margarita", price: 350 },
  { category: "Drinks", name: "Lassi", price: 260 },
  { category: "Drinks", name: "Seasonal Shake", price: 450 },
  { category: "Drinks", name: "Cold Drink Can", price: 150 },
  { category: "Drinks", name: "Cold Drink 1Ltr", price: 180 },
  { category: "Drinks", name: "Cold Drink 1.5 Ltr", price: 250 },
  { category: "Drinks", name: "Mineral Water Large", price: 110 },
  { category: "Drinks", name: "Mineral Water Small", price: 70 },

  // Sweet
  { category: "Sweet", name: "DBC Special Kheer", price: 320, variants: [{ name: "Small", price: 320 }, { name: "Large", price: 580 }] },
  { category: "Sweet", name: "DBC Special Gajar Halwa 250g", price: 900 },
];

async function seedDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Delete existing categories and products
    console.log("Deleting existing products...");
    await Product.deleteMany({});
    console.log("Deleting existing categories...");
    await Category.deleteMany({});

    // Create categories
    console.log("Creating categories...");
    const createdCategories = await Category.insertMany(
      categories.map((cat) => ({
        name: cat.name,
        color: cat.color,
        sortOrder: cat.sortOrder,
        isActive: true,
      }))
    );
    console.log(`Created ${createdCategories.length} categories`);

    // Create a map of category names to IDs
    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    createdCategories.forEach((cat) => {
      categoryMap.set(cat.name, cat._id as mongoose.Types.ObjectId);
    });

    // Create products
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

    console.log("\n=== Seeding Complete ===");
    console.log(`Categories: ${createdCategories.length}`);
    console.log(`Products: ${createdProducts.length}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seedDatabase();
