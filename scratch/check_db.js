
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://rrrr987368_db_user:z2DsysK7PCmcZLGz@ac-refsx23-shard-00-00.pw4nxac.mongodb.net:27017,ac-refsx23-shard-00-01.pw4nxac.mongodb.net:27017,ac-refsx23-shard-00-02.pw4nxac.mongodb.net:27017/?ssl=true&replicaSet=atlas-qbut3z-shard-0&authSource=admin&appName=bazzari';

async function checkAds() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');
    
    // We can't easily import the model here because of TS/ESM issues in a scratch script
    // So we'll define a quick schema
    const Ad = mongoose.models.Ad || mongoose.model('Ad', new mongoose.Schema({
      price: Number,
      status: String,
      title: String
    }));

    const count = await Ad.countDocuments({ status: 'active' });
    console.log(`Total active ads: ${count}`);

    if (count > 0) {
      const samples = await Ad.find({ status: 'active' }).limit(5).select('title price');
      console.log('Sample ads:', JSON.stringify(samples, null, 2));
      
      const minPrice = await Ad.findOne({ status: 'active' }).sort({ price: 1 }).select('price');
      const maxPrice = await Ad.findOne({ status: 'active' }).sort({ price: -1 }).select('price');
      console.log(`Price range: ${minPrice?.price} to ${maxPrice?.price}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkAds();
