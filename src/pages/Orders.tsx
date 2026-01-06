import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Search, CheckCircle2, Truck, Home, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface MockOrder {
  id: string;
  date: string;
  status: 'placed' | 'shipped' | 'out-for-delivery' | 'delivered';
  items: { name: string; price: number; quantity: number; image: string }[];
  total: number;
}

const mockOrders: MockOrder[] = [
  {
    id: 'FC-1704499200000',
    date: '2024-01-06',
    status: 'shipped',
    items: [
      { name: 'Wireless Pro Headphones', price: 299.99, quantity: 1, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80' },
      { name: 'Smart Watch Series X', price: 449.99, quantity: 1, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80' },
    ],
    total: 749.98,
  },
  {
    id: 'FC-1704412800000',
    date: '2024-01-05',
    status: 'delivered',
    items: [
      { name: 'Premium Leather Jacket', price: 399.99, quantity: 1, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=100&q=80' },
    ],
    total: 399.99,
  },
];

const getStatusInfo = (status: MockOrder['status']) => {
  switch (status) {
    case 'placed':
      return { icon: Clock, label: 'Order Placed', color: 'text-warning bg-warning/10' };
    case 'shipped':
      return { icon: Truck, label: 'Shipped', color: 'text-primary bg-primary/10' };
    case 'out-for-delivery':
      return { icon: Truck, label: 'Out for Delivery', color: 'text-accent bg-accent/10' };
    case 'delivered':
      return { icon: CheckCircle2, label: 'Delivered', color: 'text-success bg-success/10' };
    default:
      return { icon: Package, label: 'Processing', color: 'text-muted-foreground bg-muted' };
  }
};

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orders] = useState<MockOrder[]>(mockOrders);

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 md:px-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="mt-1 text-muted-foreground">Track and manage your orders</p>

        {/* Search */}
        <div className="mt-8 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="mt-8 space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="flash-card p-12 text-center">
              <Package className="mx-auto h-16 w-16 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No orders found</h2>
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'You haven\'t placed any orders yet'}
              </p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={order.id} className="flash-card overflow-hidden">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-secondary/30 p-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Order ID</p>
                        <p className="font-mono font-semibold">{order.id}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">{new Date(order.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${statusInfo.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="font-medium">{statusInfo.label}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-4">
                    <div className="space-y-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <span className="font-medium">${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="text-lg font-bold">${order.total.toFixed(2)}</span>
                      </div>
                      <Button variant="outline">View Details</Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {order.status !== 'delivered' && (
                    <div className="border-t border-border bg-secondary/30 p-4">
                      <div className="flex items-center justify-between">
                        {['placed', 'shipped', 'out-for-delivery', 'delivered'].map((step, index) => {
                          const isComplete = ['placed', 'shipped', 'out-for-delivery', 'delivered'].indexOf(order.status) >= index;
                          const isCurrent = order.status === step;
                          
                          return (
                            <div key={step} className="flex flex-1 items-center">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                                  isComplete
                                    ? 'bg-success text-success-foreground'
                                    : 'bg-muted text-muted-foreground'
                                } ${isCurrent ? 'ring-2 ring-success ring-offset-2' : ''}`}
                              >
                                {index + 1}
                              </div>
                              {index < 3 && (
                                <div
                                  className={`h-1 flex-1 ${
                                    ['placed', 'shipped', 'out-for-delivery', 'delivered'].indexOf(order.status) > index
                                      ? 'bg-success'
                                      : 'bg-muted'
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>Placed</span>
                        <span>Shipped</span>
                        <span>Out for Delivery</span>
                        <span>Delivered</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
