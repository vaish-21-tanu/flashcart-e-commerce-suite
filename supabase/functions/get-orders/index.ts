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

    const databaseUrl = Deno.env.get('DATABASE_URL');
    if (!databaseUrl) {
      console.error('DATABASE_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Database configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sql = postgres(databaseUrl);

    // Fetch orders
    const orders = await sql`
      SELECT id, order_id, status, subtotal, shipping, tax, total,
             shipping_name, shipping_address, shipping_city, shipping_state,
             shipping_zip, created_at, updated_at
      FROM orders
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await sql`
          SELECT oi.*, p.name, p.image_url
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ${order.id}
        `;

        return {
          orderId: order.order_id,
          status: order.status,
          subtotal: parseFloat(order.subtotal),
          shipping: parseFloat(order.shipping),
          tax: parseFloat(order.tax),
          total: parseFloat(order.total),
          shippingAddress: {
            name: order.shipping_name,
            address: order.shipping_address,
            city: order.shipping_city,
            state: order.shipping_state,
            zip: order.shipping_zip,
          },
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          items: items.map(item => ({
            productId: item.product_id,
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
            imageUrl: item.image_url,
          })),
        };
      })
    );

    await sql.end();

    console.log(`Fetched ${orders.length} orders for user ${userId}`);

    return new Response(
      JSON.stringify({ orders: ordersWithItems }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get orders error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
