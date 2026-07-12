import "./env";

import { generateEmbedding, searchAds } from "../services/ai.service";

async function test() {
  const query = "show me vehicles";
  console.log(`Testing query: "${query}"`);

  const embedding = await generateEmbedding(query);
  console.log(`Embedding generated. Length: ${embedding.length}, first 5 values:`, embedding.slice(0, 5));

  const isAllZero = embedding.every((v) => v === 0);
  console.log(`Is embedding all zeros (fallback)? ${isAllZero}`);

  const results = await searchAds(embedding);
  console.log(`Search returned ${results.length} results.`);
  results.forEach((ad: any, i: number) => {
    console.log(`  [${i + 1}] ${ad.title} - ₹${ad.price} - ${ad.category}`);
  });

  process.exit(0);
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});