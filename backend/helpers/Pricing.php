<?php

declare(strict_types=1);

/** Shared sale/regular price resolution for cart, checkout, and orders. */
final class Pricing
{
    /** Prefer a positive sale price; otherwise regular. */
    public static function effective(?float $salePrice, ?float $regularPrice): float
    {
        if ($salePrice !== null && $salePrice > 0) {
            return round($salePrice, 2);
        }
        return round((float) ($regularPrice ?? 0), 2);
    }

    /**
     * Resolve unit price from a cart/product row (supports variants).
     *
     * @param array<string, mixed> $item
     */
    public static function unitPriceFromItem(array $item): float
    {
        $productSale = self::toNullableFloat($item['sale_price'] ?? null);
        $productRegular = self::toNullableFloat($item['price'] ?? $item['cart_price'] ?? null);

        if (!empty($item['variant_id'])) {
            $variantSale = self::toNullableFloat($item['variant_sale_price'] ?? null);
            if ($variantSale !== null && $variantSale > 0) {
                return round($variantSale, 2);
            }
            // Variant without its own sale → use product sale when available.
            if ($productSale !== null && $productSale > 0) {
                return round($productSale, 2);
            }
            $variantRegular = self::toNullableFloat($item['variant_price'] ?? null);
            if ($variantRegular !== null && $variantRegular > 0) {
                return round($variantRegular, 2);
            }
        }

        return self::effective($productSale, $productRegular);
    }

    private static function toNullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        return (float) $value;
    }
}
