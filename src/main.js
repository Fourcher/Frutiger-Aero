/* Aerium entry point: wires the shell together and decides how to start
   (power button, straight to logon, or straight to the desktop for testing).
   URL options: ?boot=skip  ?boot=login  ?open=paint,calculator  ?theme=dark  ?reset */
(function () {
  'use strict';
  const A = window.Aerium;
  const shell = { mounted: false };

  shell.start = function () {
    if (!shell.mounted) {
      A.theme.mountHost(document.getElementById('ae-wallpaper'));
      shell.mounted = true;
    } else {
      A.theme.resume();
    }
    A.desktop.render();
    A.taskbar.render();
    if (A.gadgets && A.gadgets.start) A.gadgets.start();
    A.bus.emit('shell:start');
  };

  shell.stop = function () {
    A.theme.pause();
    if (A.gadgets && A.gadgets.stop) A.gadgets.stop();
    A.bus.emit('shell:stop');
  };

  A.shell = shell;

  function argsFrom(params) {
    const args = {};
    ['path', 'url', 'page', 'q'].forEach((k) => { if (params.get(k)) args[k] = params.get(k); });
    return args;
  }

  function init() {
    const params = new URLSearchParams(location.search);
    if (params.has('reset')) {
      A.store.reset();
      A.fs.reset();
      params.delete('reset');
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
    }
    if (params.get('theme') && A.theme.THEMES[params.get('theme')]) {
      A.store.set('theme', params.get('theme'));
      A.store.set('glass.color', A.theme.THEMES[params.get('theme')].glass);
    }
    A.theme.apply();
    A.wm.init(document.getElementById('ae-windows'));
    A.boot.init();
    A.desktop.init();
    A.taskbar.init();
    A.effects.init();
    A.screensaver.init();
    if (A.gadgets && A.gadgets.init) A.gadgets.init();

    A.bus.on('fs:full', () => A.ui.messageBox({
      title: 'Disk Full', icon: 'warning', instruction: 'There is not enough space on the disk',
      message: 'Aerium keeps your files in this browser, which only has a little room. Delete a few pictures, then try again.',
    }));

    const mode = params.get('boot');
    if (mode === 'skip') {
      if (!A.store.get('user.created')) {
        A.store.set('user.created', true);
        A.store.set('user.name', params.get('user') || 'User');
        A.store.set('welcome.seen', true);
      }
      document.getElementById('ae-root').classList.add('shell-on');
      shell.start();
      A.shellReady = true;
      const open = params.get('open');
      if (open) open.split(',').forEach((id, i) => setTimeout(() => A.apps.launch(id.trim(), argsFrom(params)), 250 + i * 300));
    } else if (mode === 'login') {
      A.boot.login(true);
    } else {
      A.boot.power();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
