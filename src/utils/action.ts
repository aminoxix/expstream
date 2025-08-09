"use server";

import { UserObject } from "@/types";
import { StreamClient, UserRequest } from "@stream-io/node-sdk";

export async function createToken(userId: string) {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("STREAM_API_KEY or STREAM_API_SECRET is not set");
    throw new Error("Missing Stream API credentials");
  }
  console.log("Creating token for user: ", userId);
  const client = new StreamClient(apiKey, apiSecret);
  const validityInSeconds = 4 * 60 * 60; // 4 hours
  const token = client.generateUserToken({
    user_id: userId,
    validity_in_seconds: validityInSeconds,
  });
  return token;
}

export async function createStreamUser(userObject: UserObject) {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("STREAM_API_KEY or STREAM_API_SECRET is not set");
    throw new Error("Missing Stream API credentials");
  }

  const client = new StreamClient(apiKey, apiSecret);
  const newUser: UserRequest = {
    id: userObject.userId,
    name: userObject.fullName,
    image: userObject.imageUrl,
    custom: {
      email: userObject.email,
    },
    role: "user", // Allows channel membership actions
  };
  try {
    const result = await client.upsertUsers([newUser]);
    console.log("[createStreamUser] Inserted user:", result);
    return result;
  } catch (err) {
    console.error("[createStreamUser] Failed to insert user:", err);
    throw err;
  }
}
