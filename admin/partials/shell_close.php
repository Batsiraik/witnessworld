    </main>
  </div>
<?php
$closeBase = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$closeAssetPrefix = ($closeBase === '' || $closeBase === '.') ? '' : $closeBase;
$closeAdminJs = $closeAssetPrefix . '/assets/admin-mobile.js';
$closeNotifJs = $closeAssetPrefix . '/assets/admin-notifications.js';
?>
  <script src="<?= htmlspecialchars($closeAdminJs, ENT_QUOTES, 'UTF-8') ?>"></script>
  <script src="<?= htmlspecialchars($closeNotifJs, ENT_QUOTES, 'UTF-8') ?>"></script>
</body>
</html>
