<?php

declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/admin_ui.php';
require_once __DIR__ . '/admin_hub_config.php';
require_once __DIR__ . '/user_admin_actions.php';
require_once __DIR__ . '/content_admin_actions.php';

ww_admin_require();

/** @var array{id:int,username:string,name:string,email:string,is_super:bool} $currentAdmin */
$currentAdmin = ww_admin_user();
