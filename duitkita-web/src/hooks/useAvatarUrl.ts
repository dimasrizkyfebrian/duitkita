import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAvatarBlobUrl } from "@/lib/services/profile.service";

export function useAvatarUrl(userId: string | undefined, hasAvatar: boolean) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["avatar", userId],
    queryFn: () => fetchAvatarBlobUrl(userId!),
    enabled: !!userId && hasAvatar,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return query.data;
      });
    } else if (!hasAvatar) {
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [query.data, hasAvatar]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return {
    avatarUrl: hasAvatar ? objectUrl : null,
    isLoading: hasAvatar && (query.isLoading || (!objectUrl && query.isSuccess)),
    isError: query.isError,
    refetch: query.refetch,
  };
}
