import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User";
import Ad from "./models/Ad";

dotenv.config({ path: ".env.local" });

const MOCK_ADS = [
  // 📱 ELECTRONICS: Smartphones / Phones
  {
    title: "iPhone 15 Pro Max Titanium - 256GB",
    price: 115000,
    category: "Electronics",
    description: "Superb condition iPhone 15 Pro Max 256GB in Titanium Blue. Battery health at 98%. Includes original box, unused USB-C cable, and a premium case. Still under Apple warranty. Excellent smartphone.",
    locationName: "Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.8777, 19.0760] },
    images: ["https://images.unsplash.com/photo-1695048132801-b2866657c91c"],
    status: "active",
    yearsUsed: 0.5,
    isGroupBuy: false
  },
  {
    title: "Samsung Galaxy S24 Ultra Android Smartphone",
    price: 95000,
    category: "Electronics",
    description: "Titanium Gray Galaxy S24 Ultra with 512GB storage. Includes S-Pen. Excellent for productivity. No scratches or dents. Works like a charm. Perfect premium phone.",
    locationName: "Delhi, NCR",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
    images: ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf"],
    status: "active",
    yearsUsed: 0.2,
    isGroupBuy: true,
    groupBuyTarget: 5,
    groupBuyPrice: 88000
  },
  {
    title: "Google Pixel 8 Pro 5G Smartphone",
    price: 68000,
    category: "Electronics",
    description: "Bay Blue Google Pixel 8 Pro. 128GB. Best-in-class camera capabilities, clean stock Android experience. Extremely well maintained with screen guard since day 1.",
    locationName: "Bangalore, Karnataka",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },
  {
    title: "OnePlus 12 5G Smartphone - 16GB RAM",
    price: 55000,
    category: "Electronics",
    description: "Silky Black OnePlus 12 5G. 16GB RAM, 512GB storage. Lightning fast Snapdragon 8 Gen 3. Mint condition, used for only 2 months. Comes with 100W SUPERVOOC fast charger.",
    locationName: "Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.8567, 18.5204] },
    images: ["https://images.unsplash.com/photo-1565630916779-e303be97b6f5"],
    status: "active",
    yearsUsed: 0.2,
    isGroupBuy: true,
    groupBuyTarget: 4,
    groupBuyPrice: 50000
  },
  {
    title: "iPhone 13 Pro 128GB - Graphite",
    price: 45000,
    category: "Electronics",
    description: "Mint condition iPhone 13 Pro. 87% battery health. No scratches. Includes original box and premium leather back cover. Very handy smartphone.",
    locationName: "Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.8777, 19.0760] },
    images: ["https://images.unsplash.com/photo-1632661674596-df8be070a5c5"],
    status: "active",
    yearsUsed: 2,
    isGroupBuy: false
  },

  // 💻 ELECTRONICS: Laptops & Computers
  {
    title: "MacBook Pro M3 Pro 14-inch",
    price: 165000,
    category: "Electronics",
    description: "MacBook Pro 14-inch with Apple M3 Pro chip. 18GB Unified Memory, 512GB SSD. Space Black color. Zero scratches, battery cycle count only 18. Perfect laptop for programming, design and video editing.",
    locationName: "Bangalore, Karnataka",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8"],
    status: "active",
    yearsUsed: 0.5,
    isGroupBuy: false
  },
  {
    title: "Dell XPS 13 OLED Touch Laptop",
    price: 85000,
    category: "Electronics",
    description: "Stunning Dell XPS 13 Plus. Intel Core i7 13th Gen, 16GB RAM, 1TB SSD, 4K OLED Touch display. Sleek design, capacitive function row. In pristine condition.",
    locationName: "Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.8567, 18.5204] },
    images: ["https://images.unsplash.com/photo-1593642632823-8f785ba67e45"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },
  {
    title: "Lenovo Legion 5 Pro Gaming Laptop",
    price: 78000,
    category: "Electronics",
    description: "High-end gaming laptop. AMD Ryzen 7 6800H, NVIDIA RTX 3060, 16GB DDR5 RAM, 1TB SSD. 165Hz QHD display. Handles all modern games and heavy computing tasks with ease.",
    locationName: "Noida, UP",
    location: { type: "Point", coordinates: [77.3910, 28.5355] },
    images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302"],
    status: "active",
    yearsUsed: 1.5,
    isGroupBuy: false
  },
  {
    title: "MacBook Air M2 2022 - Space Grey",
    price: 75000,
    category: "Electronics",
    description: "Mint condition MacBook Air M2. Space grey color, 8GB RAM, 256GB SSD. Cycle count is 45. Box and original charger available. Light, slim laptop.",
    locationName: "Delhi, NCR",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
    images: ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9"],
    status: "active",
    yearsUsed: 1.5,
    isGroupBuy: false
  },

  // 🎮 ELECTRONICS: Gaming Consoles
  {
    title: "Sony PlayStation 5 Console Slim Disc Edition",
    price: 38000,
    category: "Electronics",
    description: "PS5 Slim Disc Edition. Standard 1TB storage. Comes with 2 DualSense wireless controllers, HDMI cable, and 2 free game discs (Spider-Man 2 and Gran Turismo 7). Awesome gaming console.",
    locationName: "Hyderabad, Telangana",
    location: { type: "Point", coordinates: [78.4867, 17.3850] },
    images: ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db"],
    status: "active",
    yearsUsed: 0.5,
    isGroupBuy: true,
    groupBuyTarget: 3,
    groupBuyPrice: 34000
  },
  {
    title: "Nintendo Switch OLED Edition Gaming Console",
    price: 22000,
    category: "Electronics",
    description: "Nintendo Switch OLED Model with Neon Blue and Neon Red Joy-Cons. Sparingly used, screen protector applied on day one. Includes travel case and Mario Odyssey. Portable gaming perfection.",
    locationName: "Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.8567, 18.5204] },
    images: ["https://images.unsplash.com/photo-1578301978693-85fa9c0320b9"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },
  {
    title: "Xbox Series X Console (1TB)",
    price: 35000,
    category: "Electronics",
    description: "Xbox Series X 1TB Console. 4K gaming powerhouse. In original box with all cables and one black controller. Includes Game Pass trial code.",
    locationName: "Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.8777, 19.0760] },
    images: ["https://images.unsplash.com/photo-1605901309584-818e25960a8f"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },

  // 📷 ELECTRONICS: Cameras & Photography
  {
    title: "Sony Alpha 7 III Mirrorless Camera Body",
    price: 98000,
    category: "Electronics",
    description: "Sony A7 III full-frame mirrorless camera body. Shutter count is 14,500. Well cared for, sensor is clean. Includes 2 batteries, charger, and strap. Great for professional photography and video.",
    locationName: "Bangalore, Karnataka",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32"],
    status: "active",
    yearsUsed: 2,
    isGroupBuy: true,
    groupBuyTarget: 2,
    groupBuyPrice: 90000
  },
  {
    title: "Canon EOS R6 Mirrorless Camera kit",
    price: 145000,
    category: "Electronics",
    description: "Canon EOS R6 paired with 24-105mm kit lens. Perfect high-end setup for wedding photography and vlogging. Includes lens hood, battery, charger, and 64GB fast card.",
    locationName: "Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.8777, 19.0760] },
    images: ["https://images.unsplash.com/photo-1616440347437-b1c73416efc2"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },
  {
    title: "DJI Osmo Pocket 3 Creator Combo Gimbal Camera",
    price: 48000,
    category: "Electronics",
    description: "Amazing pocket camera with 3-axis gimbal. Creator combo includes Mic 2 wireless transmitter, battery handle, mini tripod, and wide-angle lens adapter. Barely used.",
    locationName: "Bangalore, Karnataka",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    images: ["https://images.unsplash.com/photo-1542751371-adc38448a05e"],
    status: "active",
    yearsUsed: 0.3,
    isGroupBuy: false
  },
  {
    title: "Sony WH-1000XM4 Noise Cancelling Headphones",
    price: 15000,
    category: "Electronics",
    description: "Industry leading noise cancelling headphones in silver color. Rarely used, like new condition. Comes with carrying case, headphone jack cable, and flight adapter.",
    locationName: "Delhi, NCR",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df"],
    status: "active",
    yearsUsed: 0.5,
    isGroupBuy: false
  },

  // 🚗 VEHICLES: Cars, Bikes & Scooters
  {
    title: "Hyundai i20 Asta 2022 Car - Sunroof & DCT",
    price: 750000,
    category: "Vehicles",
    description: "Top-end Hyundai i20 automatic car. Single owner, driven 24,000 km. Full service history at authorized Hyundai service center. Sunroof, wireless charging, Bose speakers. Insurance valid.",
    locationName: "Bangalore, Karnataka",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    images: ["https://images.unsplash.com/photo-1549317661-bd32c8ce0be2"],
    status: "active",
    yearsUsed: 2,
    isGroupBuy: false
  },
  {
    title: "Honda City ZX CVT 2022 Premium Car",
    price: 1120000,
    category: "Vehicles",
    description: "Doctor driven Honda City car in premium white color. 18,500 km. Automatic CVT. Features ADAS, sunroof, lane-watch camera, clean leather seats. Zero accidents, fully insured.",
    locationName: "Delhi, NCR",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
    images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf"],
    status: "active",
    yearsUsed: 2,
    isGroupBuy: false
  },
  {
    title: "Tata Nexon EV Max Electric SUV Car",
    price: 1350000,
    category: "Vehicles",
    description: "Electric car with long-range battery (Max package). 437 km certified range. Driven 15,000 km. Home wall fast charger included. Eco-friendly and extremely cheap running costs.",
    locationName: "Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.8567, 18.5204] },
    images: ["https://images.unsplash.com/photo-1563720223185-11003d516935"],
    status: "active",
    yearsUsed: 1.5,
    isGroupBuy: false
  },
  {
    title: "Royal Enfield Meteor 350 Cruiser Bike",
    price: 165000,
    category: "Vehicles",
    description: "Superb cruiser motorcycle. Fireball Red color. 8,000 km driven. Regularly serviced. Installed touring seat and windshield for comfortable highway rides. Solid bike.",
    locationName: "Gurgaon, Haryana",
    location: { type: "Point", coordinates: [77.0266, 28.4595] },
    images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },
  {
    title: "Ather 450X Gen 3 Electric Scooter Bike",
    price: 110000,
    category: "Vehicles",
    description: "Electric scooter bike with high-speed performance. Mint green color. Warp mode is incredibly fun. 90 km real-world range. Battery health at 96%. Comes with portable home charger.",
    locationName: "Bangalore, Karnataka",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    images: ["https://images.unsplash.com/photo-1485965120184-e220f721d03e"],
    status: "active",
    yearsUsed: 1.5,
    isGroupBuy: true,
    groupBuyTarget: 4,
    groupBuyPrice: 102000
  },

  // 🏠 PROPERTY: Real Estate
  {
    title: "Cozy 1BHK Flat in Andheri East Mumbai",
    price: 8500000,
    category: "Property",
    description: "Beautiful 1BHK residential property apartment in prime location of Andheri East. 450 sq ft carpet area. Semi-furnished, modular kitchen, gas pipeline, and dedicated car parking.",
    locationName: "Andheri West, Mumbai",
    location: { type: "Point", coordinates: [72.8333, 19.1363] },
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
    status: "active",
    yearsUsed: 5,
    isGroupBuy: false
  },
  {
    title: "Spacious 3BHK Villa in Whitefield Bangalore",
    price: 16500000,
    category: "Property",
    description: "Luxury 3BHK villa property with private garden in a gated community. 2400 sq ft built-up area. Modern architecture, fully wooden flooring in master bedroom, amenities include clubhouse and pool.",
    locationName: "Koramangala, Bangalore",
    location: { type: "Point", coordinates: [77.6271, 12.9352] },
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750"],
    status: "active",
    yearsUsed: 2,
    isGroupBuy: false
  },
  {
    title: "Fully Furnished Commercial Office Space",
    price: 7500000,
    category: "Property",
    description: "Ready to move in commercial office space property of 1200 sq ft. Fully furnished with 15 workstations, manager cabin, conference room, pantry, and reception area.",
    locationName: "Koramangala, Bangalore",
    location: { type: "Point", coordinates: [77.6271, 12.9352] },
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c"],
    status: "active",
    yearsUsed: 3,
    isGroupBuy: false
  },

  // 🛋️ FURNITURE: Sofas, Tables, Beds & Chairs
  {
    title: "IKEA 3-Seater Sofa Bed Furniture",
    price: 14000,
    category: "Furniture",
    description: "Comfortable gray fabric sofa that easily converts into a double bed. IKEA furniture. Washable cover. Includes under-bed storage compartment for linens. Perfect for living room.",
    locationName: "Gurgaon, Haryana",
    location: { type: "Point", coordinates: [77.0266, 28.4595] },
    images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc"],
    status: "active",
    yearsUsed: 2,
    isGroupBuy: false
  },
  {
    title: "Solid Teak Wood Dining Table Furniture",
    price: 22000,
    category: "Furniture",
    description: "Beautiful 6-seater dining table crafted from high quality teak wood. Comes with 6 cushioned chairs. Traditional design, very sturdy furniture, minor wear on varnish.",
    locationName: "Noida, UP",
    location: { type: "Point", coordinates: [77.3910, 28.5355] },
    images: ["https://images.unsplash.com/photo-1617806118233-18e1de247200"],
    status: "active",
    yearsUsed: 3,
    isGroupBuy: false
  },
  {
    title: "Ergonomic High-Back Office Chair Furniture",
    price: 6500,
    category: "Furniture",
    description: "High-back mesh office chair. Fully adjustable lumbar support, 3D armrests, and headrest. High quality gas lift. Perfect ergonomics for work from home office setups.",
    locationName: "Chennai, Tamil Nadu",
    location: { type: "Point", coordinates: [80.2707, 13.0827] },
    images: ["https://images.unsplash.com/photo-1505797149-43b0069ec26b"],
    status: "active",
    yearsUsed: 0.8,
    isGroupBuy: false
  },
  {
    title: "Queen Size Hydraulic Bed with Storage Furniture",
    price: 18000,
    category: "Furniture",
    description: "Modern queen-size bed frame with ample hydraulic storage underneath. Premium wenge finish. Solid wood design. Dismantling and transport to be arranged by buyer.",
    locationName: "Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.8777, 19.0760] },
    images: ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },

  // 👗 FASHION: Shoes, Watches, Apparel
  {
    title: "Nike Air Jordan 1 Retro Sneakers Fashion",
    price: 12500,
    category: "Fashion",
    description: "Classic Jordan 1s in Chicago colorway. UK Size 9. Brand new condition fashion sneakers, only tried on once indoors. Original box and extra black/red laces included.",
    locationName: "Hyderabad, Telangana",
    location: { type: "Point", coordinates: [78.4867, 17.3850] },
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a"],
    status: "active",
    yearsUsed: 0,
    isGroupBuy: true,
    groupBuyTarget: 8,
    groupBuyPrice: 10500
  },
  {
    title: "Ray-Ban Classic Wayfarer Sunglasses Fashion",
    price: 5500,
    category: "Fashion",
    description: "Original black-framed Wayfarers with G-15 green polarized lenses. No scratches on lenses. Includes original leather case and cleaning cloth. Premium fashion accessory.",
    locationName: "Chennai, Tamil Nadu",
    location: { type: "Point", coordinates: [80.2707, 13.0827] },
    images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },
  {
    title: "Fossil Gen 6 Smartwatch Stainless Steel",
    price: 98000, // Wait, smartwatch is ₹9,800 not ₹98,000! Let's make it ₹9,800
    category: "Fashion",
    description: "Fossil Gen 6 smoke stainless steel smartwatch. WearOS by Google. Bluetooth calling, SpO2 sensor, heart rate tracking. 1.28-inch AMOLED display. Stylish fashion wear.",
    locationName: "Delhi, NCR",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30"],
    status: "active",
    yearsUsed: 0.5,
    isGroupBuy: false
  },
  {
    title: "Premium Men's Leather Biker Jacket Fashion",
    price: 4500,
    category: "Fashion",
    description: "Genuine sheepskin black leather jacket. Size L. Fitted biker style design. Warm lining, heavy zippers. Excellent condition fashion wear, worn only a few times last winter.",
    locationName: "Delhi, NCR",
    location: { type: "Point", coordinates: [77.2090, 28.6139] },
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  },

  // 🏋️ FITNESS: Workout & Gym Gear
  {
    title: "Adjustable Dumbbells Set 24kg Fitness Gym",
    price: 9500,
    category: "Fitness",
    description: "Set of 2 adjustable dumbbells replacing 15 individual weights. Turn dial to change weight from 2.5kg to 24kg. Perfect for home gym strength training and general fitness.",
    locationName: "Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.8567, 18.5204] },
    images: ["https://images.unsplash.com/photo-1638536532686-d610adfc8e5c"],
    status: "active",
    yearsUsed: 0.5,
    isGroupBuy: false
  },
  {
    title: "Cultsport Exercise Spin Bike Fitness Cardio",
    price: 12000,
    category: "Fitness",
    description: "Magnetic resistance spin bike for cardio workouts. Connects via Bluetooth to tracking apps. Comfortable seat, heavy flywheel. Excellent fitness condition.",
    locationName: "Hyderabad, Telangana",
    location: { type: "Point", coordinates: [78.4867, 17.3850] },
    images: ["https://images.unsplash.com/photo-1517838277536-f5f99be501cd"],
    status: "active",
    yearsUsed: 1,
    isGroupBuy: false
  }
];

// Correct the Fossil smartwatch price to 9800 instead of 98000
const fossilIndex = MOCK_ADS.findIndex(ad => ad.title.includes("Fossil Gen 6"));
if (fossilIndex !== -1) {
  MOCK_ADS[fossilIndex].price = 9800;
}

async function seed() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not found in .env.local");

    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully!");

    // Check if there are users
    let user = await User.findOne();
    if (!user) {
      console.log("No users found. Creating a default test seller user...");
      user = await User.create({
        name: "Demo Seller",
        email: "demo_seller@bazaari.com",
        password: "$2a$10$dummyhashedpasswordvalue1234567890", // dummy bcrypt hash
        role: "seller"
      });
      console.log("Default user created:", user.email);
    } else {
      console.log("Found existing user:", user.email);
    }

    // Clear existing Ads to avoid duplicating data
    console.log("Clearing existing Ads from collection...");
    const deleteRes = await Ad.deleteMany({});
    console.log(`Cleared ${deleteRes.deletedCount} old ads.`);

    // Map ads to the retrieved/created user
    const adsToInsert = MOCK_ADS.map(ad => ({ ...ad, user: user._id }));

    // Insert rich mock ads
    console.log(`Inserting ${adsToInsert.length} rich mock listings...`);
    const result = await Ad.insertMany(adsToInsert);
    console.log(`Successfully inserted ${result.length} mock ads!`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB. Seeding process complete.");
  } catch (err) {
    console.error("Seeding Error:", err);
    process.exit(1);
  }
}

seed();
