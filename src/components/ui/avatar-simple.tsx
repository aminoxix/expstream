"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarSimpleProps {
  src?: string;
  fallback?: string;
  className?: string;
  avatarFallbackClassName?: string;
  size?: number;
}

export function AvatarSimple({
  src,
  fallback,
  className,
  avatarFallbackClassName,
  size,
}: AvatarSimpleProps) {
  return (
    <Avatar
      className={cn(className)}
      style={size ? { width: size, height: size } : undefined}
    >
      {src && <AvatarImage src={src} alt={fallback || ""} />}
      <AvatarFallback className={cn(avatarFallbackClassName)}>
        {fallback || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
