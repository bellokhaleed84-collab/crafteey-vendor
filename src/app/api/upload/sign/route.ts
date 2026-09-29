import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { generateUploadSignature, CLOUD_NAME } from "@/lib/cloudinary";

const FOLDER = "crafteey/vendor-products";

export async function POST(req: NextRequest) {
  try {
    await verifyToken(req);

    const apiKey = process.env.CLOUDINARY_API_KEY;
    if (!CLOUD_NAME || !apiKey || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "Image upload isn't configured" }, { status: 500 });
    }

    const { timestamp, signature } = generateUploadSignature({ folder: FOLDER });
    return NextResponse.json({ cloudName: CLOUD_NAME, apiKey, timestamp, signature, folder: FOLDER });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("upload sign error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}