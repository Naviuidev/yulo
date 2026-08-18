<?php

declare(strict_types=1);

/**
 * Orchestrates prepaid gateway refunds when a paid order is cancelled.
 *
 * @phpstan-type RefundResult array{
 *   ok: bool,
 *   refunded: bool,
 *   message: string,
 *   gateway?: string,
 *   data?: array<string, mixed>
 * }
 */
final class PaymentRefundService
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * Refund the latest completed prepaid payment for an order (if any).
     *
     * @return array{ok: bool, refunded: bool, message: string, gateway?: string, data?: array<string, mixed>}
     */
    public function refundPaidOrder(int $orderId, array $order): array
    {
        $method = strtolower(trim((string) ($order['payment_method'] ?? '')));
        if ($method === '' || $method === 'cod') {
            return [
                'ok' => true,
                'refunded' => false,
                'message' => 'No prepaid payment to refund.',
            ];
        }

        if (($order['payment_status'] ?? '') !== 'paid') {
            return [
                'ok' => true,
                'refunded' => false,
                'message' => 'Order was not paid; nothing to refund.',
            ];
        }

        $payment = $this->latestCompletedPayment($orderId);
        if (!$payment) {
            return [
                'ok' => false,
                'refunded' => false,
                'message' => 'Paid order has no completed payment record to refund.',
            ];
        }

        $gateway = strtolower(trim((string) ($payment['gateway'] ?? $method)));
        $amount = round((float) ($payment['amount'] ?? $order['total'] ?? 0), 2);
        if ($amount <= 0) {
            return [
                'ok' => false,
                'refunded' => false,
                'message' => 'Invalid payment amount for refund.',
                'gateway' => $gateway,
            ];
        }

        $result = match ($gateway) {
            'razorpay' => $this->refundRazorpay($payment, $amount, $order),
            'cashfree' => $this->refundCashfree($payment, $amount, $order),
            'payu' => $this->refundPayU($payment, $amount, $order),
            'paytm' => $this->refundPaytm($payment, $amount, $order),
            'phonepe' => $this->refundPhonePe($payment, $amount, $order),
            default => [
                'ok' => false,
                'message' => 'Refund is not supported for payment gateway: ' . $gateway,
                'data' => [],
            ],
        };

        if (!empty($result['ok'])) {
            $this->markRefunded($orderId, (int) $payment['id'], is_array($result['data'] ?? null) ? $result['data'] : []);
            return [
                'ok' => true,
                'refunded' => true,
                'message' => (string) ($result['message'] ?? 'Refund successful.'),
                'gateway' => $gateway,
                'data' => $result['data'] ?? [],
            ];
        }

        return [
            'ok' => false,
            'refunded' => false,
            'message' => (string) ($result['message'] ?? 'Refund failed.'),
            'gateway' => $gateway,
            'data' => $result['data'] ?? [],
        ];
    }

    /** @return array<string, mixed>|null */
    private function latestCompletedPayment(int $orderId): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM payments
             WHERE order_id = :order_id AND status = 'completed'
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['order_id' => $orderId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** @param array<string, mixed> $payment @param array<string, mixed> $order */
    private function refundRazorpay(array $payment, float $amount, array $order): array
    {
        $client = new RazorpayClient($this->db);
        $paymentId = trim((string) ($payment['gateway_transaction_id'] ?? ''));
        if ($paymentId === '' || !str_starts_with($paymentId, 'pay_')) {
            $meta = $this->decodeMeta($payment);
            $paymentId = trim((string) ($meta['razorpay_payment_id'] ?? ''));
        }
        if ($paymentId === '') {
            return ['ok' => false, 'message' => 'Razorpay payment id missing for refund.', 'data' => []];
        }

        $paise = (int) round($amount * 100);
        return $client->refundPayment($paymentId, $paise, 'cancel-' . ($order['order_number'] ?? $order['id']));
    }

    /** @param array<string, mixed> $payment @param array<string, mixed> $order */
    private function refundCashfree(array $payment, float $amount, array $order): array
    {
        $client = new CashfreeClient($this->db);
        $cfOrderId = trim((string) ($payment['transaction_id'] ?? ''));
        if ($cfOrderId === '') {
            $cfOrderId = trim((string) ($order['order_number'] ?? ''));
        }
        if ($cfOrderId === '') {
            return ['ok' => false, 'message' => 'Cashfree order id missing for refund.', 'data' => []];
        }

        $refundId = 'RF-' . preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($order['order_number'] ?? $order['id']))
            . '-' . substr((string) time(), -6);

        return $client->createOrderRefund($cfOrderId, $amount, $refundId, 'Order cancelled by customer');
    }

    /** @param array<string, mixed> $payment @param array<string, mixed> $order */
    private function refundPayU(array $payment, float $amount, array $order): array
    {
        $client = new PayUClient($this->db);
        $mihpayid = trim((string) ($payment['gateway_transaction_id'] ?? ''));
        if ($mihpayid === '') {
            $meta = $this->decodeMeta($payment);
            $mihpayid = trim((string) ($meta['mihpayid'] ?? $meta['payuMoneyId'] ?? ''));
        }
        if ($mihpayid === '') {
            return ['ok' => false, 'message' => 'PayU mihpayid missing for refund.', 'data' => []];
        }

        return $client->refundPayment($mihpayid, $amount);
    }

    /** @param array<string, mixed> $payment @param array<string, mixed> $order */
    private function refundPaytm(array $payment, float $amount, array $order): array
    {
        $client = new PaytmClient($this->db);
        $orderId = trim((string) ($payment['transaction_id'] ?? ''));
        $txnId = trim((string) ($payment['gateway_transaction_id'] ?? ''));
        $meta = $this->decodeMeta($payment);
        if ($txnId === '') {
            $txnId = trim((string) ($meta['txnId'] ?? $meta['TXNID'] ?? ''));
        }
        if ($orderId === '' || $txnId === '') {
            return ['ok' => false, 'message' => 'Paytm order/txn id missing for refund.', 'data' => []];
        }

        $refId = 'RF' . preg_replace('/[^A-Za-z0-9]/', '', (string) ($order['order_number'] ?? $order['id']))
            . substr((string) time(), -5);

        return $client->refundTransaction($orderId, $txnId, $amount, $refId);
    }

    /** @param array<string, mixed> $payment @param array<string, mixed> $order */
    private function refundPhonePe(array $payment, float $amount, array $order): array
    {
        $client = new PhonePeClient($this->db);
        $merchantOrderId = trim((string) ($payment['transaction_id'] ?? ''));
        if ($merchantOrderId === '') {
            return ['ok' => false, 'message' => 'PhonePe merchant order id missing for refund.', 'data' => []];
        }

        $merchantRefundId = 'RF' . preg_replace('/[^A-Za-z0-9]/', '', $merchantOrderId);
        $merchantRefundId = substr($merchantRefundId, 0, 63);
        $paise = (int) round($amount * 100);

        return $client->refundPayment($merchantRefundId, $merchantOrderId, $paise);
    }

    /** @param array<string, mixed> $refundData */
    private function markRefunded(int $orderId, int $paymentId, array $refundData): void
    {
        $metaJson = null;
        $stmt = $this->db->prepare('SELECT metadata FROM payments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $paymentId]);
        $existing = $stmt->fetchColumn();
        $meta = [];
        if (is_string($existing) && $existing !== '') {
            $decoded = json_decode($existing, true);
            if (is_array($decoded)) {
                $meta = $decoded;
            }
        }
        $meta['refund'] = $refundData;
        $meta['refunded_at'] = date('c');
        $metaJson = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $this->db->prepare(
            "UPDATE payments SET status = 'refunded', metadata = :metadata, updated_at = NOW() WHERE id = :id"
        )->execute([
            'metadata' => $metaJson,
            'id' => $paymentId,
        ]);

        $this->db->prepare(
            "UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = :id"
        )->execute(['id' => $orderId]);
    }

    /** @param array<string, mixed> $payment @return array<string, mixed> */
    private function decodeMeta(array $payment): array
    {
        $raw = $payment['metadata'] ?? null;
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}
