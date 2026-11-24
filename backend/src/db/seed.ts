import type { ProductInput } from '../products/product.schema.js';
import type { ProductsRepo } from '../products/products.repo.js';

const sampleProducts: ProductInput[] = [
  { name: 'Wireless Mouse', price: 24.99, category: 'Electronics', description: '2.4GHz receiver, 18-month battery life.' },
  { name: 'Mechanical Keyboard', price: 89.5, category: 'Electronics', description: 'Hot-swappable switches, 75% layout.' },
  { name: 'USB-C Hub', price: 39, category: 'Electronics', description: '7-in-1 with HDMI and 100W passthrough.' },
  { name: 'Pour-Over Coffee Set', price: 32.75, category: 'Kitchen', description: 'Ceramic dripper, glass carafe, 40 filters.' },
  { name: 'Chef’s Knife 8"', price: 64, category: 'Kitchen', description: 'High-carbon stainless steel.' },
  { name: 'Cast Iron Skillet', price: 45.99, category: 'Kitchen', description: 'Pre-seasoned, 12 inch.' },
  { name: 'Running Shoes', price: 119.99, category: 'Sports', description: 'Lightweight daily trainer.' },
  { name: 'Yoga Mat', price: 28, category: 'Sports', description: '6mm non-slip, includes carry strap.' },
  { name: 'The Pragmatic Programmer', price: 42.5, category: 'Books', description: '20th anniversary edition.' },
  { name: 'Desk Lamp', price: 54.25, category: 'Home', description: 'Dimmable LED with adjustable color temperature.' },
];

export function seedIfEmpty(repo: ProductsRepo): number {
  if (repo.count() > 0) return 0;

  // Stagger timestamps so "newest first" ordering is deterministic.
  const start = Date.now() - sampleProducts.length * 60_000;
  sampleProducts.forEach((product, i) => {
    repo.create(product, new Date(start + i * 60_000).toISOString());
  });
  return sampleProducts.length;
}
