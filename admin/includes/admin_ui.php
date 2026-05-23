<?php

declare(strict_types=1);

/**
 * Shared admin UI helpers (badges, filter chips, action buttons). Visual only.
 */

function ww_admin_status_key(string $status): string
{
    return strtolower(trim(str_replace([' ', '-'], '_', $status)));
}

function ww_admin_status_tone(string $status): string
{
    $k = ww_admin_status_key($status);

    static $map = [
        'verified' => 'success',
        'approved' => 'success',
        'completed' => 'success',
        'delivered' => 'success',
        'accepted' => 'success',
        'read' => 'success',
        'reviewed' => 'success',
        'active' => 'success',

        'pending_verification' => 'warning',
        'pending_approval' => 'warning',
        'pending_otp' => 'warning',
        'new' => 'sky',
        'open' => 'warning',
        'in_progress' => 'warning',
        'ready' => 'violet',
        'shipped' => 'info',

        'declined' => 'danger',
        'rejected' => 'danger',
        'removed' => 'danger',
        'disputed' => 'danger',
        'cancelled' => 'danger',
        'canceled' => 'danger',
        'suspended' => 'danger',
        'dismissed' => 'neutral',

        'business' => 'violet',
        'individual' => 'info',
        'featured' => 'gold',
        'urgent' => 'danger',
    ];

    return $map[$k] ?? 'neutral';
}

function ww_admin_status_badge(string $status, ?string $label = null): string
{
    $tone = ww_admin_status_tone($status);
    $text = $label ?? str_replace('_', ' ', ww_admin_status_key($status));

    return '<span class="admin-badge admin-badge--' . htmlspecialchars($tone, ENT_QUOTES, 'UTF-8') . '" data-status="'
        . htmlspecialchars(ww_admin_status_key($status), ENT_QUOTES, 'UTF-8') . '">'
        . htmlspecialchars($text, ENT_QUOTES, 'UTF-8') . '</span>';
}

function ww_admin_filter_chip(string $href, string $label, bool $active, string $tone = 'brand'): string
{
    $tone = preg_replace('/[^a-z0-9_-]/', '', strtolower($tone)) ?: 'brand';
    $cls = $active ? 'admin-chip admin-chip--active admin-chip--' . $tone : 'admin-chip';

    return '<a href="' . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . '" class="' . $cls . '">'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';
}

/** @param array<string, string> $attrs */
function ww_admin_btn_link(string $href, string $label, string $variant = 'primary', array $attrs = []): string
{
    $variant = preg_replace('/[^a-z0-9_-]/', '', strtolower($variant)) ?: 'primary';
    $extra = '';
    foreach ($attrs as $k => $v) {
        if ($k === 'class') {
            continue;
        }
        $extra .= ' ' . htmlspecialchars((string) $k, ENT_QUOTES, 'UTF-8') . '="'
            . htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8') . '"';
    }
    $class = 'admin-btn admin-btn--' . $variant;
    if (isset($attrs['class'])) {
        $class .= ' ' . $attrs['class'];
    }

    return '<a href="' . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . '" class="' . htmlspecialchars($class, ENT_QUOTES, 'UTF-8') . '"' . $extra . '>'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';
}

/** @param array<string, string> $attrs */
function ww_admin_btn_submit(string $label, string $variant = 'primary', array $attrs = []): string
{
    $variant = preg_replace('/[^a-z0-9_-]/', '', strtolower($variant)) ?: 'primary';
    $name = $attrs['name'] ?? '';
    $value = $attrs['value'] ?? '';
    $type = $attrs['type'] ?? 'submit';
    $extraClass = (string) ($attrs['class'] ?? '');
    unset($attrs['name'], $attrs['value'], $attrs['type'], $attrs['class']);
    $extra = '';
    foreach ($attrs as $k => $v) {
        $extra .= ' ' . htmlspecialchars((string) $k, ENT_QUOTES, 'UTF-8') . '="'
            . htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8') . '"';
    }
    $class = 'admin-btn admin-btn--' . $variant;
    if ($extraClass !== '') {
        $class .= ' ' . $extraClass;
    }
    $nameAttr = $name !== '' ? ' name="' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '"' : '';
    $valueAttr = $value !== '' ? ' value="' . htmlspecialchars($value, ENT_QUOTES, 'UTF-8') . '"' : '';

    return '<button type="' . htmlspecialchars($type, ENT_QUOTES, 'UTF-8') . '" class="'
        . htmlspecialchars($class, ENT_QUOTES, 'UTF-8') . '"' . $nameAttr . $valueAttr . $extra . '>'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</button>';
}

function ww_admin_row_attrs(string $status): string
{
    $tone = ww_admin_status_tone($status);
    $key = ww_admin_status_key($status);

    return ' data-status="' . htmlspecialchars($key, ENT_QUOTES, 'UTF-8') . '" data-status-tone="'
        . htmlspecialchars($tone, ENT_QUOTES, 'UTF-8') . '"';
}
