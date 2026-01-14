import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_URL = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'confirmation' | 'status_update';
  orderId: string;
  email: string;
  name: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  total?: number;
  shippingAddress?: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status?: string;
  previousStatus?: string;
}

const statusMessages: Record<string, { subject: string; heading: string; message: string }> = {
  shipped: {
    subject: 'Your order has shipped!',
    heading: '📦 Your Order is On Its Way!',
    message: 'Great news! Your order has been shipped and is on its way to you.',
  },
  out_for_delivery: {
    subject: 'Your order is out for delivery',
    heading: '🚚 Out for Delivery Today!',
    message: 'Your order is out for delivery and will arrive today.',
  },
  delivered: {
    subject: 'Your order has been delivered',
    heading: '✅ Order Delivered!',
    message: 'Your order has been successfully delivered. We hope you love it!',
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: EmailRequest = await req.json();
    const { type, orderId, email, name, items, total, shippingAddress, status } = request;

    let subject: string;
    let html: string;

    if (type === 'confirmation') {
      subject = `Order Confirmed - ${orderId}`;
      
      const itemsHtml = items?.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>
      `).join('') || '';

      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; margin-bottom: 10px;">🎉 Order Confirmed!</h1>
            <p style="color: #666; font-size: 16px;">Hi ${name},</p>
            <p style="color: #666; font-size: 16px;">Thank you for your order! We've received your order and are getting it ready.</p>
            
            <div style="background: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #333; font-weight: 600;">Order ID: <span style="color: #007bff;">${orderId}</span></p>
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f8f8;">
                  <th style="padding: 10px; text-align: left;">Item</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 15px 10px; font-weight: 600; text-align: right;">Total:</td>
                  <td style="padding: 15px 10px; font-weight: 600; text-align: right; color: #007bff;">$${total?.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            ${shippingAddress ? `
            <h3 style="color: #333; margin-top: 30px;">Shipping To</h3>
            <p style="color: #666; line-height: 1.6;">
              ${shippingAddress.fullName}<br>
              ${shippingAddress.address}<br>
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
            </p>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <p style="color: #999; font-size: 14px;">Questions? Reply to this email and we'll help you out.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Status update email
      const statusInfo = statusMessages[status || ''] || {
        subject: `Order ${orderId} - Status Update`,
        heading: '📋 Order Status Update',
        message: `Your order status has been updated to: ${status}`,
      };

      subject = `${statusInfo.subject} - ${orderId}`;
      
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; margin-bottom: 10px;">${statusInfo.heading}</h1>
            <p style="color: #666; font-size: 16px;">Hi ${name},</p>
            <p style="color: #666; font-size: 16px;">${statusInfo.message}</p>
            
            <div style="background: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #333; font-weight: 600;">Order ID: <span style="color: #007bff;">${orderId}</span></p>
              <p style="margin: 10px 0 0 0; color: #333;">Status: <span style="color: #28a745; font-weight: 600;">${status?.replace(/_/g, ' ').toUpperCase()}</span></p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <p style="color: #999; font-size: 14px;">Questions? Reply to this email and we'll help you out.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email using Resend API directly
    const emailResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "FlashCart <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend API error:', emailResult);
      return new Response(
        JSON.stringify({ error: emailResult.message || 'Failed to send email' }),
        { status: emailResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email sent successfully for order ${orderId}:`, emailResult);

    return new Response(
      JSON.stringify({ success: true, id: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
