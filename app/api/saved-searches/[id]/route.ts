import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import SavedSearch from "@/models/SavedSearch";
import {
  generateCriteriaFingerprint,
} from "@/lib/notifications/notification-service";
import { parsePrice } from "@/lib/search/search-normalization";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const savedSearch = await SavedSearch.findById(id);

    if (!savedSearch) {
      return NextResponse.json({ message: "Saved search not found" }, { status: 404 });
    }

    // Ownership check
    if (savedSearch.user.toString() !== authUser.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Toggle active state (pause/resume)
    if (typeof body.isActive === "boolean") {
      savedSearch.isActive = body.isActive;
    }

    if (typeof body.name === "string" && body.name.trim()) {
      savedSearch.name = body.name.trim().slice(0, 80);
    }

    // Update criteria if provided
    if (body.criteria) {
      const c = body.criteria;
      const minPrice = parsePrice(c.minPrice);
      const maxPrice = parsePrice(c.maxPrice);

      savedSearch.criteria = {
        query: typeof c.query === "string" ? c.query.trim().slice(0, 100) : savedSearch.criteria.query,
        category: typeof c.category === "string" ? c.category.trim().slice(0, 50) : savedSearch.criteria.category,
        minPrice: minPrice !== undefined ? minPrice : savedSearch.criteria.minPrice,
        maxPrice: maxPrice !== undefined ? maxPrice : savedSearch.criteria.maxPrice,
        condition: typeof c.condition === "string" ? c.condition.trim().toLowerCase() : savedSearch.criteria.condition,
        brand: typeof c.brand === "string" ? c.brand.trim().slice(0, 50) : savedSearch.criteria.brand,
        city: typeof c.city === "string" ? c.city.trim().slice(0, 50) : savedSearch.criteria.city,
      };

      savedSearch.fingerprint = generateCriteriaFingerprint(savedSearch.criteria);
    }

    await savedSearch.save();

    return NextResponse.json({
      message: "Saved search updated successfully",
      savedSearch,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { message: "Another saved search with these criteria already exists" },
        { status: 409 }
      );
    }
    console.error("[api:saved-searches:id] PUT Error:", err);
    return NextResponse.json(
      { message: "Failed to update saved search" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getUserFromToken();
    if (!authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const savedSearch = await SavedSearch.findById(id);

    if (!savedSearch) {
      return NextResponse.json({ message: "Saved search not found" }, { status: 404 });
    }

    // Ownership check
    if (savedSearch.user.toString() !== authUser.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await SavedSearch.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Saved search deleted successfully",
    });
  } catch (err) {
    console.error("[api:saved-searches:id] DELETE Error:", err);
    return NextResponse.json(
      { message: "Failed to delete saved search" },
      { status: 500 }
    );
  }
}
