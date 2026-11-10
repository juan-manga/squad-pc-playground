export interface CartItem {
  sku: string;
  unitPrice: number;
  quantity: number;
}

export function lineTotal(item: CartItem): number {
  if (item.quantity < 0 || item.unitPrice < 0) throw new RangeError('Price and quantity must be non-negative');
  return round2(item.unitPrice * item.quantity);
}

export function cartTotal(items: CartItem[]): number {
  return round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
