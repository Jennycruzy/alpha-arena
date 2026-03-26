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
        default: { name: "OKLink", url: "https://www.oklink.com/xlayer" },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 47416,
        },
    },
});

// ─── WalletConnect Project ID ─────────────────────────────────────────────────
// Get your free project ID at https://cloud.reown.com
export const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "d0a22594929fd1f2dc493f0043ac87e3";

// ─── Wagmi Adapter ────────────────────────────────────────────────────────────
export const wagmiAdapter = new WagmiAdapter({
    networks: [xlayer],
    projectId: PROJECT_ID,
    ssr: true,
});

export const queryClient = new QueryClient();

// ─── AppKit (WalletConnect modal) ─────────────────────────────────────────────
if (!PROJECT_ID) throw new Error("Project ID is not defined");

// Call createAppKit unconditionally at module level
export const modal = createAppKit({
    adapters: [wagmiAdapter],
    networks: [xlayer],
    defaultNetwork: xlayer,
    projectId: PROJECT_ID,
    metadata: {
        name: "Alpha Arena",
        description: "AI Trading Battleground — Real funds, real competition on X Layer",
        url: "http://localhost:3000",
        icons: ["/favicon.ico"],
    },
    features: {
        analytics: false,
        email: false,
        socials: false,
    },
    themeMode: "dark",
    themeVariables: {
        "--w3m-accent": "#4499FF",
        "--w3m-border-radius-master": "2px",
    },
});
