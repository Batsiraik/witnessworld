(function () {
  const { apiPost, apiUpload } = WWC_API;
  const { escapeHtml, escapeAttr } = WWC_UTIL;
  const root = document.getElementById('profile-root');

  function hasAvatar(user) {
    return !!(user?.avatar_url && String(user.avatar_url).trim());
  }

  function render(user, sub) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Member';
    const avatar = WWC_API.resolveMediaUrl(user.avatar_url);
    const plan = sub?.plan_title || 'Member';
    const gotAvatar = hasAvatar(user);

    root.innerHTML = `
      <div class="wwc-profile-head wwc-detail-body">
        <div class="wwc-profile-avatar-wrap">
          <div class="wwc-profile-avatar" id="avatar-preview">
            ${avatar
              ? `<img id="avatar-img" src="${escapeAttr(avatar)}" alt="" />`
              : '<ion-icon name="person-outline" aria-hidden="true"></ion-icon>'}
          </div>
          <span class="wwc-profile-avatar-badge" aria-hidden="true"><ion-icon name="camera"></ion-icon></span>
        </div>
        <h1 class="wwc-detail-title" style="margin-bottom:4px">${escapeHtml(name)}</h1>
        <p style="color:var(--wwc-text-muted);font-weight:600;margin:0">${escapeHtml(user.email || '')}</p>
        <p style="font-weight:800;color:var(--wwc-primary-dark);margin-top:8px">${escapeHtml(plan)}</p>
      </div>

      <div class="wwc-profile-photo-box wwc-detail-body${gotAvatar ? '' : ' is-missing'}">
        <h3>Profile photo</h3>
        <p>${gotAvatar ? 'Update your photo anytime. It appears on your listings and messages.' : 'Required before you can post ads (+ Ad). Upload a clear photo of yourself.'}</p>
        <button type="button" class="wwc-btn wwc-btn-primary" id="avatar-btn">
          <ion-icon name="camera-outline" aria-hidden="true"></ion-icon>
          ${gotAvatar ? 'Change profile photo' : 'Upload profile photo'}
        </button>
        <input type="file" id="avatar-input" accept="image/jpeg,image/png,image/webp" hidden />
        <p class="wwc-profile-status" id="avatar-status" hidden></p>
      </div>

      <div class="wwc-detail-body" style="padding:0;overflow:hidden">
        <a href="my-office.html" class="wwc-modal-row" style="padding:16px 20px;font-weight:800">My office</a>
        <a href="post.html" class="wwc-modal-row" style="padding:16px 20px">Create a listing</a>
        <a href="classifieds.html" class="wwc-modal-row" style="padding:16px 20px">Classified marketplace</a>
        <a href="services.html" class="wwc-modal-row" style="padding:16px 20px">Service marketplace</a>
        <a href="products.html" class="wwc-modal-row" style="padding:16px 20px">Shop products</a>
        <a href="stores.html" class="wwc-modal-row" style="padding:16px 20px">Online stores</a>
        <a href="directory.html" class="wwc-modal-row" style="padding:16px 20px">Business directory</a>
        <a href="favorites.html" class="wwc-modal-row" style="padding:16px 20px">Favorites</a>
        <a href="orders.html" class="wwc-modal-row" style="padding:16px 20px">My orders</a>
      </div>

      <div class="wwc-detail-body" style="margin-top:16px">
        <h3 style="margin:0 0 12px;font-size:16px;font-weight:800">Change password</h3>
        <form id="pw-form">
          <div class="wwc-field" style="margin-bottom:10px"><input type="password" id="cur-pw" placeholder="Current password" required style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--wwc-line)" /></div>
          <div class="wwc-field" style="margin-bottom:10px"><input type="password" id="new-pw" placeholder="New password" required style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--wwc-line)" /></div>
          <button type="submit" class="wwc-btn wwc-btn-primary" style="width:100%;padding:12px">Update password</button>
        </form>
        <p id="pw-msg" style="font-size:13px;font-weight:600;margin-top:10px" hidden></p>
      </div>

      <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">
        <button type="button" class="wwc-btn wwc-btn-ghost" id="logout-btn" style="width:100%;padding:14px">Sign out</button>
      </div>`;

    const input = document.getElementById('avatar-input');
    const btn = document.getElementById('avatar-btn');
    btn?.addEventListener('click', () => input?.click());

    input?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const status = document.getElementById('avatar-status');
      const photoBox = document.querySelector('.wwc-profile-photo-box');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Uploading…</span>';
      }
      if (status) {
        status.hidden = false;
        status.className = 'wwc-profile-status';
        status.textContent = 'Uploading your photo…';
      }
      try {
        const form = new FormData();
        form.append('avatar', file, file.name || 'avatar.jpg');
        const data = await apiUpload('profile-avatar.php', form);
        if (data.avatar_url) {
          WWC_AUTH.patchUser({ avatar_url: data.avatar_url });
          const url = WWC_API.resolveMediaUrl(data.avatar_url);
          const preview = document.getElementById('avatar-preview');
          if (preview) preview.innerHTML = `<img id="avatar-img" src="${escapeAttr(url)}" alt="" />`;
          photoBox?.classList.remove('is-missing');
          if (btn) {
            btn.innerHTML = '<ion-icon name="camera-outline" aria-hidden="true"></ion-icon> Change profile photo';
          }
          if (status) {
            status.textContent = 'Photo updated successfully.';
            status.className = 'wwc-profile-status is-ok';
          }
        }
      } catch (ex) {
        if (status) {
          status.textContent = ex.message || 'Upload failed.';
          status.className = 'wwc-profile-status is-err';
        }
      } finally {
        if (btn) btn.disabled = false;
        e.target.value = '';
      }
    });

    document.getElementById('pw-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('pw-msg');
      try {
        await apiPost('change-password.php', {
          current_password: document.getElementById('cur-pw').value,
          new_password: document.getElementById('new-pw').value,
        });
        msg.textContent = 'Password updated.';
        msg.style.color = 'var(--wwc-primary-dark)';
        msg.hidden = false;
      } catch (ex) {
        msg.textContent = ex.message;
        msg.style.color = 'var(--wwc-danger)';
        msg.hidden = false;
      }
    });

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await WWC_AUTH.logout();
      window.location.href = 'index.html';
    });
  }

  WWC_PAGE.init({
    requireAuth: true,
    onReady: () => {
      render(WWC_AUTH.getUser(), WWC_AUTH.getSubscription());
    },
  });
})();
