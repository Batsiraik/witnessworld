<?php
/** @var string $base */
$scriptBase = ($base === '' || $base === '.') ? '' : $base;
require __DIR__ . '/content_confirm_modal.php';
?>
<script src="<?= htmlspecialchars($scriptBase . '/assets/admin-content-actions.js', ENT_QUOTES, 'UTF-8') ?>"></script>
