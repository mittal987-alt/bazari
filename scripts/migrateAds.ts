import "./env";

import mongoose from "mongoose";

async function migrateAds() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) throw new Error("MONGO_URI is not defined in .env.local");

  const connection = mongoose.connection;

  // Connect once, then grab both databases from the same connection/client
  await mongoose.connect(MONGO_URI, { dbName: "bazzari" });
  console.log("Connected.");

  const client = connection.getClient();
  const testDb = client.db("test");
  const bazzariDb = client.db("bazzari");

  const testAdsCollection = testDb.collection("ads");
  const bazzariAdsCollection = bazzariDb.collection("ads");

  const adsToMigrate = await testAdsCollection.find({}).toArray();
  console.log(`Found ${adsToMigrate.length} ads in test.ads to migrate.`);

  if (adsToMigrate.length === 0) {
    console.log("Nothing to migrate.");
    process.exit(0);
  }

  // Check which _ids already exist in bazzari.ads to avoid duplicate key errors
  const existingIds = new Set(
    (await bazzariAdsCollection.find({}, { projection: { _id: 1 } }).toArray()).map((d) =>
      d._id.toString()
    )
  );

  const newAds = adsToMigrate.filter((ad) => !existingIds.has(ad._id.toString()));
  console.log(`${newAds.length} of these are new (not already in bazzari.ads).`);

  if (newAds.length === 0) {
    console.log("All ads already present in bazzari.ads. Nothing to insert.");
    process.exit(0);
  }

  const result = await bazzariAdsCollection.insertMany(newAds, { ordered: false });
  console.log(`Inserted ${result.insertedCount} ads into bazzari.ads.`);

  process.exit(0);
}

migrateAds().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});