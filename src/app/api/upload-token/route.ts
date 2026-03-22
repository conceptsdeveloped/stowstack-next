import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 120;
export const runtime = "nodejs";

// Allow large file uploads (up to 100MB)
export const fetchCache = "default-no-store";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminKey = req.headers.get("x-admin-key");
  if (adminSecret && adminKey !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename = req.headers.get("x-filename") || `upload-${Date.now()}`;
  const contentType = req.headers.get("content-type") || "application/octet-stream";

  try {
    // Stream the body directly to Vercel Blob — no buffering in memory
    const blob = await put(
      `style-references/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
      req.body!,
      {
        access: "public",
        contentType,
        multipart: true,
      },
    );

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Upload failed:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
