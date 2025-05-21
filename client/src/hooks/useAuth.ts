import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false
  });

  return {
    user: data?.user,
    isAuthenticated: !!data?.isAuthenticated,
    isLoading
  };
}