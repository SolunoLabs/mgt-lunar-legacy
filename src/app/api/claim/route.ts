// src/app/api/claim/route.ts
import { supabase } from "@/lib/supabase";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { NextRequest } from "next/server";

const REWARD_WALLET_SECRET = [3,118,210,210,94,28,92,197,11,83,94,83,171,241,76,123,243,221,138,219,63,230,18,248,229,198,24,250,37,241,33,62,190,166,156,198,247,252,50,168,199,77,81,197,188,92,74,158,166,92,190,111,189,84,190,187,238,92,94,87,35,86,92,221,112,84]; // 你的私钥数组
const TOKEN_MINT = new PublicKey("59eXaVJNG441QW54NTmpeDpXEzkuaRjSLm8M6N4Gpump");
const DECIMALS = 4;

const rewardWallet = Keypair.fromSecretKey(Uint8Array.from(REWARD_WALLET_SECRET));
const connection = new Connection("https://api.mainnet-beta.solana.com");

export async function POST(req: NextRequest) {
  const { wallet } = await req.json();
  if (!wallet) return new Response("No wallet", { status: 400 });

  // 查可领取数量
  const { data } = await supabase
    .from("users")
    .select("pending_reward")
    .eq("wallet", wallet)
    .single();

  const amount = Number(data?.pending_reward || 0);
  if (amount <= 0) return new Response("No reward", { status: 400 });

  try {
    const toATA = await getAssociatedTokenAddress(TOKEN_MINT, new PublicKey(wallet));
    const fromATA = await getAssociatedTokenAddress(TOKEN_MINT, rewardWallet.publicKey);

    const tx = new Transaction().add(
      createTransferInstruction(
        fromATA,
        toATA,
        rewardWallet.publicKey,
        BigInt(amount * Math.pow(10, DECIMALS))
      )
    );

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = rewardWallet.publicKey;
    tx.sign(rewardWallet);

    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig);

    // 清零
    await supabase.from("users").update({ pending_reward: 0 }).eq("wallet", wallet);

    return new Response(JSON.stringify({ sig }), { status: 200 });
  } catch (err: any) {
    console.error(err);
    return new Response(err.message, { status: 500 });
  }
}