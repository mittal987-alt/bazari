export interface PriceBenchmark {
  productName: string;
  keywords: string[];
  avgNew: number;
  avgUsed: number;
  minUsed: number;
  maxUsed: number;
}

export const marketBenchmarks: PriceBenchmark[] = [
  {
    productName: "iPhone 15",
    keywords: ["iphone 15", "iphone15"],
    avgNew: 65000,
    avgUsed: 42000,
    minUsed: 35000,
    maxUsed: 48000,
  },
  {
    productName: "iPhone 14",
    keywords: ["iphone 14", "iphone14"],
    avgNew: 55000,
    avgUsed: 35000,
    minUsed: 28000,
    maxUsed: 40000,
  },
  {
    productName: "Samsung S24",
    keywords: ["s24", "galaxy s24"],
    avgNew: 70000,
    avgUsed: 45000,
    minUsed: 38000,
    maxUsed: 52000,
  },
  {
    productName: "Sony PS5",
    keywords: ["ps5", "playstation 5"],
    avgNew: 50000,
    avgUsed: 38000,
    minUsed: 32000,
    maxUsed: 44000,
  },
  {
    productName: "MacBook Air M1",
    keywords: ["macbook air m1"],
    avgNew: 70000,
    avgUsed: 45000,
    minUsed: 40000,
    maxUsed: 50000,
  },
  {
    productName: "MacBook Air M2",
    keywords: ["macbook air m2"],
    avgNew: 90000,
    avgUsed: 65000,
    minUsed: 58000,
    maxUsed: 72000,
  }
];

export function findBenchmark(query: string) {
  const normalizedQuery = query.toLowerCase();
  return marketBenchmarks.find(b => 
    b.keywords.some(k => normalizedQuery.includes(k))
  );
}
