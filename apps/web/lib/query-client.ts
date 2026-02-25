import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        refetchInterval: 30_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  })
}
