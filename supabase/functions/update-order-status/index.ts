import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

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

    const { orderId, status, note } = await req.json();

    if (!orderId || !status) {
      return new Response(
        JSON.stringify({ error: 'Order ID and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
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
      SELECT o.id, o.order_id, o.status, o.user_id, u.email, u.name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.order_id = ${orderId}
    `;

    if (orders.length === 0) {
      await sql.end();
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = orders[0];
    const previousStatus = order.status;

    // Update order status
    await sql`
      UPDATE orders SET status = ${status}, updated_at = NOW()
      WHERE order_id = ${orderId}
    `;

    // Log status change
    await sql`
      INSERT INTO order_status_logs (order_id, status, note, created_at)
      VALUES (${order.id}, ${status}, ${note || `Status changed from ${previousStatus} to ${status}`}, NOW())
    `;

    await sql.end();

    // Trigger status update email for specific statuses
    const emailTriggerStatuses = ['shipped', 'out_for_delivery', 'delivered'];
    if (emailTriggerStatuses.includes(status)) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (supabaseUrl && supabaseKey) {
        fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            type: 'status_update',
            orderId: orderId,
            email: order.email,
            name: order.name,
            status,
            previousStatus,
          }),
        }).catch(err => console.error('Failed to send status update email:', err));
      }
    }

    console.log(`Order ${orderId} status updated: ${previousStatus} -> ${status}`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        previousStatus,
        newStatus: status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update order status error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
