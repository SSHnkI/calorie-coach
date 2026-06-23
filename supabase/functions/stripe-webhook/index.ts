import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
    } catch {
      return new Response('Webhook signature invalid', { status: 400 })
    }

    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.user_id

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      await supabase.from('profiles').update({
        subscription_status: sub.status === 'active' ? 'active' : 'free',
        subscription_id: sub.id,
        subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
        stripe_customer_id: sub.customer as string
      }).eq('id', userId)
    }

    if (event.type === 'customer.subscription.deleted') {
      await supabase.from('profiles').update({
        subscription_status: 'cancelled',
        subscription_id: null,
        subscription_end: null
      }).eq('id', userId)
    }

    return new Response(JSON.stringify({ received: true }))

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})