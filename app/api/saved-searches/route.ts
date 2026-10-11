import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import SavedSearch from "@/models/SavedSearch";
import {
  generateCriteriaFingerprint,
  type SavedSearchCriteriaInput,
} from "@/lib/notifications/notification-service";
import { parsePrice } from "@/lib/search/search-normalization";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const savedSearches = await SavedSearch.find({ user: authUser.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      savedSearches,
      total: savedSearches.length,
    });
  } catch (err) {
    console.error("[api:saved-searches] GET Error:", err);
    return NextResponse.json(
      { message: "Failed to fetch saved searches" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const criteriaInput: SavedSearchCriteriaInput = body.criteria || body;

    const minPrice = parsePrice(criteriaInput.minPrice);
    const maxPrice = parsePrice(criteriaInput.maxPrice);

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return NextResponse.json(
        { message: "Minimum price cannot exceed maximum price" },
        { status: 400 }
      );
    }

    const normalizedCriteria = {
      query: typeof criteriaInput.query === "string" ? criteriaInput.query.trim().slice(0, 100) : "",
      category: typeof criteriaInput.category === "string" ? criteriaInput.category.trim().slice(0, 50) : "",
      minPrice,
      maxPrice,
      condition: typeof criteriaInput.condition === "string" ? criteriaInput.condition.trim().toLowerCase() : "",
      brand: typeof criteriaInput.brand === "string" ? criteriaInput.brand.trim().slice(0, 50) : "",
      city: typeof criteriaInput.city === "string" ? criteriaInput.city.trim().slice(0, 50) : "",
    };

    // Auto-generate name if not explicitly provided
    let name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "";
    if (!name) {
      const parts = [
        normalizedCriteria.query,
        normalizedCriteria.category,
        normalizedCriteria.city ? `in ${normalizedCriteria.city}` : "",
        normalizedCriteria.maxPrice ? `under ₹${normalizedCriteria.maxPrice}` : "",
      ].filter(Boolean);
      name = parts.join(" ") || "All Listings Alert";
    }

    const fingerprint = generateCriteriaFingerprint(normalizedCriteria);

    // Prevent duplicate saved searches for the same user and criteria
    const existing = await SavedSearch.findOne({
      user: authUser.id,
      fingerprint,
    });

    if (existing) {
      return NextResponse.json(
        {
          message: "You already have a saved search with these criteria",
          savedSearch: existing,
          isDuplicate: true,
        },
        { status: 409 }
      );
    }

    const savedSearch = await SavedSearch.create({
      user: authUser.id,
      name,
      criteria: normalizedCriteria,
      fingerprint,
      isActive: true,
      matchCount: 0,
    });

    return NextResponse.json(
      {
        message: "Saved search created successfully",
        savedSearch,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { message: "Duplicate saved search already exists" },
        { status: 409 }
      );
    }
    console.error("[api:saved-searches] POST Error:", err);
    return NextResponse.json(
      { message: "Failed to create saved search" },
      { status: 500 }
    );
  }
}
