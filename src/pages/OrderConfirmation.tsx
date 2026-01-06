import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, Truck, Home, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function OrderConfirmation() {
  const { orderId } = useParams();

  const orderSteps = [
    { icon: CheckCircle2, label: 'Order Placed', status: 'completed', time: 'Just now' },
    { icon: Package, label: 'Processing', status: 'current', time: 'Est. 1-2 hours' },
    { icon: Truck, label: 'Shipped', status: 'pending', time: 'Est. 1-2 days' },
    { icon: Home, label: 'Delivered', status: 'pending', time: 'Est. 3-5 days' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto flex flex-col items-center px-4 py-16 md:px-6">
        {/* Success Animation */}
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/20 animate-pulse-glow">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold text-center">Order Confirmed!</h1>
        <p className="mt-2 text-muted-foreground text-center">
          Thank you for shopping with FlashCart
        </p>

        {/* Order ID */}
        <div className="mt-6 flash-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Order ID</p>
          <p className="text-lg font-mono font-bold">{orderId}</p>
        </div>

        {/* Order Progress */}
        <div className="mt-12 w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-6">Order Status</h2>
          <div className="flash-card p-6">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-6 h-[calc(100%-48px)] w-0.5 bg-border" />
              
              {/* Steps */}
              <div className="space-y-8">
                {orderSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  
                  return (
                    <div key={index} className="relative flex items-start gap-4">
                      <div
                        className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                          isCompleted
                            ? 'bg-success text-success-foreground'
                            : isCurrent
                            ? 'bg-primary text-primary-foreground animate-pulse'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="pt-2">
                        <p className={`font-semibold ${isCurrent ? 'text-primary' : ''}`}>
                          {step.label}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Email Notification */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            We've sent a confirmation email with your order details and tracking information.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link to="/orders">
            <Button variant="outline" size="lg">
              <Package className="mr-2 h-4 w-4" />
              Track Order
            </Button>
          </Link>
          <Link to="/">
            <Button variant="hero" size="lg">
              Continue Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
