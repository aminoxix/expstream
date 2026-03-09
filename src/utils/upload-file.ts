"use client";

import axios from "axios";
import { t } from "try";

export type ChatUploadType = "chat_attachments";

/**
 * Upload a file to AWS S3 via presigned URL.
 * Returns the S3 key of the uploaded file.
 */
export async function uploadChatFile(
  file: File,
  uploadType: ChatUploadType = "chat_attachments",
): Promise<{ key: string }> {
  const { type: contentType, name } = file;
  const extension = name.split(".").pop() || "bin";

  const [ok, error, result] = await t(async () => {
    // 1. Get presigned URL from API route
    const { data } = await axios.post<{ key: string; url: string }>(
      "/api/upload",
      {
        content_type: contentType,
        extension,
        upload_type: uploadType,
      },
    );

    // 2. Upload file directly to S3
    await axios.put(data.url, file, {
      headers: { "Content-Type": file.type },
    });

    // 3. Return S3 key
    return { key: data.key };
  });

  if (!ok) {
    console.error("[uploadChatFile] Failed:", error);
    throw error;
  }

  return result;
}
