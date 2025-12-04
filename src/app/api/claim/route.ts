// src/app/api/claim/route.ts
import bs58 from "bs58";
import { supabase } from "@/lib/supabase";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { NextRequest } from "next/server";

const REWARD_WALLET_SECRET = "3vxV2u5rXcUSB1RZ7E26uEGx6YyoCRXoANjyweCxynhCF2tefHmEaioB1Fq9VWhgrSf8L6r4xeZQ4Dv4SCohfU8H";
const TOKEN_MINT = new PublicKey("59eXaVJNG441QW54NTmpeDpXEzkuaRjSLm8M6N4Gpump");
const DECIMALS = 4;

const rewardWallet = Keypair.fromSecretKey(bs58.decode(REWARD_WALLET_SECRET));
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
