import { Package } from 'lucide-react';
import { Toaster } from 'sonner';
import { ProductsPage } from './products/ProductsPage';

export default function App() {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-4 sm:px-6">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-white" aria-hidden="true">
            <Package className="size-4" strokeWidth={2.25} />
          </span>
          <h1 className="text-[0.9375rem] font-semibold tracking-tight">Product Catalog</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <ProductsPage />
      </main>
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </>
  );
}
