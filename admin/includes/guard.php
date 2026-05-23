<?php

declare(strict_types=1);

require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/admin_ui.php';

ww_admin_require();

/** @var array{id:int,username:string,name:string,email:string,is_super:bool} $currentAdmin */
$currentAdmin = ww_admin_user();
