/* 亿企云 · 前台页面渲染 */
(function () {
  const YC = window.YC;
  const esc = YC.esc;

  /* 静态 URL 规则：首页 /，栏目页 /slug/，文章 /slug/123.html */
  const PAGE_FILE = (slug) => (slug === 'home' ? '/' : '/' + slug + '/');
  const SITE_FILE = PAGE_FILE;
  const ARTICLE_URL = (a) =>
    a && a.page_slug && a.id ? `/${a.page_slug}/${a.id}.html` : `article.html?id=${encodeURIComponent(a && a.id)}`;
  /* 兼容后台填写的旧式链接：contact.html → /contact/，index.html → / */
  const PAGE_HREF = (h) => {
    const m = String(h || '').trim();
    const f = m.match(/^([a-z]+)\.html?$/i);
    if (f) return f[1] === 'index' || f[1] === 'home' ? '/' : '/' + f[1].toLowerCase() + '/';
    return m;
  };
  const EDIT = new URLSearchParams(location.search).get('edit') === '1';
  /* 静态化补丁：GitHub Pages 子路径部署时剥掉 /<repo>/ 前缀再解析文章路径 */
  const RAW_PATH = (window.YC_BASE && window.YC_BASE !== '/' && location.pathname.startsWith(window.YC_BASE))
    ? '/' + location.pathname.slice(window.YC_BASE.length)
    : location.pathname;

  let state = { site: {}, pages: [], page: null, blocks: [] };

  /* ---------- 主题 ---------- */
  function applyTheme(site) {
    const t = site.theme || {};
    const root = document.documentElement.style;
    if (t.primary) root.setProperty('--primary', t.primary);
    if (t.accent) root.setProperty('--accent', t.accent);
  }

  /* ---------- 头部 ---------- */
  function renderHeader(site, pages, current) {
    const brand = site.brand || {};
    const nav = (pages || []).filter((p) => p.visible !== false);
    const cta = site.navCta || {};
    const logo = brand.logoImage
      ? `<img class="brand-logo" src="${YC.attr(brand.logoImage)}" alt="${YC.attr(brand.name || '')}">`
      : null;
    const mark = logo || esc(brand.logoMark || (brand.name || '亿').slice(0, 1));
    const brandHtml = logo
      ? logo
      : `<span class="brand-mark">${mark}</span>
          <span class="brand-text">
            <span class="brand-name">${esc(brand.logoText || brand.name || '亿企云')}</span>
            <span class="brand-sub">YIQIYUN</span>
          </span>`;

    const links = nav
      .map((p) => `<a href="${YC.attr(PAGE_FILE(p.slug))}" class="${p.slug === current ? 'is-active' : ''}">${esc(p.nav_label)}</a>`)
      .join('');

    return `<header class="site-header" id="siteHeader">
      <div class="wrap header-inner">
        <a class="brand" href="/">${brandHtml}</a>
        <nav class="nav">${links}</nav>
        <div class="header-cta">
          ${cta.text ? `<a class="btn btn-primary btn-sm" href="${YC.attr(PAGE_HREF(cta.href || '/contact/'))}">${esc(cta.text)}</a>` : ''}
          <button class="nav-toggle" id="navToggle" aria-label="菜单"><span></span><span></span><span></span></button>
        </div>
      </div>
    </header>
    <div class="mobile-nav" id="mobileNav">${links}</div>`;
  }

  /* ---------- 底部 ---------- */
  function renderFooter(site, pages) {
    const brand = site.brand || {};
    const f = site.footer || {};
    const c = site.contact || {};
    const groups = site.footerLinks || [];
    const legal = site.legal || [];

    return `<footer class="site-footer">
      <div class="wrap">
        <div class="footer-top">
          <div>
            <a class="brand" href="/">
              ${brand.logoFooter
                ? `<img class="brand-logo brand-logo-footer" src="${YC.attr(brand.logoFooter)}" alt="${YC.attr(brand.name || '')}">`
                : brand.logoImage
                  ? `<img class="brand-logo brand-logo-footer" src="${YC.attr(brand.logoImage)}" alt="${YC.attr(brand.name || '')}">`
                  : `<span class="brand-mark">${esc(brand.logoMark || (brand.name || '亿').slice(0, 1))}</span>
                      <span class="brand-text">
                        <span class="brand-name">${esc(brand.logoText || brand.name || '亿企云')}</span>
                        <span class="brand-sub">YIQIYUN</span>
                      </span>`}
            </a>
            <p class="footer-desc">${esc(f.desc || '')}</p>
          </div>
          ${groups.map((g) => `<div class="footer-col">
            <h4>${esc(g.title)}</h4>
            ${(g.items || []).map((i) => `<a href="${YC.attr(PAGE_HREF(i.href || '#'))}">${esc(i.label)}</a>`).join('')}
          </div>`).join('')}
          <div class="footer-col">
            <h4>联系我们</h4>
            <span>${esc(c.phone || '')}</span>
            <span>${esc(c.email || '')}</span>
            <span>${esc(c.address || '')}</span>
          </div>
        </div>
        <div class="footer-bottom">
          <span>${esc(f.copyright || '')} ${f.icp ? ' · ' + esc(f.icp) : ''}</span>
          <div class="links">${legal.map((l) => `<a href="${YC.attr(PAGE_HREF(l.href || '#'))}">${esc(l.label)}</a>`).join('')}</div>
        </div>
      </div>
    </footer>`;
  }

  /* ---------- SEO：meta / canonical / JSON-LD ---------- */

  function siteUrl(site) {
    return String((site.seo || {}).siteUrl || location.origin).replace(/\/+$/, '');
  }

  function setMeta(attrName, key, content) {
    if (!content) return;
    let n = document.head.querySelector(`meta[${attrName}="${key}"]`);
    if (!n) {
      n = document.createElement('meta');
      n.setAttribute(attrName, key);
      document.head.appendChild(n);
    }
    n.setAttribute('content', content);
  }

  function setLink(rel, href) {
    if (!href) return;
    let n = document.head.querySelector(`link[rel="${rel}"]`);
    if (!n) {
      n = document.createElement('link');
      n.setAttribute('rel', rel);
      document.head.appendChild(n);
    }
    n.setAttribute('href', href);
  }

  function setupSEO(site, page, opts) {
    opts = opts || {};
    const brand = site.brand || {};
    const base = siteUrl(site);
    const url = base + (opts.urlSuffix || SITE_FILE(page ? page.slug : 'home'));
    const title = document.title;
    const desc = opts.description || (page && page.description) || '';
    const keywords = opts.keywords || (page && page.keywords) || (site.seo || {}).keywords || '';

    setLink('canonical', (page && page.canonical) ? page.canonical : url);
    setMeta('name', 'robots', 'index,follow,max-image-preview:large');
    setMeta('name', 'keywords', keywords);
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', opts.ogType || 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:site_name', brand.name || '亿企云');
    setMeta('property', 'og:image', base + '/assets/img/logo-color.png');
    setMeta('name', 'twitter:card', 'summary_large_image');
  }

  function injectJSONLD(id, data) {
    let n = document.getElementById('jsonld-' + id);
    if (!n) {
      n = document.createElement('script');
      n.id = 'jsonld-' + id;
      n.type = 'application/ld+json';
      document.head.appendChild(n);
    }
    n.textContent = JSON.stringify(data);
  }

  function orgSchema(site) {
    const brand = site.brand || {};
    const c = site.contact || {};
    const base = siteUrl(site);
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': base + '/#organization',
      name: brand.name || '亿企云',
      url: base + '/',
      logo: base + '/assets/img/logo-mark.png',
      description: (site.footer || {}).desc || '',
      contactPoint: c.phone ? [{
        '@type': 'ContactPoint',
        telephone: '+' + String(c.phone).replace(/\D/g, ''),
        contactType: 'customer service',
        availableLanguage: ['zh-CN'],
      }] : undefined,
      email: c.email || undefined,
      address: c.address ? { '@type': 'PostalAddress', streetAddress: c.address, addressCountry: 'CN' } : undefined,
    };
  }

  function breadcrumbSchema(site, page) {
    const base = siteUrl(site);
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: base + '/' },
        { '@type': 'ListItem', position: 2, name: (page && (page.nav_label || page.title)) || '', item: base + SITE_FILE(page ? page.slug : '') },
      ],
    };
  }

  function faqSchemas(site, blocks) {
    (blocks || []).forEach((b, i) => {
      if (b.type !== 'faq' || b.visible === false) return;
      const items = ((b.props || {}).items || []).filter((x) => x.q && x.a);
      if (!items.length) return;
      injectJSONLD('faq-' + b.id, {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((x) => ({
          '@type': 'Question',
          name: x.q,
          acceptedAnswer: { '@type': 'Answer', text: x.a },
        })),
      });
    });
  }

  function serviceSchema(site, blocks) {
    const svc = (blocks || []).find((b) => b.type === 'features' && b.visible !== false);
    const base = siteUrl(site);
    const offers = svc && ((svc.props || {}).items || []).map((it) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: it.title, description: it.desc },
    }));
    injectJSONLD('service', {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'GEO 生成式引擎优化',
      name: '亿企云 GEO 生成式引擎优化服务',
      description: 'AI 可见度诊断、内容资产建模、全案 GEO 运营、AI 品牌监测与出海品牌优化。',
      provider: { '@id': base + '/#organization' },
      areaServed: { '@type': 'Country', name: 'China' },
      hasOfferCatalog: offers && offers.length ? { '@type': 'OfferCatalog', name: 'GEO 产品线', itemListElement: offers } : undefined,
    });
  }

  function localBusinessSchema(site) {
    const c = site.contact || {};
    const base = siteUrl(site);
    injectJSONLD('localbusiness', {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: (site.brand || {}).name || '亿企云',
      image: base + '/assets/img/logo-color.png',
      url: base + '/contact/',
      telephone: c.phone || undefined,
      email: c.email || undefined,
      address: c.address ? { '@type': 'PostalAddress', streetAddress: c.address, addressCountry: 'CN' } : undefined,
      openingHours: c.hours || undefined,
      parentOrganization: { '@id': base + '/#organization' },
    });
  }

  function articleSchema(site, a) {
    const base = siteUrl(site);
    injectJSONLD('article', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.title,
      description: a.summary || '',
      image: a.cover || base + '/assets/img/logo-color.png',
      datePublished: a.publish_date || undefined,
      inLanguage: 'zh-CN',
      author: { '@type': 'Organization', name: (site.brand || {}).name || '亿企云' },
      publisher: { '@id': base + '/#organization' },
      mainEntityOfPage: ARTICLE_URL(a),
    });
  }

  /* ---------- 板块 ---------- */
  function mountBlocks(blocks) {
    const main = document.getElementById('blocks');
    if (!main) return;
    const visible = (blocks || []).filter((b) => b.visible !== false);
    if (!visible.length) {
      main.innerHTML = `<div class="state-note">这一页还没有内容，去后台添加第一个板块吧。</div>`;
      return;
    }
    main.innerHTML = visible.map(YC.renderBlock).join('');
    observeReveal();
    loadArticles();
    if (EDIT) bindEdit(blocks);
  }

  /* ---------- 文章列表 ---------- */
  function articleCard(a) {
    const date = a.publish_date || '';
    const cover = a.cover
      ? `<img src="${YC.attr(a.cover)}" alt="" loading="lazy">`
      : `<span class="ac-ph">${esc(a.tag || 'GEO')}</span>`;
    return `<a class="article-card reveal" href="${YC.attr(ARTICLE_URL(a))}">
      <div class="ac-cover">${cover}</div>
      <div class="ac-body">
        <div class="ac-meta">${a.tag ? `<span class="ac-tag">${esc(a.tag)}</span>` : ''}<span class="ac-date">${esc(date)}</span></div>
        <h3 class="ac-title">${esc(a.title)}</h3>
        ${a.summary ? `<p class="ac-sum">${esc(a.summary)}</p>` : ''}
        <span class="ac-more">阅读全文${YC.icon('arrow')}</span>
      </div>
    </a>`;
  }

  async function loadArticles() {
    const boxes = document.querySelectorAll('[data-yc-articles]');
    if (!boxes.length || !state.page) return;
    try {
      const list = (await YC.api.getArticles(state.page.slug)).filter((a) => a.visible !== false);
      const html = list.length ? list.map(articleCard).join('') : `<div class="state-note">这个栏目还没有文章，去后台「文章」标签发布第一篇吧。</div>`;
      boxes.forEach((n) => (n.innerHTML = html));
      observeReveal();
    } catch (e) {
      boxes.forEach((n) => (n.innerHTML = `<div class="state-note">文章加载失败：${esc(e.message || '')}</div>`));
    }
  }

  /* ---------- 文章详情页 ---------- */
  /* 从静态路径 /news/1.html 或 /article.html?id=1 解析文章 */
  function parseArticleRef() {
    const pm = RAW_PATH.match(/^\/([a-z0-9-]+)\/(\d+)\.html?$/i);
    if (pm) return { id: pm[2], slug: pm[1].toLowerCase(), urlSuffix: pm[0] };
    const q = new URLSearchParams(location.search).get('id');
    if (q) return { id: q, slug: null, urlSuffix: 'article.html?id=' + encodeURIComponent(q) };
    return null;
  }

  async function renderArticlePage() {
    const main = document.getElementById('blocks');
    const ref = parseArticleRef();
    if (!ref) {
      main.innerHTML = `<div class="state-note">缺少文章参数。<a href="/">返回首页</a></div>`;
      return;
    }
    try {
      const a = await YC.api.getArticle(ref.id);
      if (!a || a.visible === false) throw new Error('文章不存在或已下线');
      const page = state.pages.find((p) => p.slug === a.page_slug) || null;
      document.title = `${a.title} | ${(state.site.brand || {}).name || '亿企云'}`;
      const md = document.querySelector('meta[name="description"]');
      if (md && a.summary) md.setAttribute('content', a.summary);
      setupSEO(state.site, page, {
        urlSuffix: ref.urlSuffix,
        description: a.summary || '',
        keywords: [a.tag, (state.site.seo || {}).keywords].filter(Boolean).join(','),
        ogType: 'article',
      });
      if (page) injectJSONLD('breadcrumb', breadcrumbSchema(state.site, page));
      articleSchema(state.site, a);
      const paras = String(a.content || '').split(/\n+/).filter((t) => t.trim());
      main.innerHTML = `<article class="article-page blk" data-type="article">
        <div class="wrap wrap-narrow">
          <nav class="crumb"><a href="javascript:history.back()">← 返回</a></nav>
          <div class="ac-meta">${a.tag ? `<span class="ac-tag">${esc(a.tag)}</span>` : ''}<span class="ac-date">${esc(a.publish_date || '')}</span></div>
          <h1 class="ap-title">${esc(a.title)}</h1>
          ${a.summary ? `<p class="ap-sum">${esc(a.summary)}</p>` : ''}
          ${a.cover ? `<div class="ap-cover"><img src="${YC.attr(a.cover)}" alt="${YC.attr(a.title)}"></div>` : ''}
          <div class="ap-body">${paras.map((t) => `<p>${YC.nl2br(t)}</p>`).join('')}</div>
          <div class="ap-foot">
            <a class="btn btn-primary" href="/contact/">预约 GEO 诊断${YC.icon('arrow')}</a>
          </div>
        </div>
      </article>`;
      observeReveal();
    } catch (e) {
      main.innerHTML = `<div class="state-note">${esc(e.message || '文章加载失败')}　<a href="javascript:history.back()">← 返回</a></div>`;
    }
  }

  /* ---------- 进场动画 ---------- */
  let io = null;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((n) => n.classList.add('in'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e, i) => {
            if (e.isIntersecting) {
              const el = e.target;
              setTimeout(() => el.classList.add('in'), Math.min(i * 60, 240));
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
    }
    document.querySelectorAll('.reveal:not(.in)').forEach((n) => io.observe(n));
  }

  /* ---------- 编辑态（后台 iframe 内） ---------- */
  function bindEdit(blocks) {
    document.body.classList.add('yc-edit');
    const byId = new Map(blocks.map((b) => [String(b.id), b]));
    document.querySelectorAll('.blk[data-block-id]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        document.querySelectorAll('.blk.is-selected').forEach((n) => n.classList.remove('is-selected'));
        el.classList.add('is-selected');
        const b = byId.get(el.dataset.blockId);
        window.parent.postMessage({ source: 'yc-site', type: 'yc-select', id: el.dataset.blockId, type2: b && b.type }, '*');
      });
    });
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.source !== 'yc-admin') return;
    if (d.type === 'yc-preview') {
      state.blocks = d.blocks || [];
      mountBlocks(state.blocks);
      const site = d.site || state.site;
      if (site && site.brand) {
        state.site = site;
        applyTheme(site);
        document.getElementById('header').innerHTML = renderHeader(site, state.pages, state.page ? state.page.slug : '');
        document.getElementById('footer').innerHTML = renderFooter(site, state.pages);
        bindChrome();
      }
    }
    if (d.type === 'yc-highlight') {
      document.querySelectorAll('.blk.is-selected').forEach((n) => n.classList.remove('is-selected'));
      const el = document.querySelector(`.blk[data-block-id="${d.id}"]`);
      if (el) el.classList.add('is-selected');
    }
  });

  /* ---------- 头部交互 ---------- */
  function bindChrome() {
    const header = document.getElementById('siteHeader');
    const toggle = document.getElementById('navToggle');
    const mobile = document.getElementById('mobileNav');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    if (toggle && mobile) {
      toggle.addEventListener('click', () => mobile.classList.toggle('is-open'));
    }
  }

  /* ---------- 咨询表单 ---------- */
  function bindForm() {
    document.addEventListener('submit', async (ev) => {
      const form = ev.target.closest('[data-yc-form]');
      if (!form) return;
      ev.preventDefault();
      const msg = form.querySelector('[data-yc-form-msg]');
      const btn = form.querySelector('button[type="submit"]');
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const contact = String(fd.get('contact') || '').trim();
      if (!name || !contact) {
        if (msg) { msg.className = 'form-msg err'; msg.textContent = '请填写称呼和联系方式。'; }
        return;
      }
      if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }
      try {
        await YC.api.sendMessage({
          name,
          contact,
          company: String(fd.get('company') || '').trim(),
          message: String(fd.get('message') || '').trim(),
          source_page: document.body.dataset.page || '',
        });
        form.reset();
        if (msg) { msg.className = 'form-msg ok'; msg.textContent = '已收到，我们会在一个工作日内联系你。'; }
      } catch (e) {
        if (msg) { msg.className = 'form-msg err'; msg.textContent = '提交失败：' + (e.message || '请稍后重试'); }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = '提交，等我们联系'; }
      }
    });
  }

  /* ---------- 启动 ---------- */
  async function boot() {
    const slug = document.body.dataset.page || 'home';
    const blocksEl = document.getElementById('blocks');
    bindForm();

    try {
      const [site, pages] = await Promise.all([YC.api.getSite(), YC.api.getPages()]);
      state.site = site;
      state.pages = pages;
      state.page = pages.find((p) => p.slug === slug) || null;
      applyTheme(site);

      document.getElementById('header').innerHTML = renderHeader(site, pages, slug);
      document.getElementById('footer').innerHTML = renderFooter(site, pages);
      if (state.page) {
        const brandName = (site.brand || {}).name || '亿企云';
        const t = state.page.title || state.page.nav_label || '';
        document.title = t.includes(brandName) ? t : `${t} | ${brandName}`;
        const md = document.querySelector('meta[name="description"]');
        if (md && state.page.description) md.setAttribute('content', state.page.description);
      }
      setupSEO(site, state.page);
      injectJSONLD('org', orgSchema(site));
      bindChrome();

      if (state.page) {
        state.blocks = await YC.api.getBlocks(state.page.id);
        if (state.page.slug !== 'home') injectJSONLD('breadcrumb', breadcrumbSchema(site, state.page));
        if (state.page.slug === 'services') serviceSchema(site, state.blocks);
        if (state.page.slug === 'contact') localBusinessSchema(site);
        faqSchemas(site, state.blocks);
        mountBlocks(state.blocks);
      } else if (slug === 'article') {
        await renderArticlePage();
      } else {
        blocksEl.innerHTML = `<div class="state-note">页面不存在。 <a href="/">返回首页</a></div>`;
      }
    } catch (e) {
      if (blocksEl) {
        blocksEl.innerHTML = `<div class="state-note">内容加载失败：${esc(e.message || '未知错误')}<br><a href="javascript:location.reload()">重新加载</a></div>`;
      }
      console.error('[亿企云] 内容加载失败', e && e.message);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
