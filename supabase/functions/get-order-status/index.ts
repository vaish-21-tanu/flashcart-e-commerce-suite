import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    return await verify(token, key);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await verifyToken(req.headers.get('Authorization'));
    if (!payload) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = payload.sub as string;
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const databaseUrl = Deno.env.get('DATABASE_URL');
    if (!databaseUrl) {
      console.error('DATABASE_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Database configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sql = postgres(databaseUrl);

    // Fetch order
    const orders = await sql`
      SELECT id, order_id, user_id, status, total, created_at, updated_at
      FROM orders
      WHERE order_id = ${orderId}
    `;

    if (orders.length === 0) {
      await sql.end();
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = orders[0];

    // Verify user owns this order
    if (order.user_id !== userId) {
      await sql.end();
      return new Response(
        JSON.stringify({ error: 'Unauthorized to view this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch status history
    const statusLogs = await sql`
      SELECT status, note, created_at
      FROM order_status_logs
      WHERE order_id = ${order.id}
      ORDER BY created_at ASC
    `;

    await sql.end();

    console.log(`Fetched status for order ${orderId}`);

    return new Response(
      JSON.stringify({
        orderId: order.order_id,
        currentStatus: order.status,
        total: parseFloat(order.total),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        statusHistory: statusLogs.map(log => ({
          status: log.status,
          note: log.note,
          timestamp: log.created_at,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get order status error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
