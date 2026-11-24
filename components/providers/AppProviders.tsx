"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthNavigationHandlers } from "@/lib/client/http";
import { AppStoreProvider } from "./AppStoreProvider";
import { ToastProvider } from "@/components/ui/Toast";

function AuthRouterBridge() {
  const router = useRouter();

  useEffect(() => {
    setAuthNavigationHandlers({
      onUnauthorized: () => router.replace("/login"),
      onForbidden: () => router.replace("/forbidden"),
    });
  }, [router]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthRouterBridge />
      <AppStoreProvider>
        <ToastProvider>{children}</ToastProvider>
      </AppStoreProvider>
    </QueryClientProvider>
  );
}
