/* 亿企云 · 后台内容管理 */
(function () {
  const YC = window.YC;
  const api = YC.api;
  const TYPES = YC.TYPES;
  const esc = YC.esc;
  const $ = (s, r) => (r || document).querySelector(s);

  const KEY_STORE = 'yc.admin.key';
  const PAGE_STORE = 'yc.admin.page';

  const state = {
    key: '',
    site: {},
    pages: [],
    page: null,
    blocks: [],
    selId: null,
    tab: 'blocks',
    artCat: 'news',
    artMode: 'list',
    artSel: null,
    artList: [],
    dirty: false,
    timer: null,
    syncing: false,
    previewLoaded: false,
  };

  const I = {
    grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.6 12S6 5.9 12 5.9 21.4 12 21.4 12 18 18.1 12 18.1 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 4l16 16M9.9 5.2A9.6 9.6 0 0 1 12 5c6 0 9.4 6.1 9.4 6.1a17 17 0 0 1-3.2 3.9M6.2 7.4A17.3 17.3 0 0 0 2.6 11.1S6 17.2 12 17.2c1.2 0 2.3-.3 3.3-.7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M15 5.4A2.4 2.4 0 0 0 12.6 3H6.4A2.4 2.4 0 0 0 4 5.4v6.2A2.4 2.4 0 0 0 6.4 14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7M6.4 7l.8 12.1A1.9 1.9 0 0 0 9.1 21h5.8a1.9 1.9 0 0 0 1.9-1.9L17.6 7"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m6 14 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m6 10 6 6 6-6"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 4.5v5"/></svg>',
  };

  /* ---------------- 工具 ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  function saveState(text, cls) {
    const el = $('#saveState');
    el.className = 'save-state' + (cls ? ' ' + cls : '');
    $('#saveText').textContent = text;
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function pageFile(slug) {
    return slug === 'home' ? '/' : '/' + slug + '/';
  }

  function blockSummary(b) {
    const p = b.props || {};
    return p.title || p.titleHighlight || p.formTitle || (p.items && p.items[0] && (p.items[0].title || p.items[0].name || p.items[0].q)) || p.quote || '';
  }

  /* ---------------- 登录 ---------------- */
  async function doLogin() {
    const key = $('#keyInput').value.trim();
    const msg = $('#loginMsg');
    if (!key) {
      msg.textContent = '请输入站点密钥';
      return;
    }
    const btn = $('#loginBtn');
    btn.disabled = true;
    btn.textContent = '验证中…';
    msg.textContent = '';
    try {
      const ok = await api.cms('cms_check_key', { p_key: key });
      if (!ok) throw new Error('密钥不正确，请向站点管理员确认');
      sessionStorage.setItem(KEY_STORE, key);
      state.key = key;
      await start();
    } catch (e) {
      msg.textContent = e.message || '验证失败';
    } finally {
      btn.disabled = false;
      btn.textContent = '进入后台';
    }
  }

  /* ---------------- 启动 ---------------- */
  function normalizeSite(s) {
    const site = Object.assign({}, s || {});
    site.brand = Object.assign({ name: '', logoText: '', logoMark: '', logoImage: '', slogan: '' }, site.brand || {});
    site.theme = Object.assign({ primary: '#2B5CF6', accent: '#00B39A' }, site.theme || {});
    site.navCta = Object.assign({ text: '', href: '' }, site.navCta || {});
    site.contact = Object.assign({ phone: '', email: '', address: '', hours: '', wechat: '' }, site.contact || {});
    site.footer = Object.assign({ desc: '', copyright: '', icp: '' }, site.footer || {});
    site.footerLinks = Array.isArray(site.footerLinks) ? site.footerLinks : [];
    site.legal = Array.isArray(site.legal) ? site.legal : [];
    site.seo = Object.assign({ siteUrl: '', keywords: '', baiduToken: '' }, site.seo || {});
    return site;
  }

  async function start() {
    $('#loginView').style.display = 'none';
    $('#cmsView').classList.add('is-on');
    saveState('读取中…', 'is-busy');
    try {
      const [site, pages] = await Promise.all([api.getSite(), api.getPages()]);
      state.site = normalizeSite(site);
      state.pages = pages || [];
      if (!state.pages.length) throw new Error('云端还没有页面数据');
      const last = localStorage.getItem(PAGE_STORE);
      state.page = state.pages.find((p) => p.slug === last) || state.pages[0];
      await loadBlocks();
      bindChrome();
      renderAll();
      saveState('已同步');
    } catch (e) {
      saveState('读取失败', 'is-dirty');
      toast('加载失败：' + (e.message || ''));
    }
  }

  async function loadBlocks() {
    state.blocks = (await api.getBlocks(state.page.id)) || [];
    state.selId = state.blocks.length ? state.blocks[0].id : null;
  }

  /* ---------------- 头部与标签 ---------------- */
  function bindChrome() {
    if (bindChrome.done) return;
    bindChrome.done = true;

    $('#tabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]');
      if (!b) return;
      state.tab = b.dataset.tab;
      $('#tabs').querySelectorAll('button').forEach((n) => n.classList.toggle('is-on', n === b));
      renderEditor();
      if (state.tab === 'blocks') setPreviewSrc(true);
    });

    $('#reloadBtn').addEventListener('click', () => {
      state.previewLoaded = false;
      setPreviewSrc(true);
    });

    $('#logoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem(KEY_STORE);
      location.reload();
    });

    $('#addBtn').addEventListener('click', openTypeModal);
    $('#closeModal').addEventListener('click', () => $('#typeModal').classList.remove('is-on'));
    $('#typeModal').addEventListener('click', (e) => {
      if (e.target.id === 'typeModal') $('#typeModal').classList.remove('is-on');
    });

    $('#preview').addEventListener('load', () => {
      state.previewLoaded = true;
      syncPreview();
    });

    window.addEventListener('message', (e) => {
      const d = e.data || {};
      if (d.source === 'yc-site' && d.type === 'yc-select') {
        const b = state.blocks.find((x) => String(x.id) === String(d.id));
        if (b) selectBlock(b.id, false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        persistNow();
      }
    });
  }

  function renderAll() {
    renderPills();
    renderList();
    renderEditor();
    setPreviewSrc(true);
  }

  function renderPills() {
    const box = $('#pagePills');
    box.innerHTML = '';
    state.pages.forEach((p) => {
      const b = el('button', p.slug === state.page.slug ? 'is-on' : '', esc(p.nav_label));
      b.addEventListener('click', async () => {
        if (p.slug === state.page.slug) return;
        await persistNow();
        state.page = p;
        localStorage.setItem(PAGE_STORE, p.slug);
        await loadBlocks();
        renderAll();
      });
      box.appendChild(b);
    });
  }

  /* ---------------- 板块列表 ---------------- */
  function renderList() {
    const list = $('#blkList');
    list.innerHTML = '';
    if (!state.blocks.length) {
      list.appendChild(el('li', '', `<div style="padding:26px 14px;text-align:center;color:#9AA1B2;font-size:12.5px;line-height:1.9">这一页还没有板块<br>点上方「添加」开始</div>`));
      return;
    }
    state.blocks.forEach((b, i) => {
      const def = TYPES[b.type] || { label: b.type };
      const li = el('li', 'blk-item' + (b.id === state.selId ? ' is-on' : '') + (b.visible === false ? ' is-hidden' : ''));
      li.draggable = true;
      li.dataset.id = b.id;
      li.innerHTML = `
        <span class="grip">${I.grip}</span>
        <div class="bi-main">
          <div class="bi-t">${esc(def.label)}</div>
          <div class="bi-s">${esc(String(blockSummary(b)).slice(0, 26) || '未命名')}</div>
        </div>
        <div class="bi-acts">
          <button data-act="toggle" class="${b.visible === false ? '' : 'on'}" title="显示/隐藏">${b.visible === false ? I.eyeOff : I.eye}</button>
          <button data-act="copy" title="复制">${I.copy}</button>
          <button data-act="del" title="删除">${I.trash}</button>
        </div>`;
      li.addEventListener('click', (e) => {
        const act = e.target.closest('button[data-act]');
        if (act) {
          e.stopPropagation();
          onBlockAction(act.dataset.act, b);
          return;
        }
        selectBlock(b.id);
      });
      list.appendChild(li);
    });
  }

  function selectBlock(id, scrollPreview) {
    if (state.selId === id) return;
    state.selId = id;
    renderList();
    if (state.tab !== 'blocks') {
      state.tab = 'blocks';
      $('#tabs').querySelectorAll('button').forEach((n) => n.classList.toggle('is-on', n.dataset.tab === 'blocks'));
    }
    renderEditor();
    const ifr = $('#preview');
    if (ifr.contentWindow) ifr.contentWindow.postMessage({ source: 'yc-admin', type: 'yc-highlight', id: String(id) }, '*');
    if (scrollPreview !== false) {
      const doc = ifr.contentDocument;
      const target = doc && doc.querySelector(`.blk[data-block-id="${id}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function onBlockAction(act, b) {
    if (act === 'toggle') {
      b.visible = b.visible === false;
      renderList();
      try {
        await api.cms('cms_save_block', { p_key: state.key, p_block_id: b.id, p_props: b.props, p_visible: b.visible });
        toast(b.visible ? '已显示' : '已隐藏');
        syncPreview();
      } catch (e) {
        toast('操作失败：' + e.message);
      }
      return;
    }
    if (act === 'copy') {
      try {
        const row = await api.cms('cms_duplicate_block', { p_key: state.key, p_block_id: b.id });
        if (row) {
          state.blocks.push(row);
          state.blocks.sort((x, y) => (x.sort_order || 0) - (y.sort_order || 0) || x.id - y.id);
          await api.cms('cms_reorder_blocks', { p_key: state.key, p_page_id: state.page.id, p_ids: state.blocks.map((x) => x.id) });
          state.selId = row.id;
          renderList();
          renderEditor();
          syncPreview();
          toast('已复制板块');
        }
      } catch (e) {
        toast('复制失败：' + e.message);
      }
      return;
    }
    if (act === 'del') {
      if (!confirm('确定删除这个板块？删除后无法恢复。')) return;
      try {
        await api.cms('cms_delete_block', { p_key: state.key, p_block_id: b.id });
        state.blocks = state.blocks.filter((x) => x.id !== b.id);
        if (state.selId === b.id) state.selId = state.blocks.length ? state.blocks[0].id : null;
        renderList();
        renderEditor();
        syncPreview();
        toast('已删除');
      } catch (e) {
        toast('删除失败：' + e.message);
      }
    }
  }

  /* ---------------- 拖拽排序 ---------------- */
  (function bindDnD() {
    const list = document.getElementById('blkList');
    if (!list) return;
    let dragId = null;

    list.addEventListener('dragstart', (e) => {
      const li = e.target.closest('.blk-item');
      if (!li) return;
      dragId = li.dataset.id;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (_) {}
    });

    list.addEventListener('dragend', () => {
      dragId = null;
      list.querySelectorAll('.blk-item').forEach((n) => n.classList.remove('dragging', 'drop-before', 'drop-after'));
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const li = e.target.closest('.blk-item');
      if (!li || li.dataset.id === dragId) return;
      const r = li.getBoundingClientRect();
      const after = e.clientY - r.top > r.height / 2;
      list.querySelectorAll('.blk-item').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
      li.classList.add(after ? 'drop-after' : 'drop-before');
    });

    list.addEventListener('drop', async (e) => {
      e.preventDefault();
      const li = e.target.closest('.blk-item');
      if (!li || !dragId || li.dataset.id === dragId) return;
      const after = li.classList.contains('drop-after');
      const from = state.blocks.findIndex((b) => String(b.id) === String(dragId));
      const targetIdx = state.blocks.findIndex((b) => String(b.id) === String(li.dataset.id));
      if (from < 0 || targetIdx < 0) return;
      let to = targetIdx + (after ? 1 : 0);
      const [moved] = state.blocks.splice(from, 1);
      if (from < to) to -= 1;
      state.blocks.splice(to, 0, moved);
      dragId = null;
      renderList();
      syncPreview();
      try {
        await api.cms('cms_reorder_blocks', {
          p_key: state.key,
          p_page_id: state.page.id,
          p_ids: state.blocks.map((b) => b.id),
        });
        toast('顺序已更新');
      } catch (err) {
        toast('排序保存失败：' + err.message);
      }
    });
  })();

  /* ---------------- 添加板块 ---------------- */
  function openTypeModal() {
    const grid = $('#typeGrid');
    grid.innerHTML = '';
    Object.keys(TYPES).forEach((k) => {
      const def = TYPES[k];
      const card = el('button', 'type-card', `<b>${esc(def.label)}</b><span>${esc(def.hint || '')}</span>`);
      card.addEventListener('click', () => addBlock(k));
      grid.appendChild(card);
    });
    $('#typeModal').classList.add('is-on');
  }

  async function addBlock(type) {
    const def = TYPES[type];
    if (!def) return;
    $('#typeModal').classList.remove('is-on');
    try {
      const props = JSON.parse(JSON.stringify(def.defaults || {}));
      const row = await api.cms('cms_add_block', {
        p_key: state.key,
        p_page_id: state.page.id,
        p_type: type,
        p_props: props,
      });
      if (!row) throw new Error('云端未返回新板块');
      state.blocks.push(row);
      state.selId = row.id;
      renderList();
      renderEditor();
      syncPreview();
      toast('已添加「' + def.label + '」');
    } catch (e) {
      toast('添加失败：' + e.message);
    }
  }

  /* ---------------- 预览 ---------------- */
  function setPreviewSrc(force) {
    const ifr = $('#preview');
    const src = pageFile(state.page.slug) + '?edit=' + (state.tab === 'blocks' ? '1' : '0');
    $('#previewUrl').textContent = pageFile(state.page.slug);
    if (force || ifr.dataset.src !== src) {
      ifr.dataset.src = src;
      state.previewLoaded = false;
      ifr.src = src;
    }
  }

  let syncTimer = null;
  function syncPreview() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const ifr = $('#preview');
      if (!state.previewLoaded || !ifr.contentWindow) return;
      ifr.contentWindow.postMessage({ source: 'yc-admin', type: 'yc-preview', blocks: state.blocks, site: state.site }, '*');
    }, 60);
  }

  /* ---------------- 保存 ---------------- */
  function touch(kind) {
    state.dirty = true;
    saveState('未保存…', 'is-dirty');
    clearTimeout(state.timer);
    state.timer = setTimeout(() => persistNow(kind), 750);
    syncPreview();
  }

  async function persistNow() {
    clearTimeout(state.timer);
    if (!state.dirty) return;
    const sel = state.blocks.find((b) => b.id === state.selId);
    state.dirty = false;
    saveState('保存中…', 'is-busy');
    try {
      if (state.tab === 'site') {
        await api.cms('cms_save_site', { p_key: state.key, p_data: state.site });
      } else if (state.tab === 'page') {
        await api.cms('cms_save_page', {
          p_key: state.key,
          p_page_id: state.page.id,
          p_nav_label: state.page.nav_label,
          p_title: state.page.title,
          p_description: state.page.description,
          p_visible: state.page.visible !== false,
          p_sort_order: state.page.sort_order || 0,
          p_keywords: state.page.keywords || '',
          p_canonical: state.page.canonical || '',
        });
        renderPills();
      } else if (sel) {
        await api.cms('cms_save_block', {
          p_key: state.key,
          p_block_id: sel.id,
          p_props: sel.props,
          p_visible: sel.visible !== false,
        });
      }
      const t = new Date();
      saveState('已保存 ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'));
    } catch (e) {
      state.dirty = true;
      saveState('保存失败', 'is-dirty');
      toast('保存失败：' + (e.message || ''));
    }
  }

  /* ---------------- 表单渲染 ---------------- */
  function fieldBox(label, node, hint) {
    const f = el('div', 'f');
    if (label) {
      const l = el('label', '', esc(label));
      f.appendChild(l);
    }
    f.appendChild(node);
    if (hint) f.appendChild(el('div', 'hint', esc(hint)));
    return f;
  }

  function renderField(def, obj, onChange) {
    const key = def.key;
    const val = obj[key];

    if (def.type === 'text' || def.type === 'number') {
      const input = el('input');
      input.type = def.type === 'number' ? 'number' : 'text';
      input.value = val == null ? '' : val;
      input.addEventListener('input', () => {
        obj[key] = def.type === 'number' ? Number(input.value || 0) : input.value;
        onChange();
      });
      return fieldBox(def.label, input, def.hint);
    }

    if (def.type === 'textarea') {
      const ta = el('textarea');
      ta.value = val == null ? '' : val;
      const auto = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 320) + 'px'; };
      setTimeout(auto, 0);
      ta.addEventListener('input', () => {
        obj[key] = ta.value;
        auto();
        onChange();
      });
      return fieldBox(def.label, ta, def.hint);
    }

    if (def.type === 'select') {
      const sel = el('select');
      (def.options || []).forEach((o) => {
        const op = el('option', '', esc(o.l));
        op.value = o.v;
        if (String(o.v) === String(val)) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener('change', () => {
        const raw = sel.value;
        obj[key] = /^-?\d+$/.test(raw) && (def.numeric || (def.options || []).every((o) => typeof o.v === 'number')) ? Number(raw) : raw;
        onChange();
      });
      return fieldBox(def.label, sel, def.hint);
    }

    if (def.type === 'bool') {
      const wrap = el('label', 'switch');
      const input = el('input');
      input.type = 'checkbox';
      input.checked = val !== false;
      const tr = el('span', 'tr');
      const txt = el('span', '', esc(def.onText || '开启'));
      wrap.appendChild(input);
      wrap.appendChild(tr);
      wrap.appendChild(txt);
      input.addEventListener('change', () => {
        obj[key] = input.checked;
        onChange();
      });
      return fieldBox(def.label, wrap, def.hint);
    }

    if (def.type === 'color') {
      const wrap = el('div', 'color-f');
      const input = el('input');
      input.type = 'color';
      input.value = val || '#2B5CF6';
      const code = el('span', 'code', esc(input.value));
      input.addEventListener('input', () => {
        obj[key] = input.value;
        code.textContent = input.value;
        if (window.parent === window) {
          const varName = key === 'accent' ? '--accent' : '--primary';
          document.documentElement.style.setProperty(varName, input.value);
        }
        onChange();
      });
      wrap.appendChild(input);
      wrap.appendChild(code);
      return fieldBox(def.label, wrap, def.hint);
    }

    if (def.type === 'strlist') {
      const ta = el('textarea');
      ta.value = Array.isArray(val) ? val.join('\n') : '';
      ta.style.minHeight = '86px';
      ta.addEventListener('input', () => {
        obj[key] = ta.value.split('\n').map((s) => s.trim()).filter((s, i, arr) => s.length || i < arr.length - 1);
        onChange();
      });
      return fieldBox(def.label, ta, def.hint || '每行一条');
    }

    if (def.type === 'image') {
      const box = el('div', 'img-field');
      const prev = el('div', 'preview');
      const paint = () => {
        prev.innerHTML = obj[key]
          ? `<img src="${YC.attr(obj[key])}" alt="">`
          : '<span class="ph">暂无图片</span>';
      };
      paint();
      const acts = el('div', 'acts');
      const upBtn = el('button', 'btn btn-sm', obj[key] ? '更换图片' : '上传图片');
      upBtn.type = 'button';
      upBtn.addEventListener('click', () => {
        pickImage((dataUrl) => {
          obj[key] = dataUrl;
          paint();
          onChange();
        });
      });
      acts.appendChild(upBtn);
      if (obj[key]) {
        const rm = el('button', 'btn btn-sm btn-danger', '移除');
        rm.type = 'button';
        rm.addEventListener('click', () => {
          obj[key] = '';
          paint();
          onChange();
        });
        acts.appendChild(rm);
      }
      box.appendChild(prev);
      box.appendChild(acts);
      const url = el('input');
      url.type = 'text';
      url.placeholder = '或粘贴图片链接 https://…';
      url.value = obj[key] && obj[key].indexOf('data:') !== 0 ? obj[key] : '';
      url.addEventListener('change', () => {
        obj[key] = url.value.trim();
        paint();
        onChange();
      });
      box.appendChild(url);
      return fieldBox(def.label, box, def.hint);
    }

    if (def.type === 'list') {
      if (!Array.isArray(obj[key])) obj[key] = [];
      const arr = obj[key];
      const box = el('div', 'list-box');
      const paint = () => {
        box.innerHTML = '';
        arr.forEach((item, idx) => {
          const row = el('div', 'list-item');
          const head = el('div', 'li-head');
          head.innerHTML = `<span class="idx">${idx + 1}</span><span class="nm">${esc(item[def.titleKey || 'title'] || item.name || item.q || item.label || def.itemLabel || '条目')}</span>`;
          const mk = (html, title, disabled, fn) => {
            const b = el('button', '', html);
            b.type = 'button';
            b.title = title;
            b.disabled = !!disabled;
            b.addEventListener('click', fn);
            return b;
          };
          head.appendChild(mk(I.up, '上移', idx === 0, () => {
            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
            paint();
            onChange();
          }));
          head.appendChild(mk(I.down, '下移', idx === arr.length - 1, () => {
            [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
            paint();
            onChange();
          }));
          head.appendChild(mk(I.trash, '删除', false, () => {
            arr.splice(idx, 1);
            paint();
            onChange();
          }));
          row.appendChild(head);
          const body = el('div', 'li-body');
          (def.fields || []).forEach((sf) => body.appendChild(renderField(sf, item, () => {
            paint();
            onChange();
          })));
          row.appendChild(body);
          box.appendChild(row);
        });
        const foot = el('div', 'list-foot');
        const add = el('button', 'btn btn-sm', '＋ 添加' + (def.itemLabel || '条目'));
        add.type = 'button';
        add.addEventListener('click', () => {
          arr.push(def.newItem ? def.newItem() : {});
          paint();
          onChange();
        });
        foot.appendChild(add);
        box.appendChild(foot);
      };
      paint();
      return fieldBox(def.label, box, def.hint);
    }

    return fieldBox(def.label, el('div', 'hint', '未知字段类型：' + def.type));
  }

  /* ---------------- 图片处理 ---------------- */
  function pickImage(onDone) {
    const input = el('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 12 * 1024 * 1024) {
        toast('图片超过 12MB，请先压缩');
        return;
      }
      try {
        const dataUrl = await compressImage(file);
        let url = dataUrl;
        try {
          url = await YC.api.uploadImage(dataUrl, state.key);
        } catch (e) {
          /* 上传失败时降级为压缩内嵌，不影响保存 */
        }
        onDone(url);
        toast(url === dataUrl ? '图片已压缩内嵌（服务器上传失败）' : '图片已上传到服务器');
      } catch (e) {
        toast('图片处理失败：' + (e.message || ''));
      }
    });
    input.click();
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const objUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const maxW = 1600;
          const scale = Math.min(1, maxW / img.naturalWidth);
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          const keepPng = file.type === 'image/png' && file.size < 420 * 1024;
          if (!keepPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(objUrl);
          resolve(keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.82));
        } catch (err) {
          URL.revokeObjectURL(objUrl);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        reject(new Error('无法读取这张图片'));
      };
      img.src = objUrl;
    });
  }

  /* ---------------- 编辑器面板 ---------------- */
  function renderEditor() {
    const pane = $('#editorPane');
    pane.innerHTML = '';
    if (state.tab === 'blocks') return renderBlockEditor(pane);
    if (state.tab === 'page') return renderPageEditor(pane);
    if (state.tab === 'site') return renderSiteEditor(pane);
    if (state.tab === 'articles') return renderArticles(pane);
    if (state.tab === 'seo') return renderSeo(pane);
    if (state.tab === 'msg') return renderMessages(pane);
  }

  function renderBlockEditor(pane) {
    const b = state.blocks.find((x) => x.id === state.selId);
    if (!b) {
      pane.appendChild(el('div', 'empty-editor', `${I.empty}<div>选择左侧板块开始编辑<br>也可以点「添加」新增一个板块</div>`));
      return;
    }
    const def = TYPES[b.type] || { label: b.type, fields: [] };
    const head = el('div', 'editor-head');
    head.innerHTML = `<h2>${esc(def.label)}</h2>`;
    const acts = el('div', '', '');
    const dup = el('button', 'btn btn-sm btn-ghost', '复制');
    dup.addEventListener('click', () => onBlockAction('copy', b));
    acts.appendChild(dup);
    head.appendChild(acts);
    const editor = el('div', 'editor');
    editor.appendChild(head);
    editor.appendChild(el('div', 'editor-sub', '修改后会自动保存，右侧实时预览。'));
    (def.fields || []).forEach((f) => {
      editor.appendChild(renderField(f, b.props || (b.props = {}), () => touch('block')));
    });
    pane.appendChild(editor);
  }

  function renderPageEditor(pane) {
    const editor = el('div', 'editor');
    editor.appendChild(el('div', 'editor-head', '<h2>页面设置</h2>'));
    editor.appendChild(el('div', 'editor-sub', '导航上的名称、浏览器标题与搜索描述。'));
    const p = state.page;
    const fields = [
      { key: 'nav_label', label: '导航名称', type: 'text' },
      { key: 'title', label: 'SEO 标题（浏览器标签 / 搜索结果）', type: 'text' },
      { key: 'description', label: 'SEO 描述（分享/搜索摘要）', type: 'textarea' },
      { key: 'keywords', label: 'SEO 关键词（英文逗号分隔）', type: 'text' },
      { key: 'canonical', label: 'Canonical 链接（留空使用默认）', type: 'text', hint: '一般留空；仅当此页面需要指向其他地址时填写' },
      { key: 'sort_order', label: '导航排序（数字小的在前）', type: 'number' },
      { key: 'visible', label: '在导航中显示', type: 'bool', onText: '显示' },
    ];
    fields.forEach((f) => editor.appendChild(renderField(f, p, () => touch('page'))));
    editor.appendChild(el('div', 'f hint', '提示：页面顺序与名称会即时同步到网站顶部的导航栏。'));
    pane.appendChild(editor);
  }

  function renderSiteEditor(pane) {
    const editor = el('div', 'editor');
    editor.appendChild(el('div', 'editor-head', '<h2>站点设置</h2>'));
    editor.appendChild(el('div', 'editor-sub', '品牌、联系方式、页脚与主题色，整站通用。'));

    const s = state.site;
    const groups = [
      {
        title: '品牌',
        obj: s.brand,
        fields: [
          { key: 'name', label: '公司名称（用于标题与版权）', type: 'text' },
          { key: 'logoText', label: '导航栏显示的名称', type: 'text' },
          { key: 'logoMark', label: 'Logo 文字符号（未上传图片时显示）', type: 'text' },
          { key: 'logoImage', label: 'Logo 图片（导航栏，建议透明底横版彩色）', type: 'image' },
          { key: 'logoFooter', label: '页脚 Logo（深色背景用白色版）', type: 'image' },
          { key: 'slogan', label: '品牌口号', type: 'text' },
        ],
      },
      {
        title: '导航按钮',
        obj: s.navCta,
        fields: [
          { key: 'text', label: '按钮文字', type: 'text' },
          { key: 'href', label: '按钮链接', type: 'text', hint: '站内页面写 /contact/、/services/ 等' },
        ],
      },
      {
        title: '联系方式',
        obj: s.contact,
        fields: [
          { key: 'phone', label: '电话', type: 'text' },
          { key: 'email', label: '邮箱', type: 'text' },
          { key: 'address', label: '地址', type: 'text' },
          { key: 'hours', label: '服务时间', type: 'text' },
        ],
      },
      {
        title: '主题色',
        obj: s.theme,
        fields: [
          { key: 'primary', label: '主色', type: 'color' },
          { key: 'accent', label: '强调色', type: 'color' },
        ],
      },
      {
        title: '页脚',
        obj: s.footer,
        fields: [
          { key: 'desc', label: '品牌简介', type: 'textarea' },
          { key: 'copyright', label: '版权信息', type: 'text' },
          { key: 'icp', label: '备案号', type: 'text' },
        ],
      },
      {
        title: '页脚链接组',
        obj: s,
        fields: [
          {
            key: 'footerLinks',
            label: '链接组',
            type: 'list',
            itemLabel: '链接组',
            titleKey: 'title',
            newItem: () => ({ title: '新分组', items: [{ label: '链接文字', href: '#' }] }),
            fields: [
              { key: 'title', label: '分组标题', type: 'text' },
              {
                key: 'items',
                label: '链接',
                type: 'list',
                itemLabel: '链接',
                titleKey: 'label',
                newItem: () => ({ label: '链接文字', href: '#' }),
                fields: [
                  { key: 'label', label: '文字', type: 'text' },
                  { key: 'href', label: '链接', type: 'text' },
                ],
              },
            ],
          },
        ],
      },
      {
        title: '底部法务链接',
        obj: s,
        fields: [
          {
            key: 'legal',
            label: '链接',
            type: 'list',
            itemLabel: '链接',
            titleKey: 'label',
            newItem: () => ({ label: '链接文字', href: '#' }),
            fields: [
              { key: 'label', label: '文字', type: 'text' },
              { key: 'href', label: '链接', type: 'text' },
            ],
          },
        ],
      },
    ];

    groups.forEach((g) => {
      const wrap = el('div', 'f-group');
      wrap.appendChild(el('div', 'g-title', esc(g.title)));
      g.fields.forEach((f) => wrap.appendChild(renderField(f, g.obj, () => touch('site'))));
      editor.appendChild(wrap);
    });

    /* 数据库备份 / 恢复 */
    const bak = el('div', 'f-group');
    bak.appendChild(el('div', 'g-title', '数据库备份'));
    bak.appendChild(
      el(
        'div',
        'editor-sub',
        '整站的文字、图片路径、文章、留言都存放在服务器 <b>data/site.db</b> 这一个文件里。建议每周下载一份留底；换服务器时把 .db 恢复进去即可。'
      )
    );
    const bakRow = el('div', 'bak-row');
    bakRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:center';
    const dlBtn = el('button', 'btn btn-sm btn-primary', '下载数据库备份');
    const rsLabel = el('label', 'btn btn-sm', '恢复备份文件');
    const rsInput = document.createElement('input');
    rsInput.type = 'file';
    rsInput.accept = '.db,.sqlite,.sqlite3,application/octet-stream';
    rsInput.style.display = 'none';
    rsLabel.appendChild(rsInput);
    const bakInfo = el('div', 'editor-sub', '');
    bakInfo.style.margin = '10px 0 0';

    dlBtn.onclick = async () => {
      dlBtn.disabled = true;
      dlBtn.textContent = '正在打包…';
      try {
        const d = await api.backupDb(state.key);
        const bin = atob(d.data || '');
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = d.name || 'yiqiyun-db.db';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        bakInfo.textContent = '已下载：' + a.download + '（' + Math.round((d.size || 0) / 1024) + ' KB，文章 ' + d.articles + ' 篇，留言 ' + d.messages + ' 条）';
        toast('数据库备份已下载');
      } catch (e) {
        bakInfo.textContent = '下载失败：' + e.message;
        toast('备份失败');
      } finally {
        dlBtn.disabled = false;
        dlBtn.textContent = '下载数据库备份';
      }
    };

    rsInput.onchange = () => {
      const file = rsInput.files && rsInput.files[0];
      if (!file) return;
      if (!confirm('将用「' + file.name + '」覆盖当前整站数据。\n当前数据会先自动另存到 data/backup-*.db，是否继续？')) {
        rsInput.value = '';
        return;
      }
      const rd = new FileReader();
      rd.onload = async () => {
        const b64 = String(rd.result || '').split(',')[1] || '';
        try {
          const r = await api.restoreDb(state.key, b64);
          bakInfo.textContent = '已恢复。原数据已另存为 data/' + r.backup + '，页面即将刷新…';
          toast('数据库已恢复');
          setTimeout(() => location.reload(), 1200);
        } catch (e) {
          bakInfo.textContent = '恢复失败：' + e.message;
          toast('恢复失败');
        }
      };
      rd.readAsDataURL(file);
    };

    bakRow.appendChild(dlBtn);
    bakRow.appendChild(rsLabel);
    bak.appendChild(bakRow);
    bak.appendChild(bakInfo);
    editor.appendChild(bak);

    pane.appendChild(editor);
  }

  /* ---------------- 文章管理 ---------------- */
  const ARTICLE_CATS = [
    { slug: 'news', label: '公司新闻' },
    { slug: 'knowledge', label: '技术知识' },
  ];
  const ARTICLE_FIELDS = [
    { key: 'title', label: '文章标题', type: 'text' },
    { key: 'tag', label: '栏目标签', type: 'text', hint: '如：产品发布 / 方法论 / 实操指南' },
    { key: 'publish_date', label: '发布日期', type: 'text', hint: '格式 YYYY-MM-DD，显示在文章卡片上' },
    { key: 'summary', label: '摘要', type: 'textarea', hint: '一两句话概括文章，显示在列表卡片' },
    { key: 'cover', label: '封面图', type: 'image' },
    { key: 'content', label: '正文', type: 'textarea', hint: '空一行即为分段，逐段显示在详情页' },
    { key: 'visible', label: '发布状态', type: 'bool', onText: '已发布' },
  ];

  function normalizeArticle(a) {
    return Object.assign(
      { id: null, page_slug: state.artCat, title: '', tag: '', publish_date: new Date().toISOString().slice(0, 10), summary: '', cover: '', content: '', visible: true },
      a || {}
    );
  }

  async function loadArticles() {
    state.artList = (await api.cms('cms_list_articles', { p_key: state.key, p_slug: state.artCat })) || [];
  }

  function articlePayload(a) {
    return {
      p_key: state.key,
      p_slug: a.page_slug || state.artCat,
      p_title: a.title || '',
      p_summary: a.summary || '',
      p_cover: a.cover || '',
      p_tag: a.tag || '',
      p_date: a.publish_date || '',
      p_content: a.content || '',
    };
  }

  function articleSavePayload(a) {
    const p = Object.assign({}, articlePayload(a), { p_id: a.id, p_visible: a.visible !== false });
    delete p.p_slug;
    return p;
  }

  async function renderArticles(pane) {
    if (pane) pane.innerHTML = '';
    const wrap = el('div', 'msg-wrap');
    wrap.innerHTML = `<h2>文章管理</h2><div class="sub">维护「公司新闻」与「技术知识」栏目的文章，发布后自动出现在对应栏目页。</div>`;
    const cats = el('div', 'art-cats');
    ARTICLE_CATS.forEach((c) => {
      const b = el('button', 'btn btn-sm' + (state.artCat === c.slug ? ' btn-primary' : ' btn-ghost'), esc(c.label));
      b.type = 'button';
      b.addEventListener('click', async () => {
        if (state.artCat === c.slug) return;
        state.artCat = c.slug;
        state.artMode = 'list';
        state.artSel = null;
        await renderArticles(pane);
      });
      cats.appendChild(b);
    });
    wrap.appendChild(cats);

    if (state.artMode === 'edit') return pane.appendChild(wrap), renderArticleForm(wrap);

    const box = el('div', '', '<div style="color:#9AA1B2;font-size:13px">加载中…</div>');
    wrap.appendChild(box);
    const addBar = el('div', 'art-addbar');
    const addBtn = el('button', 'btn btn-sm', '＋ 新增文章');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => {
      state.artMode = 'edit';
      state.artSel = normalizeArticle(null);
      renderArticles(pane);
    });
    addBar.appendChild(addBtn);
    wrap.appendChild(addBar);
    pane.appendChild(wrap);

    try {
      await loadArticles();
      if (!state.artList.length) {
        box.innerHTML = `<div style="color:#9AA1B2;font-size:13px;padding:30px 0;text-align:center">「${esc(ARTICLE_CATS.find((c) => c.slug === state.artCat).label)}」还没有文章，点上方「新增文章」发布第一篇。</div>`;
        return;
      }
      box.innerHTML = '';
      state.artList.forEach((a) => {
        const node = el('div', 'art-item' + (a.visible === false ? ' is-hidden' : ''));
        node.innerHTML = `
          <div class="art-thumb">${a.cover ? `<img src="${YC.attr(a.cover)}" alt="">` : '<span>无图</span>'}</div>
          <div class="art-main">
            <div class="art-t">${esc(a.title || '（无标题）')}</div>
            <div class="art-s">${esc(a.tag || '')} · ${esc(a.publish_date || '')}${a.visible === false ? ' · <b style="color:#D14343">已下线</b>' : ''}</div>
          </div>
          <div class="art-acts">
            <button class="btn btn-sm btn-ghost" data-act="edit">编辑</button>
            <button class="btn btn-sm btn-ghost" data-act="toggle">${a.visible === false ? '发布' : '下线'}</button>
            <button class="btn btn-sm btn-ghost btn-danger" data-act="del">删除</button>
          </div>`;
        node.querySelector('[data-act="edit"]').addEventListener('click', () => {
          state.artMode = 'edit';
          state.artSel = normalizeArticle(JSON.parse(JSON.stringify(a)));
          renderArticles(pane);
        });
        node.querySelector('[data-act="toggle"]').addEventListener('click', async () => {
          try {
            a.visible = a.visible === false;
            await api.cms('cms_save_article', articleSavePayload(a));
            toast(a.visible ? '已发布' : '已下线');
            renderArticles(pane);
          } catch (e) {
            toast('操作失败：' + e.message);
          }
        });
        node.querySelector('[data-act="del"]').addEventListener('click', async () => {
          if (!confirm('确定删除文章《' + (a.title || '无标题') + '》？删除后无法恢复。')) return;
          try {
            await api.cms('cms_delete_article', { p_key: state.key, p_id: a.id });
            toast('已删除');
            renderArticles(pane);
          } catch (e) {
            toast('删除失败：' + e.message);
          }
        });
        box.appendChild(node);
      });
    } catch (e) {
      box.innerHTML = `<div style="color:#D14343;font-size:13px">读取失败：${esc(e.message || '')}</div>`;
    }
  }

  function renderArticleForm(wrap) {
    const a = state.artSel;
    const editor = el('div', 'editor art-editor');
    const head = el('div', 'editor-head');
    head.innerHTML = `<h2>${a.id ? '编辑文章' : '新增文章'}</h2>`;
    const acts = el('div', '');
    const back = el('button', 'btn btn-sm btn-ghost', '← 返回列表');
    back.type = 'button';
    back.addEventListener('click', () => {
      state.artMode = 'list';
      state.artSel = null;
      renderArticles($('#editorPane'));
    });
    acts.appendChild(back);
    head.appendChild(acts);
    editor.appendChild(head);
    editor.appendChild(el('div', 'editor-sub', '栏目：' + esc((ARTICLE_CATS.find((c) => c.slug === (a.page_slug || state.artCat)) || {}).label || '') + '。保存后前台立即生效。'));

    ARTICLE_FIELDS.forEach((f) => editor.appendChild(renderField(f, a, () => {})));

    const saveBar = el('div', 'art-savebar');
    const save = el('button', 'btn btn-primary', a.id ? '保存修改' : '发布文章');
    save.type = 'button';
    save.addEventListener('click', async () => {
      if (!String(a.title || '').trim()) {
        toast('请先填写文章标题');
        return;
      }
      save.disabled = true;
      save.textContent = '保存中…';
      try {
        if (a.id) {
          await api.cms('cms_save_article', articleSavePayload(a));
        } else {
          const row = await api.cms('cms_add_article', articlePayload(a));
          if (row) a.id = row.id;
        }
        toast('已保存，前台已生效');
        syncPreview();
        state.artMode = 'list';
        state.artSel = null;
        renderArticles($('#editorPane'));
      } catch (e) {
        toast('保存失败：' + (e.message || ''));
      } finally {
        save.disabled = false;
        save.textContent = a.id ? '保存修改' : '发布文章';
      }
    });
    saveBar.appendChild(save);
    editor.appendChild(saveBar);
    wrap.appendChild(editor);
  }

  /* ---------------- SEO ---------------- */
  const SEO_PLATFORMS = [
    { name: 'Google Search Console', url: 'https://search.google.com/search-console', desc: '提交 sitemap、查看收录与富媒体结果' },
    { name: 'Bing Webmaster Tools', url: 'https://www.bing.com/webmasters/about', desc: '必应站长平台，支持从 GSC 一键导入' },
    { name: '百度搜索资源平台', url: 'https://ziyuan.baidu.com/', desc: 'sitemap 提交、普通收录与 API 推送' },
    { name: '360 站长平台', url: 'https://zhanzhang.so.com/', desc: 'sitemap 提交与收录管理' },
    { name: '搜狗站长平台', url: 'https://zhanzhang.sogou.com/', desc: 'sitemap 提交与收录管理' },
  ];

  function siteBaseUrl() {
    return String(state.site.seo.siteUrl || location.origin).replace(/\/+$/, '');
  }

  function pageUrls() {
    const base = siteBaseUrl();
    return state.pages.filter((p) => p.visible !== false).map((p) => (p.slug === 'home' ? base + '/' : base + '/' + p.slug + '/'));
  }

  async function renderSeo(pane) {
    pane.innerHTML = '';
    const wrap = el('div', 'msg-wrap');
    wrap.innerHTML = '<h2>SEO 与搜索引擎</h2><div class="sub">站点收录入口、sitemap 与搜索引擎推送。sitemap.xml 由系统每天自动更新 lastmod。</div>';
    pane.appendChild(wrap);

    /* 站点 SEO 设置 */
    const editor = el('div', 'editor');
    editor.appendChild(el('div', 'editor-head', '<h2>站点 SEO 设置</h2>'));
    [
      { key: 'siteUrl', label: '站点主域名（canonical / sitemap 使用）', type: 'text', hint: '如 https://yiqiyun-site.app.workbuddy.host；绑定自有域名后请修改' },
      { key: 'keywords', label: '全站默认关键词（英文逗号分隔）', type: 'text' },
      { key: 'baiduToken', label: '百度普通收录 Token（用于 API 主动推送）', type: 'text', hint: '在百度搜索资源平台「普通收录-API推送」中获取' },
    ].forEach((f) => editor.appendChild(renderField(f, state.site.seo, () => touch('site'))));
    wrap.appendChild(editor);

    /* sitemap */
    const smCard = el('div', 'f-group');
    smCard.appendChild(el('div', 'g-title', 'Sitemap'));
    const smUrl = siteBaseUrl() + '/sitemap.xml';
    const smInfo = el('div', 'seo-row', '<span style="color:#9AA1B2;font-size:12.5px">读取 sitemap 状态中…</span>');
    smCard.appendChild(smInfo);
    const smActs = el('div', 'seo-acts');
    const mkBtn = (label, fn, cls) => {
      const b = el('button', 'btn btn-sm ' + (cls || 'btn-ghost'), label);
      b.type = 'button';
      b.addEventListener('click', fn);
      return b;
    };
    smActs.appendChild(mkBtn('打开 sitemap', () => window.open(smUrl, '_blank')));
    smActs.appendChild(mkBtn('复制 sitemap 地址', async () => {
      try { await navigator.clipboard.writeText(smUrl); toast('已复制'); } catch (e) { toast('复制失败，请手动复制：' + smUrl); }
    }));
    smActs.appendChild(mkBtn('通知 Bing 更新', () => {
      window.open('https://www.bing.com/ping?sitemap=' + encodeURIComponent(smUrl), '_blank');
      toast('已打开 Bing sitemap ping');
    }));
    smCard.appendChild(smActs);
    smCard.appendChild(el('div', 'hint', 'robots.txt 已指向该 sitemap；Google/Bing/百度等平台均可在站长后台直接提交此地址。'));
    wrap.appendChild(smCard);
    try {
      const res = await fetch('sitemap.xml');
      const txt = await res.text();
      const m = txt.match(/<lastmod>([^<]+)<\/lastmod>/);
      const urls = (txt.match(/<loc>/g) || []).length;
      smInfo.innerHTML = `<span style="font-size:12.5px;color:#2B8A5A">✓ 当前 sitemap 含 ${urls} 个 URL，最近更新：${m ? esc(m[1]) : '未知'}</span>`;
    } catch (e) {
      smInfo.innerHTML = '<span style="font-size:12.5px;color:#D14343">sitemap.xml 读取失败</span>';
    }

    /* 全站 URL 列表 + 百度推送 */
    const pushCard = el('div', 'f-group');
    pushCard.appendChild(el('div', 'g-title', 'URL 推送'));
    const ta = el('textarea');
    ta.style.minHeight = '110px';
    ta.value = pageUrls().join('\n');
    ta.addEventListener('input', () => {});
    pushCard.appendChild(ta);
    pushCard.appendChild(el('div', 'hint', '上方为全站页面地址（文章详情页地址可在对应文章页复制）。'));
    const pushActs = el('div', 'seo-acts');
    const pushMsg = el('div', 'hint', '');
    const pushBtn = el('button', 'btn btn-sm btn-primary', '推送到百度（API）');
    pushBtn.type = 'button';
    pushBtn.addEventListener('click', async () => {
      const token = String(state.site.seo.baiduToken || '').trim();
      const site = siteBaseUrl().replace(/^https?:\/\//, '');
      if (!token) { toast('请先填写百度普通收录 Token'); return; }
      const urls = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!urls.length) { toast('请先填写要推送的 URL'); return; }
      pushBtn.disabled = true;
      pushBtn.textContent = '推送中…';
      try {
        await fetch(`http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: urls.join('\n'),
        });
        pushMsg.textContent = '推送请求已发出（浏览器跨域限制无法读取返回值），请到百度搜索资源平台「普通收录」查看配额与结果。';
        toast('已发送到百度');
      } catch (e) {
        pushMsg.textContent = '推送失败：' + (e.message || '');
      } finally {
        pushBtn.disabled = false;
        pushBtn.textContent = '推送到百度（API）';
      }
    });
    pushActs.appendChild(pushBtn);
    pushCard.appendChild(pushActs);
    pushCard.appendChild(pushMsg);
    wrap.appendChild(pushCard);

    /* 站长平台入口 */
    const platCard = el('div', 'f-group');
    platCard.appendChild(el('div', 'g-title', '搜索引擎站长平台入口'));
    const grid = el('div', 'seo-grid');
    SEO_PLATFORMS.forEach((p) => {
      const card = el('button', 'seo-plat', `<b>${esc(p.name)}</b><span>${esc(p.desc)}</span>`);
      card.type = 'button';
      card.addEventListener('click', () => window.open(p.url, '_blank'));
      grid.appendChild(card);
    });
    platCard.appendChild(grid);
    platCard.appendChild(el('div', 'hint', '首次使用需在对应平台验证站点所有权（通常为上传验证文件或添加 DNS 记录），验证后即可提交 sitemap 并查看收录数据。'));
    wrap.appendChild(platCard);
  }

  /* ---------------- 留言 ---------------- */
  async function renderMessages(pane) {
    const wrap = el('div', 'msg-wrap');
    wrap.innerHTML = '<h2>客户留言</h2><div class="sub">来自「联系我们」表单的提交，最多显示最近 100 条。</div>';
    const box = el('div', '', '<div style="color:#9AA1B2;font-size:13px">加载中…</div>');
    wrap.appendChild(box);
    pane.appendChild(wrap);
    try {
      const rows = (await api.cms('cms_list_messages', { p_key: state.key })) || [];
      if (!rows.length) {
        box.innerHTML = '<div style="color:#9AA1B2;font-size:13px;padding:30px 0;text-align:center">还没有收到留言</div>';
        return;
      }
      box.innerHTML = '';
      rows.slice(0, 100).forEach((m) => {
        const d = new Date(m.created_at);
        const node = el('div', 'msg');
        node.innerHTML = `
          <div class="mh">
            <b>${esc(m.name || '匿名')}</b>
            <span class="c">${esc(m.contact || '')}</span>
            ${m.company ? `<span style="font-size:12px;color:#6C7488">${esc(m.company)}</span>` : ''}
            <span class="t">${d.toLocaleString('zh-CN', { hour12: false })}</span>
          </div>
          <p>${esc(m.message || '（未填写具体需求）')}</p>
          <div class="mf"><button class="btn btn-sm btn-ghost btn-danger">删除</button></div>`;
        node.querySelector('button').addEventListener('click', async () => {
          if (!confirm('删除这条留言？')) return;
          try {
            await api.cms('cms_delete_message', { p_key: state.key, p_id: m.id });
            node.remove();
            toast('已删除');
          } catch (e) {
            toast('删除失败：' + e.message);
          }
        });
        box.appendChild(node);
      });
    } catch (e) {
      box.innerHTML = `<div style="color:#D14343;font-size:13px">读取失败：${esc(e.message || '')}</div>`;
    }
  }

  /* ---------------- 入口 ---------------- */
  $('#loginBtn').addEventListener('click', doLogin);
  $('#keyInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  const saved = sessionStorage.getItem(KEY_STORE);
  if (saved) {
    state.key = saved;
    start();
  }
})();
