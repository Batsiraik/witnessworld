<?php
/**
 * @var string $entityType listing|store|product|directory
 * @var int $entityId
 * @var array<string,mixed> $row
 * @var string $return list|''
 * @var string $base admin URL base
 */
$entityType = $entityType ?? 'listing';
$entityId = (int) ($entityId ?? 0);
$return = $return ?? 'list';
$base = $base ?? '';
$status = (string) ($row['moderation_status'] ?? '');
$label = ww_content_row_label($row, $entityType);
$handlerUrl = ww_content_handler_url($entityType, $entityId, $base);
$canSuspend = ww_content_can_suspend($entityType, $status);
$canDelete = ww_content_can_delete($entityType);
$labelAttr = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
$handlerAttr = htmlspecialchars($handlerUrl, ENT_QUOTES, 'UTF-8');
?>
<?php if ($canSuspend): ?>
  <button
    type="button"
    class="admin-btn admin-btn--warning admin-btn--sm js-admin-content-suspend"
    data-entity-type="<?= htmlspecialchars($entityType, ENT_QUOTES, 'UTF-8') ?>"
    data-entity-label="<?= $labelAttr ?>"
    data-handler-url="<?= $handlerAttr ?>"
    data-return="<?= htmlspecialchars($return, ENT_QUOTES, 'UTF-8') ?>"
  >Suspend</button>
<?php endif; ?>
<?php if ($canDelete): ?>
  <button
    type="button"
    class="admin-btn admin-btn--danger admin-btn--sm js-admin-content-delete"
    data-entity-type="<?= htmlspecialchars($entityType, ENT_QUOTES, 'UTF-8') ?>"
    data-entity-label="<?= $labelAttr ?>"
    data-handler-url="<?= $handlerAttr ?>"
    data-return="<?= htmlspecialchars($return, ENT_QUOTES, 'UTF-8') ?>"
  >Delete</button>
<?php endif; ?>
