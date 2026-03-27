import dynamic from "next/dynamic";
import "@/lib/wagmi"; // Initialize AppKit

const ArenaRouter = dynamic(() => import("@/components/ArenaRouter"), {
    ssr: false,
});

export default function Home() {
    return <ArenaRouter />;
}
