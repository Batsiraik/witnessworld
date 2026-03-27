<?php
/** @var string $pageTitle */
$pageTitle = $pageTitle ?? 'WitnessWorld Admin';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?> · WitnessWorld</title>
  <?php
    $adminFavBase = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
    if ($adminFavBase === '' || $adminFavBase === '.') {
      $adminFavBase = '';
    }
    $faviconHref = ($adminFavBase !== '' ? $adminFavBase : '') . '/favicon.png';
    ?>
  <link rel="icon" href="<?= htmlspecialchars($faviconHref, ENT_QUOTES, 'UTF-8') ?>" type="image/png" sizes="any" />
  <link rel="apple-touch-icon" href="<?= htmlspecialchars($faviconHref, ENT_QUOTES, 'UTF-8') ?>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              DEFAULT: '#1FAAF2',
              dark: '#1590d4',
              muted: '#E6F6FF',
            },
            sand: '#E6E1D3',
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
          },
          boxShadow: {
            panel: '0 1px 3px rgba(15, 40, 71, 0.06), 0 12px 40px rgba(51, 181, 255, 0.08)',
          },
        },
      },
    };
  </script>
</head>
<body class="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
