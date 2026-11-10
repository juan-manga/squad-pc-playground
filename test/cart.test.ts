import { describe, it, expect } from 'vitest';
import { applyDiscount, cartTotal, lineTotal } from '../src/cart.js';

describe('cart', () => {
  it('totals lines with two-decimal rounding', () => {
    expect(cartTotal([{ sku: 'a', unitPrice: 0.1, quantity: 3 }, { sku: 'b', unitPrice: 2.5, quantity: 2 }])).toBe(5.3);
  });

  it('applies a percentage discount and rejects out-of-range values', () => {
    expect(applyDiscount(80, 25)).toBe(60);
    expect(() => applyDiscount(80, 120)).toThrow(RangeError);
  });

  it('rejects negative quantities', () => {
    expect(() => lineTotal({ sku: 'a', unitPrice: 1, quantity: -1 })).toThrow(RangeError);
  });
});
