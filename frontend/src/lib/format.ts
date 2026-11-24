const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatPrice = (price: number) => currency.format(price);

// Keeps toasts to a line or two when a product name runs to the 100-character limit.
export const shortName = (name: string, max = 48) => (name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name);
