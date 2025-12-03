"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { publicKey, connected, signMessage } = useWallet();
  const [inviter, setInviter] = useState<string | null>(null);
  const [myRefs, setMyRefs] = useState(0);
  const hasCheckedRef = useRef(false);
  const bindRef = useRef(false); // 防重复绑定
  const [pendingReward, setPendingReward] = useState(0);
  const [claiming, setClaiming] = useState(false);

  // 读取 ?ref= （只执行一次）
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ref)) {
      setInviter(ref); // 这行在 effect 外层，但用 ref 防重复，已安全
    }
  }, []);

  // 自动签名绑定（用 useCallback 包裹）
  const bindReferral = useCallback(async () => {
    if (!publicKey || !inviter || !signMessage || bindRef.current) return;
    bindRef.current = true;

    const { data } = await supabase
      .from("users")
      .select("referrer")
      .eq("wallet", publicKey.toBase58())
      .maybeSingle();

    if (data?.referrer) return;

    try {
      const message = new TextEncoder().encode(`Bind referral ${inviter} ${Date.now()}`);
      await signMessage(message);

      await supabase.from("users").upsert({
        wallet: publicKey.toBase58(),
        referrer: inviter,
      });

      alert("邀请关系绑定成功！");
    } catch (err) {
      console.log("用户取消或出错", err);
      bindRef.current = false; // 出错重置
    }
  }, [publicKey, inviter, signMessage]);

  useEffect(() => {
    if (connected) {
      bindReferral();
    }
  }, [connected, bindReferral]); // 依赖 bindReferral，避免循环

  // 统计邀请人数（异步，不直接 setState）
  useEffect(() => {
    if (!publicKey) {
      setMyRefs(0);
      return;
    }
    const loadRefs = async () => {
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("referrer", publicKey.toBase58());
      setMyRefs(count || 0);
    };
    loadRefs();
  }, [publicKey]);

  // 加载返现数量
useEffect(() => {
  if (!publicKey) return;
  supabase
    .from("users")
    .select("pending_reward")
    .eq("wallet", publicKey.toBase58())
    .single()
    .then(({ data }) => setPendingReward(data?.pending_reward || 0));
}, [publicKey]);

// 一键领取函数
const claimReward = async () => {
  setClaiming(true);
  const res = await fetch("/api/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: publicKey?.toBase58() }),
  });
  const data = await res.json();
  if (res.ok) {
    alert("领取成功！交易: " + data.sig);
    setPendingReward(0);
  } else {
    alert("领取失败: " + data);
  }
  setClaiming(false);
};

  const myLink = publicKey ? `${window.location.origin}?ref=${publicKey.toBase58()}` : "";

  return (
    <div className="min-h-screen bg-linear-to-b from-purple-900 via-black to-black">
      <div className="fixed top-4 right-4 z-50">
        <WalletMultiButton style={{ background: "#9333ea" }} />
      </div>

      <div className="container mx-auto px-4 py-20 text-center">
        {!publicKey ? (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-6xl font-bold bg-linear-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              $你的MGT 直推奖励
            </h1>
            <p className="text-2xl text-gray-300 mt-8">点右上角连接钱包开始赚钱</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="bg-gray-900/90 backdrop-blur rounded-3xl p-10 border border-purple-600">
              <p className="text-4xl text-green-400">连接成功！</p>
              <p className="font-mono text-sm text-gray-400 break-all mt-4">
                {publicKey.toBase58()}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-900/80 rounded-2xl p-8 border border-purple-500">
                <p className="text-gray-400">我的上级</p>
                <p className="text-2xl font-bold mt-3">
                  {inviter ? `${inviter.slice(0, 10)}...` : "无（一代祖宗）"}
                </p>
              </div>

              <div className="bg-gray-900/80 rounded-2xl p-8 border border-green-500">
                <p className="text-gray-400">我已邀请</p>
                <p className="text-6xl font-bold text-green-400">{myRefs} 人</p>
              </div>

              <div className="bg-gray-900/80 rounded-2xl p-8 border border-pink-500">
                <p className="text-gray-400">我的邀请链接</p>
                <p className="font-mono text-xs break-all mt-3 text-pink-400">{myLink}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(myLink)}
                  className="mt-6 px-8 py-3 bg-pink-600 rounded-full hover:bg-pink-700"
                >
                  一键复制链接
                </button>
              </div>

              <div className="bg-gray-900/80 rounded-2xl p-8 border border-yellow-500">
                <p className="text-gray-400">可领取返现</p>
                <p className="text-6xl font-bold text-yellow-400">
                  {pendingReward.toFixed(4)} MGT
                </p>
                {pendingReward > 0 && (
                  <button
                    onClick={claimReward}
                    disabled={claiming}
                    className="mt-6 px-8 py-3 bg-yellow-600 rounded-full hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {claiming ? "领取中..." : "一键领取"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}