"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, useEffect } from "react";

let okxProvider = null;
if (typeof window !== "undefined") {
  const { okxwallet } = window as any;
  if (okxwallet) {
    okxProvider = okxwallet.solana;
  }
}

const OKXWalletAdapter = () => {
  return {
    name: "OKX Wallet",
    icon: "okx",
    readyState: okxProvider ? "Installed" : "NotDetected",
    connect: async () => {
      if (!okxProvider) throw new Error("OKX Wallet not found");
      const accounts = await okxProvider.connect();
      return {
        publicKey: new PublicKey(accounts[0]),
        signTransaction: async (tx) => {
          const signed = await okxProvider.signTransaction(tx.serializeMessage());
          return signed;
        },
        signAllTransactions: async (txs) => {
          const signed = await okxProvider.signAllTransactions(txs.map(t => t.serializeMessage()));
          return signed.map((s, i) => txs[i].addSignature(s));
        },
      };
    },
    disconnect: async () => {
      if (okxProvider) await okxProvider.disconnect();
    },
  };
};

export default function WalletContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = WalletAdapterNetwork.Mainnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new OKXWalletAdapter(),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
