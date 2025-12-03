// src/app/api/webhook/route.ts
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

const TOKEN_MINT = "59eXaVJNG441QW54NTmpeDpXEzkuaRjSLm8M6N4Gpump";
const DECIMALS = 4; // 你现在是 4 位小数
const REWARD_RATE = 0.05; // 5%

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    for (const tx of body) {
      if (!tx.tokenTransfers) continue;

      for (const t of tx.tokenTransfers) {
        if (t.mint !== TOKEN_MINT) continue;

        const rawAmount = Number(t.tokenAmount || 0);
        if (rawAmount <= 0) continue;

        // 换算成真实数量（除以 10^decimals）
        const realAmount = rawAmount / Math.pow(10, DECIMALS);
        const buyer = t.toUserAccount || t.toOwner;
        if (!buyer) continue;

        // 查买家有没有上级
        const { data: buyerData } = await supabase
          .from("users")
          .select("referrer")
          .eq("wallet", buyer)
          .single();

        if (!buyerData?.referrer) continue;

        const reward = realAmount * REWARD_RATE;

        // 给上级加返现
        await supabase
          .from("users")
          .update({
            pending_reward: supabase.raw(`pending_reward + ${reward}`),
          })
          .eq("wallet", buyerData.referrer);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
}