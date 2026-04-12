
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://rrrr987368_db_user:z2DsysK7PCmcZLGz@ac-refsx23-shard-00-00.pw4nxac.mongodb.net:27017,ac-refsx23-shard-00-01.pw4nxac.mongodb.net:27017,ac-refsx23-shard-00-02.pw4nxac.mongodb.net:27017/?ssl=true&replicaSet=atlas-qbut3z-shard-0&authSource=admin&appName=bazzari';

const sampleAds = [
  {
    title: "iPhone 13 Pro - 128GB - Graphite",
    price: 45000,
    category: "Electronics",
    description: "Mint condition iPhone 13 Pro. 87% battery health. No scratches. Includes original box.",
    locationName: "Mumbai, Maharashtra",
    location: { type: "Point", coordinates: [72.8777, 19.0760] },
    user: new mongoose.Types.ObjectId(), // Placeholder
    images: ["https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&q=80&w=800"],
    status: "active",
    yearsUsed: 1
  },
  {
    title: "MacBook Air M1 - Silver",
    price: 52000,
    category: "Electronics",
    description: "MacBook Air with M1 chip. 8GB RAM, 256GB SSD. Perfect for students and light work.",
    locationName: "Bangalore, Karnataka",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    user: new mongoose.Types.ObjectId(), // Placeholder
    images: ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800"],
    status: "active",
    yearsUsed: 2
  },
  {
    title: "Sony WH-1000XM4 Headphones",
    price: 15000,
    category: "Electronics",
    description: "Industry leading noise cancelling headphones. Rarely used, like new condition.",
    locationName: "Delhi, NCR",
    location: { type: "Point", coordinates: [77.1025, 28.7041] },
    user: new mongoose.Types.ObjectId(), // Placeholder
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800"],
    status: "active",
    yearsUsed: 0.5
  },
  {
    title: "Gaming Chair - Ergonomic",
    price: 8000,
    category: "Furniture",
    description: "Comfortable gaming chair with lumbar support and headrest. Adjustable height.",
    locationName: "Pune, Maharashtra",
    location: { type: "Point", coordinates: [73.8567, 18.5204] },
    user: new mongoose.Types.ObjectId(), // Placeholder
    images: ["https://images.unsplash.com/photo-1598550476439-68477852ce66?auto=format&fit=crop&q=80&w=800"],
    status: "active",
    yearsUsed: 1
  },
  {
    title: "Samsung Galaxy Tab S7",
    price: 28000,
    category: "Electronics",
    description: "High performance tablet with S-Pen. Great for sketching and taking notes.",
    locationName: "Chennai, Tamil Nadu",
    location: { type: "Point", coordinates: [80.2707, 13.0827] },
    user: new mongoose.Types.ObjectId(), // Placeholder
    images: ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800"],
    status: "active",
    yearsUsed: 1.5
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    // Create a user for the ads
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ name: String }));
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
        testUser = await User.create({ name: 'Test User', email: 'test@example.com' });
    }

    const AdSchema = new mongoose.Schema({
        title: String,
        price: Number,
        category: String,
        description: String,
        locationName: String,
        location: { type: { type: String }, coordinates: [Number] },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        images: [String],
        status: String,
        yearsUsed: Number
    });
    
    const Ad = mongoose.models.Ad || mongoose.model('Ad', AdSchema);

    for (const adData of sampleAds) {
      adData.user = testUser._id;
      await Ad.create(adData);
      console.log(`Created ad: ${adData.title}`);
    }

    console.log('Seeding complete!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error seeding:', err);
  }
}

seed();
