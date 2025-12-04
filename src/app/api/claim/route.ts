import { supabase } from "@/lib/supabase";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createTransferInstruction } from "@solana/spl-token";
import { NextRequest } from "next/server";
import bs58 from "bs58";

const REWARD_WALLET_SECRET = process.env.REWARD_WALLET_SECRET_KEY;

if (!REWARD_WALLET_SECRET) {
  throw new Error("Missing REWARD_WALLET_SECRET_KEY env var");
}

const TOKEN_MINT = new PublicKey("59eXaVJNG441QW54NTmpeDpXEzkuaRjSLm8M6N4Gpump");
const DECIMALS = 4;

const rewardWallet = Keypair.fromSecretKey(bs58.decode(REWARD_WALLET_SECRET));
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();
    if (!wallet) return new Response("No wallet", { status: 400 });

    const { data } = await supabase
      .from("users")
      .select("pending_reward")
      .eq("wallet", wallet)
      .single();

    const amount = Number(data?.pending_reward || 0);
    if (amount <= 0) return new Response("No reward", { status: 400 });

    const toPubkey = new PublicKey(wallet);
    const fromATA = getAssociatedTokenAddressSync(TOKEN_MINT, rewardWallet.publicKey);
    const toATA = getAssociatedTokenAddressSync(TOKEN_MINT, toPubkey);

    const tx = new Transaction().add(
      createTransferInstruction(
        fromATA,
        toATA,
        rewardWallet.publicKey,
        BigInt(Math.round(amount * Math.pow(10, DECIMALS)))
      )
    );

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = rewardWallet.publicKey;
    tx.sign(rewardWallet);

    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    await supabase.from("users").update({ pending_reward: 0 }).eq("wallet", wallet);

    return new Response(JSON.stringify({ sig }), { status: 200 });
  } catch (err: any) {
    console.error("Claim error:", err);
    return new Response(err.message || "Claim failed", { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
