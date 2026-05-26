"use client";

import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  userId: string;
  name: string;
  hasAvatar: boolean;
  className?: string;
  fallbackClassName?: string;
  size?: "default" | "sm" | "lg";
};

export function UserAvatar({
  userId,
  name,
  hasAvatar,
  className,
  fallbackClassName,
  size = "default",
}: UserAvatarProps) {
  const { avatarUrl, isLoading } = useAvatarUrl(userId, hasAvatar);

  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-primary/15 text-primary font-semibold",
          fallbackClassName,
        )}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          getInitials(name)
        )}
      </AvatarFallback>
    </Avatar>
  );
}
