"use client";

import { wagmiAdapter, queryClient } from "@/lib/wagmi";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }) {
    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
