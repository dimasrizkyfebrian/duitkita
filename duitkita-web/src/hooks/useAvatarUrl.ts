import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAvatarBlob } from "@/lib/services/profile.service";

export function useAvatarUrl(userId: string | undefined, hasAvatar: boolean) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Cache the raw Blob — not the object URL. Blob URLs are browser resources
  // that become invalid once revoked; storing them in the cache causes avatars
  // to disappear after the first component that held the URL unmounts.
  const query = useQuery({
    queryKey: ["avatar", userId],
    queryFn: () => fetchAvatarBlob(userId!),
    enabled: !!userId && hasAvatar,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Each component instance owns its own object URL derived from the cached Blob.
  useEffect(() => {
    if (query.data) {
      const url = URL.createObjectURL(query.data);
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      return () => URL.revokeObjectURL(url);
    } else if (!hasAvatar) {
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [query.data, hasAvatar]);

  return {
    avatarUrl: hasAvatar ? objectUrl : null,
    isLoading: hasAvatar && (query.isLoading || (!objectUrl && query.isSuccess)),
    isError: query.isError,
    refetch: query.refetch,
  };
}
