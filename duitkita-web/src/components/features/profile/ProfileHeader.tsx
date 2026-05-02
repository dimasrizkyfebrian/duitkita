"use client";

import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import type { User } from "@/types";

interface ProfileHeaderProps {
  user: User;
  onEdit: () => void;
}

export function ProfileHeader({ user, onEdit }: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Avatar className="size-16 text-base">
        <AvatarFallback className="bg-primary/15 text-primary font-semibold text-lg">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-foreground truncate">
          {user.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>

      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil />
        Edit
      </Button>
    </div>
  );
}
