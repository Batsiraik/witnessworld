<?php
/**
 * @var string $entityType
 * @var int $entityId
 * @var array<string,mixed> $contentRow
 * @var string $base
 */
$status = (string) ($contentRow['moderation_status'] ?? '');
if (!ww_content_can_suspend($entityType, $status) && !ww_content_can_delete($entityType)) {
    return;
}
?>
<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
  <h3 class="text-sm font-semibold text-slate-900">Danger zone</h3>
  <p class="mt-1 text-xs text-slate-500">Suspend hides this from the app until it is reviewed again. Delete permanently removes it.</p>
  <div class="mt-4 flex flex-wrap gap-2">
    <?php
      $row = $contentRow;
      $return = '';
      require __DIR__ . '/content_list_action_buttons.php';
    ?>
  </div>
</div>
