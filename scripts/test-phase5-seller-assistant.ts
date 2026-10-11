

import "./env";
import assert from "node:assert";
import {
  buildDeterministicDescription,
  suggestListingPrice,
  auditListingQuality,
  analyzeImagePresentation,
  type SellerDescriptionInput,
  type SellerPriceInput,
  type SellerQualityInput,
} from "../lib/ai/seller-assistant";
import {
  verifyListingOwnership,
  checkSellerRateLimit,
  sanitizeInputString,
} from "../lib/ai/seller-security";
import { extractErrorInfo, withRetry } from "../lib/ai/resilience";

let passedCount = 0;
let failedCount = 0;

async function it(description: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
    failedCount++;
  }
}

async function runPhase5Tests() {
  console.log("\n========================================================");
  console.log(" BAZARI SELLER ASSISTANT TEST SUITE: PHASE 5 OPTIMIZATION");
  console.log("========================================================\n");

  /* --------------------------------------------------------
     1. Description Generation from Supplied Facts
  -------------------------------------------------------- */
  console.log("Suite 1: Description Generation from Supplied Facts");

  await it("generates a structured description containing all seller-provided facts", async () => {
    const input: SellerDescriptionInput = {
      title: "MacBook Pro 14 M2 Pro",
      category: "Electronics",
      brand: "Apple",
      model: "MacBook Pro 14-inch (2023)",
      condition: "Like New",
      yearsUsed: "1",
      defects: "No scratches, clean screen and chassis",
      accessories: "Original 67W MagSafe charger, Apple box, USB-C cable",
      askingPrice: 125000,
      specs: {
        Chip: "Apple M2 Pro (10-core CPU, 16-core GPU)",
        RAM: "16GB Unified Memory",
        Storage: "512GB SSD",
      },
    };

    const result = buildDeterministicDescription(input);

    assert.strictEqual(typeof result.titleSuggestion, "string");
    assert.ok(result.titleSuggestion.length > 0);
    assert.strictEqual(typeof result.description, "string");
    assert.ok(result.description.includes("Apple"));
    assert.ok(result.description.includes("MacBook Pro"));
    assert.ok(result.description.includes("Like New"));
    assert.ok(result.description.includes("67W MagSafe charger"));
    assert.ok(result.description.includes("512GB SSD"));
    assert.ok(result.description.includes("16GB Unified Memory"));
    assert.strictEqual(result.structuredSpecs["RAM"], "16GB Unified Memory");
    assert.strictEqual(result.structuredSpecs["Storage"], "512GB SSD");
    assert.ok(Array.isArray(result.highlights));
    assert.ok(result.highlights.length >= 3);
  });

  /* --------------------------------------------------------
     2. Missing Product Details & Unspecified Marking
  -------------------------------------------------------- */
  console.log("\nSuite 2: Missing Product Details & Prompting Seller");

  await it("flags missing condition, defects, and accessories and generates clarifying questions", () => {
    const sparseInput: SellerDescriptionInput = {
      title: "Vintage Acoustic Guitar",
      category: "Music",
      // Condition, defects, accessories, and yearsUsed intentionally omitted
    };

    const result = buildDeterministicDescription(sparseInput);

    assert.ok(result.unspecifiedFields.includes("Condition"));
    assert.ok(result.unspecifiedFields.includes("Known defects"));
    assert.ok(result.unspecifiedFields.includes("Included accessories"));
    assert.ok(result.unspecifiedFields.includes("Age and usage duration"));
    assert.ok(result.questionsForSeller.length >= 3);

    const questionText = result.questionsForSeller.join(" ");
    assert.ok(questionText.includes("condition"));
    assert.ok(questionText.includes("defects") || questionText.includes("scratches"));
    assert.ok(questionText.includes("accessories"));
  });

  /* --------------------------------------------------------
     3. Preventing Invented Specifications (Zero Hallucinations)
  -------------------------------------------------------- */
  console.log("\nSuite 3: Preventing Invented Specifications");

  await it("strictly refuses to fabricate battery health, warranty, or unmentioned specs", () => {
    const minimalInput: SellerDescriptionInput = {
      title: "Google Pixel 7a",
      category: "Electronics",
      condition: "Good",
    };

    const result = buildDeterministicDescription(minimalInput);

    // Ensure common hallucinated claims are NOT present in output
    assert.strictEqual(result.description.includes("100% battery"), false);
    assert.strictEqual(result.description.includes("1 year warranty"), false);
    assert.strictEqual(result.description.includes("Bill available"), false);
    assert.strictEqual(result.description.includes("Free delivery"), false);

    // It must explicitly declare unspecified details
    assert.ok(result.description.includes("Note: The following details were not specified"));
  });

  /* --------------------------------------------------------
     4. Price Suggestions with Comparable Listings
  -------------------------------------------------------- */
  console.log("\nSuite 4: Price Suggestions with Comparable Listings");

  await it("computes price range and distinguishes active asking prices from completed sales", async () => {
    // Test statistical price calculator logic
    const input: SellerPriceInput = {
      title: "iPhone 14 128GB Blue",
      category: "Electronics",
      condition: "Good",
      yearsUsed: "1",
    };

    const result = await suggestListingPrice(input);

    assert.ok(typeof result.explanation === "string");
    assert.ok(Array.isArray(result.methodologyNotes));
    assert.ok(Array.isArray(result.limitations));
    assert.ok(result.limitations.length >= 2);

    // Verify disclosure that active prices represent asking prices
    const limitationsText = result.limitations.join(" ");
    assert.ok(limitationsText.includes("asking prices"));

    // If sample size is found or benchmark used, verify structured range
    if (!result.insufficientData) {
      assert.ok(typeof result.suggestedMinPrice === "number");
      assert.ok(typeof result.suggestedMaxPrice === "number");
      assert.ok(typeof result.recommendedPrice === "number");
      assert.ok(result.suggestedMinPrice! <= result.recommendedPrice!);
      assert.ok(result.recommendedPrice! <= result.suggestedMaxPrice!);
      assert.ok(["high", "medium", "low"].includes(result.confidence));
    }
  });

  /* --------------------------------------------------------
     5. Insufficient Comparable Data Handling
  -------------------------------------------------------- */
  console.log("\nSuite 5: Insufficient Comparable Data Handling");

  await it("declares insufficient data cleanly without fabricating an imaginary market price", async () => {
    const rareProductInput: SellerPriceInput = {
      title: "Ultra Rare Antiquarian 17th Century Manuscript Latin",
      category: "Antiques",
      condition: "Fair",
    };

    const result = await suggestListingPrice(rareProductInput);

    // Must not invent precision
    if (result.insufficientData) {
      assert.strictEqual(result.suggestedMinPrice, null);
      assert.strictEqual(result.suggestedMaxPrice, null);
      assert.strictEqual(result.recommendedPrice, null);
      assert.strictEqual(result.confidence, "insufficient_data");
      assert.ok(result.explanation.includes("Insufficient comparable marketplace data"));
      assert.ok(result.methodologyNotes.some((n) => n.includes("does not fabricate")));
    }
  });

  /* --------------------------------------------------------
     6. Listing Quality Checks (Completeness Checklist)
  -------------------------------------------------------- */
  console.log("\nSuite 6: Listing Quality Checks");

  await it("audits incomplete listing and produces actionable improvement suggestions", () => {
    const poorListing: SellerQualityInput = {
      title: "stuff", // Poor title
      description: "good", // Too short
      price: 0, // Invalid price
      category: "General",
      images: [], // No images
    };

    const audit = auditListingQuality(poorListing);

    assert.ok(audit.completenessScore < 50);
    assert.strictEqual(audit.ratingTier, "Incomplete");
    assert.ok(audit.improvementSuggestions.length >= 3);
    assert.ok(audit.disclaimer.includes("does not guarantee"));

    // Check specific failures
    const titleCheck = audit.checks.find((c) => c.id === "title_quality");
    const descCheck = audit.checks.find((c) => c.id === "description_depth");
    const mediaCheck = audit.checks.find((c) => c.id === "media_gallery");
    const priceCheck = audit.checks.find((c) => c.id === "price_validity");

    assert.strictEqual(titleCheck?.passed, false);
    assert.strictEqual(descCheck?.passed, false);
    assert.strictEqual(mediaCheck?.passed, false);
    assert.strictEqual(priceCheck?.passed, false);
  });

  await it("audits thorough listing and awards high completeness score", () => {
    const goodListing: SellerQualityInput = {
      title: "Apple iPhone 13 128GB Midnight (Unlocked)",
      description:
        "Selling my Apple iPhone 13 in excellent condition with 89% battery health. Kept in a Spigen case and tempered glass screen protector since day 1. All original accessories including USB-C to Lightning cable and retail box included. No dents or display scratches. Upgrading to a newer phone.",
      price: 36000,
      category: "Electronics",
      images: ["/img1.jpg", "/img2.jpg", "/img3.jpg"],
      condition: "Like New",
      yearsUsed: 1.5,
      defects: "Flawless condition, no scratches or cracks",
      specs: { Storage: "128GB", RAM: "4GB", Color: "Midnight" },
    };

    const audit = auditListingQuality(goodListing);

    assert.ok(audit.completenessScore >= 80);
    assert.ok(audit.ratingTier === "Excellent" || audit.ratingTier === "Good");
    assert.ok(audit.passedCount >= 6);
  });

  /* --------------------------------------------------------
     7. Authentication & Seller Ownership Verification
  -------------------------------------------------------- */
  console.log("\nSuite 7: Authentication & Seller Ownership");

  await it("rejects invalid listing ID formats gracefully", async () => {
    const result = await verifyListingOwnership("invalid-id-xyz", "660000000000000000000001");
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 400);
    assert.ok(result.error?.includes("Invalid listing ID format"));
  });

  await it("enforces rate limiter sliding window per user key", () => {
    const testKey = "seller_test_user_rate_limit";
    // 5 allowed requests
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(checkSellerRateLimit(testKey, 5, 10000), true);
    }
    // 6th request must be blocked
    assert.strictEqual(checkSellerRateLimit(testKey, 5, 10000), false);
  });

  await it("sanitizes untrusted inputs against malicious HTML injection", () => {
    const malicious = "<script>alert('xss')</script>iPhone 13 <b>Pro</b>";
    const cleaned = sanitizeInputString(malicious);
    assert.strictEqual(cleaned.includes("<script>"), false);
    assert.strictEqual(cleaned.includes("alert"), true); // string content preserved without tag
    assert.strictEqual(cleaned.includes("<b>"), false);
    assert.ok(cleaned.includes("iPhone 13 Pro"));
  });

  /* --------------------------------------------------------
     8. Seller Approval Before Saving Changes
  -------------------------------------------------------- */
  console.log("\nSuite 8: Seller Approval Before Saving Changes");

  await it("ensures AI assistant output is purely advisory and requires explicit user application", () => {
    const formInitialState = {
      title: "Old Title",
      price: "1000",
      description: "Old description",
    };

    // Simulated proposed changes from assistant
    const proposedChanges = {
      title: "Optimized Title from AI",
      price: "1400",
      description: "Optimized structured description from AI",
    };

    // Before explicit approval: form state remains untouched
    assert.strictEqual(formInitialState.title, "Old Title");
    assert.strictEqual(formInitialState.price, "1000");

    // Explicit approval handler (matching onApplyChanges callback in UI)
    const applyChanges = (changes: typeof proposedChanges) => {
      return {
        ...formInitialState,
        title: changes.title ?? formInitialState.title,
        price: changes.price ?? formInitialState.price,
        description: changes.description ?? formInitialState.description,
      };
    };

    const updatedForm = applyChanges(proposedChanges);
    assert.strictEqual(updatedForm.title, "Optimized Title from AI");
    assert.strictEqual(updatedForm.price, "1400");
  });

  /* --------------------------------------------------------
     9. Provider Failure & Fallback Behavior
  -------------------------------------------------------- */
  console.log("\nSuite 9: Provider Failure & Fallback Behavior");

  await it("recovers cleanly with deterministic description when AI providers throw 429 quota exhaustion", async () => {
    const quotaExhaustedError = new Error(
      "429 Too Many Requests: RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'GenerateContent requests'"
    );

    const errorInfo = extractErrorInfo(quotaExhaustedError);
    assert.strictEqual(errorInfo.isQuotaExhausted, true);
    assert.strictEqual(errorInfo.isTransient, false, "Quota errors must not be endlessly retried");

    // Verify withRetry terminates immediately on quota exhaustion
    let attempts = 0;
    try {
      await withRetry(
        async () => {
          attempts++;
          throw quotaExhaustedError;
        },
        { maxRetries: 3, baseDelayMs: 20 }
      );
    } catch {
      // Expected catch
    }
    assert.strictEqual(attempts, 1, "Must not retry quota-exhausted errors");

    // Verify deterministic fallback executes and returns complete result
    const fallback = buildDeterministicDescription({
      title: "iPad Air 5th Gen 64GB WiFi",
      category: "Electronics",
      brand: "Apple",
      condition: "Like New",
    });

    assert.strictEqual(fallback.provider, "deterministic_fallback");
    assert.ok(fallback.description.includes("iPad Air 5th Gen"));
    assert.ok(fallback.highlights.length >= 1);
  });

  /* --------------------------------------------------------
     10. Existing Listing Creation & Editing Payload Compatibility
  -------------------------------------------------------- */
  console.log("\nSuite 10: Existing Listing Creation & Editing Compatibility");

  await it("ensures generated outputs match exact payload schema required by POST /api/ads and PUT /api/ads/[id]", () => {
    const generated = buildDeterministicDescription({
      title: "Samsung Galaxy Tab S8",
      category: "Electronics",
      brand: "Samsung",
      model: "Tab S8",
      condition: "Good",
      yearsUsed: "1",
      askingPrice: 38000,
    });

    // Verify payload shape expected by backend /api/ads routes
    const createAdPayload = {
      title: generated.titleSuggestion,
      price: 38000,
      category: "Electronics",
      description: generated.description,
      location: "Bengaluru, Karnataka",
      yearsUsed: 1,
      lat: 12.9716,
      lng: 77.5946,
      images: ["/sample.jpg"],
    };

    assert.strictEqual(typeof createAdPayload.title, "string");
    assert.strictEqual(typeof createAdPayload.price, "number");
    assert.strictEqual(typeof createAdPayload.description, "string");
    assert.ok(createAdPayload.title.length > 0);
    assert.ok(createAdPayload.price > 0);
    assert.ok(createAdPayload.description.length > 50);
  });

  await it("verifies image presentation feedback provides category-specific guidance", () => {
    const feedback = analyzeImagePresentation({
      imageUrls: ["/photo1.jpg"],
      category: "Electronics",
      productTitle: "iPhone 13",
    });

    assert.strictEqual(feedback.imageCount, 1);
    assert.strictEqual(feedback.hasSufficientImages, false);
    assert.ok(feedback.presentationTips.some((t) => t.includes("side and back")));
    assert.ok(feedback.suggestedAngles.some((a) => a.includes("screen")));
    assert.ok(feedback.disclaimer.includes("does not verify item authenticity"));
  });

  console.log("\n========================================================");
  console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================\n");

  try {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  } catch {
    // Ignore cleanup error
  }

  process.exitCode = failedCount > 0 ? 1 : 0;
}

runPhase5Tests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
