import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import Ad from "@/models/Ad";
import User from "@/models/User";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { adId, rating, comment } = body;

    if (!adId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    const ad = await Ad.findById(adId).populate("user");
    if (!ad) {
      return NextResponse.json({ message: "Ad not found" }, { status: 404 });
    }

    // Verify that the logged in user is the buyer
    if (ad.buyerId?.toString() !== user.id.toString()) {
      return NextResponse.json({ message: "Only the verified buyer can leave a review" }, { status: 403 });
    }

    // Verify it hasn't already been reviewed
    if (ad.isReviewed) {
      return NextResponse.json({ message: "This purchase has already been reviewed" }, { status: 400 });
    }

    const sellerId = ad.user._id;

    // Create the review
    const review = await Review.create({
      adId,
      reviewerId: user.id,
      sellerId,
      rating,
      comment,
    });

    // Mark the ad as reviewed
    ad.isReviewed = true;
    await ad.save();

    // Update Seller's rating and isTrusted status
    const seller = await User.findById(sellerId);
    if (seller) {
      // Calculate new average rating
      // new avg = ((old_avg * count) + new_rating) / (count + 1)
      const oldCount = seller.reviewCount || 0;
      const oldRating = seller.rating || 0;
      
      const newCount = oldCount + 1;
      const newRating = ((oldRating * oldCount) + rating) / newCount;

      seller.reviewCount = newCount;
      seller.rating = Number(newRating.toFixed(1));

      // Auto-grant Trusted Seller tag if criteria met:
      // Minimum 3 reviews, average rating >= 4.5
      if (seller.reviewCount >= 3 && seller.rating >= 4.5) {
        seller.isTrusted = true;
      }

      await seller.save();
    }

    return NextResponse.json({ message: "Review submitted successfully", review }, { status: 201 });
  } catch (error: any) {
    console.error("Submit Review Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
