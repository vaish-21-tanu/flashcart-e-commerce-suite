import { useState } from 'react';
import { products, categories, getFeaturedProducts } from '@/data/products';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Zap, Truck, Shield, RotateCcw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredProducts = getFeaturedProducts().slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Zap className="h-4 w-4" />
                Lightning-fast delivery
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Shop Smarter with{' '}
                <span className="flash-gradient-text">FlashCart</span>
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                Discover premium products with unbeatable prices. Fast shipping, secure payments, and hassle-free returns.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button variant="hero" size="xl" asChild>
                  <Link to="#products">
                    Shop Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl">
                  View Categories
                </Button>
              </div>
            </div>

            {/* Featured Product Cards - Desktop */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {featuredProducts.slice(0, 4).map((product, index) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className={`flash-card-elevated group overflow-hidden ${index === 0 ? 'row-span-2' : ''}`}
                >
                  <div className={`relative overflow-hidden bg-secondary/50 ${index === 0 ? 'h-full' : 'aspect-square'}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-sm text-primary-foreground/80">{product.category}</p>
                      <p className="font-semibold text-primary-foreground line-clamp-1">{product.name}</p>
                      <p className="text-lg font-bold text-primary-foreground">${product.price}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 blur-3xl" />
      </section>

      {/* Trust Badges */}
      <section className="border-b border-border bg-secondary/30 py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'On orders over $50' },
              { icon: Shield, title: 'Secure Payment', desc: '100% protected' },
              { icon: RotateCcw, title: 'Easy Returns', desc: '30-day policy' },
              { icon: Zap, title: 'Fast Delivery', desc: '2-5 business days' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Section Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">All Products</h2>
              <p className="text-muted-foreground">Browse our collection of premium products</p>
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mt-6 overflow-x-auto pb-2">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-xl font-semibold">No products found</p>
              <p className="text-muted-foreground">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
