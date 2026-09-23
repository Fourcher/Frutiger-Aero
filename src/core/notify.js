/* Aerium notifications: system-tray balloon tips and messenger-style toasts
   that slide up from the corner of the screen. */
(function () {
  'use strict';
  const A = window.Aerium;
  const { h } = A.util;
  const stack = [];

  function layout() {
    let bottom = 48;
    for (const n of stack) {
      n.el.style.bottom = bottom + 'px';
      bottom += n.el.offsetHeight + 10;
    }
  }

  function show(o, kind) {
    const host = document.getElementById('ae-notify');
    if (!host) return { close() {} };
    let closed = false, timer = null;
    const closeBtn = h('button.ae-note-close', { type: 'button', 'aria-label': 'Close' }, '×');
    const el = h('div.ae-note', { class: ['ae-note-' + kind, o.className], role: 'status' },
      kind === 'toast'
        ? [
            h('div.ae-note-head', null, A.img(o.appIcon || 'icons/users', { class: 'ae-note-appicon' }), h('span', null, o.app || 'Bubble Messenger'), closeBtn),
            h('div.ae-note-row', null,
              o.avatar ? h('span.fa-avatar.fa-avatar-sm', null, h('img', { src: A.asset(o.avatar), alt: '' })) : null,
              h('div.ae-note-text', null, o.title ? h('b', null, o.title) : null, o.text ? h('span', null, o.text) : null)),
          ]
        : [
            o.icon ? A.img(o.icon, { class: 'ae-note-icon' }) : null,
            h('div.ae-note-text', null, o.title ? h('b', null, o.title) : null, o.text ? h('span', null, o.text) : null),
            closeBtn,
          ]);
    const handle = {
      el,
      close() {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        el.classList.remove('show');
        el.classList.add('hide');
        setTimeout(() => { el.remove(); const i = stack.indexOf(handle); if (i >= 0) stack.splice(i, 1); layout(); }, 320);
      },
    };
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); handle.close(); });
    el.addEventListener('click', () => { if (o.onClick) o.onClick(); handle.close(); });
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { if (o.timeout !== 0) timer = setTimeout(() => handle.close(), 2500); });
    host.appendChild(el);
    stack.unshift(handle);
    layout();
    requestAnimationFrame(() => el.classList.add('show'));
    if (o.sound !== false) A.sound.play(o.sound || (kind === 'toast' ? 'signin' : 'balloon'));
    if (o.timeout !== 0) timer = setTimeout(() => handle.close(), o.timeout || 7000);
    return handle;
  }

  A.notify = (o) => show(o || {}, 'balloon');
  A.notify.toast = (o) => show(o || {}, 'toast');
})();
