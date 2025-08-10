import { isTokenExpired } from "@/lib/utils";
import { TokenProvider } from "stream-chat";
import { createToken } from "./action";

export const createTokenProvider = (userId: string): TokenProvider => {
  return async () => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    // If token exists but is expired, remove it
    if (storedUser.token && isTokenExpired(storedUser.token)) {
      delete storedUser.token;
      localStorage.setItem("user", JSON.stringify(storedUser));
    }

    // If valid token exists, use it
    if (storedUser.token) {
      return storedUser.token;
    }

    // Otherwise, generate new token
    const token = await createToken(userId);
    if (!token) {
      throw new Error("Failed to create token");
    }

    // Store new token in localStorage
    localStorage.setItem("user", JSON.stringify({ ...storedUser, token }));
    return token;
  };
};
