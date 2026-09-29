import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { generateUploadSignature } from "@/lib/cloudinary";

const FOLDER = "crafteey/vendor-products";

export async function POST(req: NextRequest) {
  try {
    await verifyToken(req);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    if (!cloudName || !apiKey || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "Image upload isn't configured" }, { status: 500 });
    }

    const { timestamp, signature } = generateUploadSignature({ folder: FOLDER });
    return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder: FOLDER });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("upload sign error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}