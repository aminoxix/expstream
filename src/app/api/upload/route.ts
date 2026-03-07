import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

function getS3Client() {
  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS S3 credentials");
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content_type, extension, upload_type = "chat_attachments" } = body;

    if (!content_type || !extension) {
      return NextResponse.json(
        { error: "content_type and extension are required" },
        { status: 400 },
      );
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: "AWS_S3_BUCKET is not configured" },
        { status: 500 },
      );
    }

    const s3 = getS3Client();
    const key = `${upload_type}/${crypto.randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: content_type,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    return NextResponse.json({ key, url });
  } catch (error) {
    console.error("[api/upload] Failed:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
