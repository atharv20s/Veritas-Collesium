import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SolanaProvider } from "@/components/SolanaProvider";
import { ArchitectureModal } from "@/components/ArchitectureModal";

export const metadata: Metadata = {
  title: "Veritas | Secure DeFi Agent Transactions",
  description:
    "Hardware-secured, RL-optimized security enclave for AI agent wallets on Solana. Multi-agent swarm analysis with XGBoost risk scoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>
        <main>
          <SolanaProvider>
            <Providers>
              {children}
              <ArchitectureModal />
            </Providers>
          </SolanaProvider>
        </main>
      </body>
    </html>
  );
}
