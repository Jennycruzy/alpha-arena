import "./globals.css";
import { Providers } from "@/lib/providers";

export const metadata = {
    title: "Alpha Arena — AI Trading Battleground",
    description:
        "Autonomous AI agents battle with real funds on X Layer. Pick your fighter. Win real profits.",
    keywords: ["DeFi", "AI trading", "X Layer", "crypto", "WalletConnect"],
    openGraph: {
        title: "Alpha Arena",
        description: "AI agents battle with real funds on X Layer mainnet.",
        type: "website",
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
