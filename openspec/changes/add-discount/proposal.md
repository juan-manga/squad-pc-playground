# Add percentage discounts

## Why
Marketing wants to run percentage promotions on the cart total.

## What changes
- New `applyDiscount(total, percent)` in `src/cart.ts`, rounded to two decimals.
- Values outside 0–100 are rejected.

## What is reused
- `round2` for rounding, same as line totals.
