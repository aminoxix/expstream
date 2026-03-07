"use client";

import React, { createContext, useContext } from "react";
import type { UserResponse } from "stream-chat";

interface UsersContextType {
  users: UserResponse[];
  setUsers?: (users: UserResponse[]) => void;
}

const UsersContext = createContext<UsersContextType | null>(null);

interface UsersProviderProps {
  children: React.ReactNode;
  users: UserResponse[];
  setUsers?: (users: UserResponse[]) => void;
}

export const UsersProvider = ({
  children,
  users,
  setUsers,
}: UsersProviderProps) => {
  return (
    <UsersContext.Provider value={{ users, setUsers }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsersContext = () => {
  const context = useContext(UsersContext);
  return context;
};
