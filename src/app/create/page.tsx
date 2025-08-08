"use client";

import { createStreamUser } from "@/utils/action";
import { useState } from "react";

export type UserObject = {
  userId: string;
  email: string;
  imageUrl?: string;
  fullName?: string;
};

export default function CreateStreamUser() {
  const [creationOngoing, setCreationOngoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserObject>({
    userId: "",
    email: "",
    fullName: "",
    imageUrl: "",
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.email) {
      setError("User ID and email are required.");
      return;
    }

    setCreationOngoing(true);
    setError(null);

    // Save to localStorage
    try {
      localStorage.setItem("user", JSON.stringify(formData));
    } catch (err) {
      console.error("Failed to save user to localStorage:", err);
      setError("Failed to save user data.");
      setCreationOngoing(false);
      return;
    }

    // Create user on Stream
    try {
      const userObject: UserObject = {
        userId: formData.userId,
        email: formData.email,
        fullName: formData.fullName || undefined,
        imageUrl: formData.imageUrl || undefined,
      };
      await createStreamUser(userObject);
      setCreationOngoing(false);
      window.location.href = "/";
    } catch (err) {
      console.error("[createStreamUser] Failed to create user:", err);
      setError("Failed to create user on server.");
      setCreationOngoing(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-1 items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Create Your Profile
        </h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-gray-700"
            >
              User ID
            </label>
            <input
              type="text"
              id="userId"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter a unique user ID"
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name (Optional)
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label
              htmlFor="imageUrl"
              className="block text-sm font-medium text-gray-700"
            >
              Profile Image URL (Optional)
            </label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter image URL"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            disabled={creationOngoing}
          >
            {creationOngoing ? "Creating..." : "Create Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
