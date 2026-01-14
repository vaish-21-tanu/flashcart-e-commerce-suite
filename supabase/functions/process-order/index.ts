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

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
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
    const userEmail = payload.email as string;
    const userName = payload.name as string;

    const { shippingAddress, paymentMethod, items } = await req.json();

    if (!shippingAddress || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Shipping address and items are required' }),
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

    interface ProductDetail {
      id: string;
      name: string;
      price: number;
      stock: number;
      image_url: string;
      quantity: number;
    }

    // Verify stock availability and calculate total
    let subtotal = 0;
    const productDetails: ProductDetail[] = [];

    for (const item of items) {
      const products = await sql`
        SELECT id, name, price, stock, image_url FROM products WHERE id = ${item.productId}
      `;

      if (products.length === 0) {
        await sql.end();
        return new Response(
          JSON.stringify({ error: `Product ${item.productId} not found` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const product = products[0];
      if (product.stock < item.quantity) {
        await sql.end();
        return new Response(
          JSON.stringify({ error: `Insufficient stock for ${product.name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      subtotal += parseFloat(product.price) * item.quantity;
      productDetails.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        stock: product.stock,
        image_url: product.image_url,
        quantity: item.quantity,
      });
    }

    const shipping = subtotal > 50 ? 0 : 5.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    const orderId = generateOrderId();

    // Create order
    const orders = await sql`
      INSERT INTO orders (
        order_id, user_id, status, subtotal, shipping, tax, total,
        shipping_name, shipping_address, shipping_city, shipping_state, 
        shipping_zip, shipping_country, payment_method, created_at, updated_at
      )
      VALUES (
        ${orderId}, ${userId}, 'pending', ${subtotal}, ${shipping}, ${tax}, ${total},
        ${shippingAddress.fullName}, ${shippingAddress.address}, ${shippingAddress.city},
        ${shippingAddress.state}, ${shippingAddress.zipCode}, ${shippingAddress.country || 'US'},
        ${paymentMethod || 'card'}, NOW(), NOW()
      )
      RETURNING id, order_id, status, total, created_at
    `;

    const order = orders[0];

    // Create order items and update stock
    for (const item of items) {
      const product = productDetails.find(p => p.id === item.productId)!;
      
      await sql`
        INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
        VALUES (${order.id}, ${item.productId}, ${item.quantity}, ${product.price}, NOW())
      `;

      // Update stock
      await sql`
        UPDATE products SET stock = stock - ${item.quantity}, updated_at = NOW()
        WHERE id = ${item.productId}
      `;
    }

    // Log order status
    await sql`
      INSERT INTO order_status_logs (order_id, status, note, created_at)
      VALUES (${order.id}, 'pending', 'Order placed successfully', NOW())
    `;

    // Clear cart
    await sql`DELETE FROM cart_items WHERE user_id = ${userId}`;

    await sql.end();

    // Trigger order confirmation email (fire and forget)
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
          type: 'confirmation',
          orderId: orderId,
          email: userEmail,
          name: userName || shippingAddress.fullName,
          items: productDetails,
          total,
          shippingAddress,
        }),
      }).catch(err => console.error('Failed to send confirmation email:', err));
    }

    console.log(`Order created: ${orderId} for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          orderId: order.order_id,
          status: order.status,
          total: parseFloat(order.total),
          createdAt: order.created_at,
          items: productDetails.map(p => ({
            name: p.name,
            quantity: p.quantity,
            price: p.price,
          })),
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Process order error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
