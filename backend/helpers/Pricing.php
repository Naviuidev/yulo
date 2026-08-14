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

    public static function isGstApplicable(array $item): bool
    {
        if (!array_key_exists('gst_applicable', $item) || $item['gst_applicable'] === null) {
            return true;
        }
        return (int) $item['gst_applicable'] === 1;
    }

    /**
     * Product-level shipping when custom_shipping is on; otherwise free over threshold.
     *
     * @param array<int, array<string, mixed>> $items
     */
    public static function shippingFromItems(
        array $items,
        float $subtotal,
        float $fallbackThreshold = 999.0,
        float $fallbackFee = 99.0
    ): float {
        $customTotal = 0.0;
        $hasCustom = false;

        foreach ($items as $item) {
            if (empty($item['custom_shipping'])) {
                continue;
            }
            $hasCustom = true;
            $fee = (float) ($item['shipping_price'] ?? 0);
            $customTotal += max(0.0, $fee) * (int) ($item['quantity'] ?? 1);
        }

        if ($hasCustom) {
            return round($customTotal, 2);
        }

        return $subtotal >= $fallbackThreshold ? 0.0 : $fallbackFee;
    }

    /**
     * GST on GST-applicable lines only. Coupon discount is allocated
     * proportionally across the cart, then applied to the GST base.
     *
     * @param array<int, array<string, mixed>> $items
     */
    public static function gstTaxFromItems(array $items, float $discount = 0.0, float $rate = 0.18): float
    {
        $subtotal = 0.0;
        $gstSubtotal = 0.0;

        foreach ($items as $item) {
            $line = self::unitPriceFromItem($item) * (int) ($item['quantity'] ?? 1);
            $subtotal += $line;
            if (self::isGstApplicable($item)) {
                $gstSubtotal += $line;
            }
        }

        if ($gstSubtotal <= 0) {
            return 0.0;
        }

        $discountShare = 0.0;
        if ($discount > 0 && $subtotal > 0) {
            $discountShare = $discount * ($gstSubtotal / $subtotal);
        }

        $taxable = max(0.0, $gstSubtotal - $discountShare);
        return round($taxable * $rate, 2);
    }

    private static function toNullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        return (float) $value;
    }
}
