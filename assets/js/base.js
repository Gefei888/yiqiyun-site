/* 子路径适配：GitHub Pages 项目站部署在 /<repo>/ 下，
   把渲染出来的根绝对路径（/assets、/news 等）补上站点前缀。 */
(function () {
  var scripts = Array.prototype.slice.call(document.scripts);
  var me = document.currentScript || scripts.filter(function (s) {
    return /assets\/js\/(base|site)\.js/.test(s.src || '');
  })[0];
  var base = '/';
  if (me && me.src) {
    var p = new URL(me.src, location.href).pathname;
    var i = p.indexOf('/assets/js/');
    if (i > 0) base = p.slice(0, i + 1);
  }
  window.YC_BASE = base;

  function fix(el) {
    ['href', 'src', 'poster'].forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (v && v.charAt(0) === '/' && v.charAt(1) !== '/') {
        if (v.indexOf(base) !== 0) el.setAttribute(a, base.replace(/\/$/, '') + v);
      }
    });
    var ss = el.getAttribute && el.getAttribute('srcset');
    if (ss) {
      el.setAttribute('srcset', ss.split(',').map(function (part) {
        var t = part.trim().split(/\s+/);
        if (t[0] && t[0].charAt(0) === '/' && t[0].charAt(1) !== '/') t[0] = base.replace(/\/$/, '') + t[0];
        return t.join(' ');
      }).join(', '));
    }
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    fix(root);
    var list = root.querySelectorAll('[href],[src],[srcset]');
    for (var i = 0; i < list.length; i++) fix(list[i]);
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, scan);
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(document.documentElement); });
  else scan(document.documentElement);
})();
