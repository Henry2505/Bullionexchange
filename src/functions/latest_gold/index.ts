// src/functions/latest_gold/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // 1) Always allow CORS from anywhere (or lock to your own domain if you prefer):
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // 2) Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // 3) For GET (or POST) requests, fetch the latest gold price
  const DB_URL = Deno.env.get("DB_URL")!;
  const PUBLIC_ANON_KEY = Deno.env.get("PUBLIC_ANON_KEY")!;
  const supabase = createClient(DB_URL, PUBLIC_ANON_KEY);

  const { data, error } = await supabase
    .from("gold_prices")
    .select("price_usd, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Supabase select error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to read latest gold price" }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }
  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({ error: "No gold price found" }),
      {
        status: 404,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const latest = data[0];
  return new Response(
    JSON.stringify({
      price_usd: parseFloat(latest.price_usd),
      fetched_at: latest.fetched_at,
    }),
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    }
  );
});
