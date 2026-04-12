
async function testBudgetAI() {
  try {
    const budget = 50000;
    const query = "apple phone";
    
    console.log(`Testing Budget AI with budget: ₹${budget}, query: "${query}"...`);
    
    const response = await fetch("http://localhost:3000/api/ai/budget-deals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ budget, query }),
    });

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Full Response:", JSON.stringify(data, null, 2));

    if (data.success && data.recommendations && data.recommendations.length > 0) {
        const first = data.recommendations[0];
        if (first.ad && first.ad._id) {
            console.log("✅ Success: Recommendation linked to Ad ID:", first.ad._id);
        } else {
            console.log("❌ Failed: Recommendation NOT linked to Ad object.");
        }
    } else {
        console.log("⚠️ No recommendations found or error occurred.");
    }
  } catch (err) {
    console.error("Test Error:", err.message);
  }
}

testBudgetAI();
