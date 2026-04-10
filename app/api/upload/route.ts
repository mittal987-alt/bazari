import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getUserFromToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // prevents caching

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // limit 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { message: `File ${file.name} too large (Max 5MB)` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result: any = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "olx_ads",
            resource_type: "auto",
          },
          (error, response) => {
            if (error) reject(error);
            else resolve(response);
          }
        );

        uploadStream.end(buffer);
      });

      uploadedUrls.push(result.secure_url);
    }

    return NextResponse.json({ urls: uploadedUrls });

  } catch (error: any) {
    console.error("UPLOAD ROUTE ERROR:", error);

    return NextResponse.json(
      { message: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}