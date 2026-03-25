"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "viem";
import { QueryClient } from "@tanstack/react-query";

// ─── X Layer Mainnet ──────────────────────────────────────────────────────────
export const xlayer = defineChain({
    id: 196,
    name: "X Layer",
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: {
        default: { http: ["https://rpc.xlayer.tech"] },
    },
    blockExplorers: {
        default: { name: "OKX Explorer", url: "https://www.okx.com/explorer/xlayer" },
    },
});

// ─── WalletConnect Project ID ─────────────────────────────────────────────────
// Get your free project ID at https://cloud.reown.com
export const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "your-project-id-here";

// ─── Query Client ─────────────────────────────────────────────────────────────
export const queryClient = new QueryClient();

// ─── Wagmi Adapter ────────────────────────────────────────────────────────────
export const wagmiAdapter = new WagmiAdapter({
    networks: [xlayer],
    projectId: PROJECT_ID,
    ssr: true,
});

// ─── AppKit (WalletConnect modal) ─────────────────────────────────────────────
createAppKit({
    adapters: [wagmiAdapter],
    networks: [xlayer],
    defaultNetwork: xlayer,
    projectId: PROJECT_ID,
    metadata: {
        name: "Alpha Arena",
        description: "AI Trading Battleground — Real funds, real competition on X Layer",
        url: "https://alpha-arena.xyz",
        icons: ["https://alpha-arena.xyz/icon.png"],
    },
    features: {
        analytics: false,
        email: false,
        socials: false,
    },
    themeMode: "dark",
    themeVariables: {
        "--w3m-accent": "#00F0FF",
        "--w3m-border-radius-master": "12px",
    },
});
