import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import { fetchCategories } from "@/lib/services/expense.service";

export function useCategories() {
  const query = useQuery({
    queryKey: QUERY_KEYS.categories(),
    queryFn: fetchCategories,
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
