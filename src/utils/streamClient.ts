import { TokenProvider } from "stream-chat";
import { createToken } from "./action";

export const createTokenProvider = (userId: string): TokenProvider => {
  return async () => {
    const token = await createToken(userId);
    if (!token) {
      throw new Error("Failed to create token");
    }
    return token;
  };
};
