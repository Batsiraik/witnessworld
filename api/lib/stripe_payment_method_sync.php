<?php

declare(strict_types=1);

/**
 * After SetupIntent succeeds: set default payment method on Stripe Customer and mirror on users row.
 */
function ww_stripe_sync_user_payment_method(
    PDO $pdo,
    \Stripe\StripeClient $stripe,
    int $userId,
    ?string $customerId,
    string $paymentMethodId
): void {
    $cid = trim((string) ($customerId ?? ''));
    if ($cid !== '' && $paymentMethodId !== '') {
        try {
            $stripe->customers->update($cid, [
                'invoice_settings' => ['default_payment_method' => $paymentMethodId],
            ]);
        } catch (\Throwable) {
            // Still persist attached in our DB.
        }
    }

    $last4 = null;
    $brand = null;
    if ($paymentMethodId !== '') {
        try {
            $pm = $stripe->paymentMethods->retrieve($paymentMethodId);
            $card = $pm->card ?? null;
            if ($card) {
                $last4 = isset($card->last4) ? (string) $card->last4 : null;
                $brand = isset($card->brand) ? strtolower((string) $card->brand) : null;
            }
        } catch (\Throwable) {
            // ignore
        }
    }

    $custToStore = $cid !== '' ? $cid : null;
    $upd = $pdo->prepare(
        'UPDATE users SET stripe_payment_method_status = ?, stripe_customer_id = ?, stripe_pm_last4 = ?, stripe_pm_brand = ? WHERE id = ?'
    );
    $upd->execute([
        'attached',
        $custToStore,
        ($last4 !== null && $last4 !== '') ? $last4 : null,
        ($brand !== null && $brand !== '') ? $brand : null,
        $userId,
    ]);
}
