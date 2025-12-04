// src/app/api/webhook/route.ts   ← 直接全替换！
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

const TOKEN_MINT = "59eXaVJNG441QW54NTmpeDpXEzkuaRjSLm8M6N4Gpump";
const DECIMALS = 4;
const REWARD_RATE = 0.05;

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();

    for (const tx of body) {
      if (!tx.tokenTransfers) continue;

      for (const t of tx.tokenTransfers) {
        if (t.mint !== TOKEN_MINT) continue;

        const rawAmount = Number(t.tokenAmount || 0);
        if (rawAmount <= 0) continue;

        const realAmount = rawAmount / Math.pow(10, DECIMALS);
        const buyer = t.toUserAccount || t.toOwner;
        if (!buyer) continue;

        // 查买家有没有上级
        const { data: buyerData } = await supabase
          .from("users")
          .select("referrer")
          .eq("wallet", buyer)
          .maybeSingle();

        if (!buyerData?.referrer) continue;

        const reward = realAmount * REWARD_RATE;

        // 终极傻瓜写法：先读当前值，再写回去（没有任何类型坑）
        const { data: current } = await supabase
          .from("users")
          .select("pending_reward")
          .eq("wallet", buyerData.referrer)
          .single();

        const newReward = (Number(current?.pending_reward) || 0) + reward;

        await supabase
          .from("users")
          .update({ pending_reward: newReward })
          .eq("wallet", buyerData.referrer);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
}
