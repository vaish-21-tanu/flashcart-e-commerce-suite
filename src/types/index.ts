export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  tags?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  createdAt: Date;
  updatedAt: Date;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}

export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'out-for-delivery' | 'delivered';

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OrderStatusStep {
  status: OrderStatus;
  label: string;
  description: string;
  icon: string;
  timestamp?: Date;
}
