import { ProductsPage } from './products/ProductsPage';

export default function App() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Product Catalog</h1>
      <ProductsPage />
    </main>
  );
}
