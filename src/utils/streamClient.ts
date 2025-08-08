import { TokenProvider } from "stream-chat";
import { createToken } from "./action";

export const createTokenProvider = (userId: string): TokenProvider => {
  return async () => {
    // Check localStorage for token
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser.token) {
      return storedUser.token;
    }
    // Generate new token if none exists
    const token = await createToken(userId);
    if (!token) {
      throw new Error("Failed to create token");
    }
    // Update localStorage with new token
    localStorage.setItem("user", JSON.stringify({ ...storedUser, token }));
    return token;
  };
};
