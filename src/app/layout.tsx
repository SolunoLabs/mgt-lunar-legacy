import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import WalletContextProvider from "@/components/WalletContextProvider";
import "@solana/wallet-adapter-react-ui/styles.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meme Referral DApp",
  description: "5% cashback + leaderboard airdrop",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      {/* 额外福利 1：OKX 手机端深链（deeplink）优先 */}
      <head>
        {/* 告诉 OKX 这是个 dapp，优先唤起 App */}
        <meta name="wallet-connection" content="okxwallet" />
        
        {/* 额外福利 2：强制把 okxwallet 挂到 window.solana，兼容所有老代码 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // OKX Wallet 深链优先 + 兼容性补丁
              if (typeof window !== 'undefined') {
                // 如果检测到 OKX 扩展或 App 内浏览器，直接把 okxwallet 设为默认 solana 对象
                if (window.okxwallet) {
                  window.solana = window.okxwallet;
                  if (!window.okxwallet.isOKX) {
                    window.okxwallet.isOKX = true;
                  }
                }
                // 同时兼容 Phantom 用户（防止冲突）
                if (window.solana && window.solana.isPhantom) {
                  console.log("Phantom detected");
                }
              }
            `,
          }}
        />
      </head>

      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}