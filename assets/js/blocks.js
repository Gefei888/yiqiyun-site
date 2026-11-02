/* 亿企云 · 板块定义与渲染
   同一份定义同时驱动前台渲染与后台表单，保证「后台能改到页面上的每一处」。 */
(function () {
  const YC = (window.YC = window.YC || {});

  /* ---------------- 基础工具 ---------------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);
  }
  function attr(v) { return esc(v); }
  function nl2br(v) { return esc(v).replace(/\n/g, '<br>'); }

  const ICONS = {
    layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13l9 5 9-5"/>',
    radar: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.7-3.7"/>',
    globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.6 3 2.6 14.2 0 17.2M12 3.4c-2.6 3-2.6 14.2 0 17.2"/>',
    target: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    chart: '<path d="M4 20h16"/><rect x="5.5" y="11" width="3.2" height="6.2" rx="1.1"/><rect x="10.4" y="6.8" width="3.2" height="10.4" rx="1.1"/><rect x="15.3" y="9" width="3.2" height="8.2" rx="1.1"/>',
    spark: '<path d="M12 3.2l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.7L12 3.2Z"/>',
    shield: '<path d="M12 3.2l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9v-6l7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    phone: '<path d="M6.4 3.6h3l1.5 3.9-2 1.5a12.2 12.2 0 0 0 6.1 6.1l1.5-2 3.9 1.5v3a2 2 0 0 1-2.1 2A16.6 16.6 0 0 1 4.4 5.7a2 2 0 0 1 2-2.1Z"/>',
    mail: '<rect x="3" y="5.2" width="18" height="13.6" rx="2.6"/><path d="m4.2 7.4 7.8 5.6 7.8-5.6"/>',
    pin: '<path d="M12 21s7-5.7 7-11.1a7 7 0 1 0-14 0C5 15.3 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.6"/>',
    clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.1 1.9"/>',
    check: '<path d="m5 12.6 4.6 4.4L19 7.6"/>',
    arrow: '<path d="M5 12h13M13 6.6 18.4 12 13 17.4"/>',
    chat: '<path d="M4 6.6A2.6 2.6 0 0 1 6.6 4h10.8A2.6 2.6 0 0 1 20 6.6v6.8a2.6 2.6 0 0 1-2.6 2.6H9.2L4 20.2V6.6Z"/>',
    bolt: '<path d="M13 3 5 13.6h5L10.4 21 19 10.4h-5.2L13 3Z"/>',
    users: '<circle cx="9.2" cy="8" r="3.2"/><path d="M3.6 19.6c.6-3 2.8-4.9 5.6-4.9s5 1.9 5.6 4.9"/><path d="M16 5.7a3.2 3.2 0 0 1 0 6.2M17.6 15c2 .6 3.4 2.2 3.8 4.6"/>',
    compass: '<circle cx="12" cy="12" r="8.6"/><path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5 4.5-1.9Z"/>',
  };

  const ICON_OPTIONS = [
    { v: 'spark', l: '星光' }, { v: 'layers', l: '分层' }, { v: 'radar', l: '雷达' },
    { v: 'search', l: '搜索' }, { v: 'globe', l: '全球' }, { v: 'target', l: '靶心' },
    { v: 'chart', l: '图表' }, { v: 'shield', l: '盾牌' }, { v: 'bolt', l: '闪电' },
    { v: 'users', l: '团队' }, { v: 'compass', l: '罗盘' }, { v: 'chat', l: '对话' },
    { v: 'phone', l: '电话' }, { v: 'mail', l: '邮件' }, { v: 'pin', l: '定位' }, { v: 'clock', l: '时间' },
  ];

  function icon(name, cls) {
    const body = ICONS[name] || ICONS.spark;
    return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  function head(p, center) {
    if (!p.eyebrow && !p.title && !p.desc) return '';
    return `<div class="section-head${center ? ' is-center' : ''} reveal">
      ${p.eyebrow ? `<span class="eyebrow">${esc(p.eyebrow)}</span>` : ''}
      ${p.title ? `<h2 class="section-title">${esc(p.title)}</h2>` : ''}
      ${p.desc ? `<p class="section-desc">${nl2br(p.desc)}</p>` : ''}
    </div>`;
  }

  function media(url, alt) {
    if (!url) return '';
    return `<img src="${attr(url)}" alt="${attr(alt || '')}" loading="lazy" decoding="async">`;
  }

  /* 兼容旧式链接：contact.html → /contact/ */
  function href(h) {
    const m = String(h || '').trim();
    const f = m.match(/^([a-z]+)\.html?$/i);
    if (f) return f[1] === 'index' || f[1] === 'home' ? '/' : '/' + f[1].toLowerCase() + '/';
    return m;
  }

  function btn(p, kind) {
    if (!p.text) return '';
    return `<a class="btn ${kind}" href="${attr(href(p.href || '#'))}">${esc(p.text)}${kind === 'btn-primary' ? icon('arrow') : ''}</a>`;
  }

  /* ---------------- 板块类型 ---------------- */
  const TYPES = {
    pageHeader: {
      label: '页面头图区',
      hint: '内页顶部的标题区',
      defaults: { eyebrow: '标题标签', title: '页面标题', desc: '一句话说明这个页面在讲什么。' },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '页面大标题', type: 'text' },
        { key: 'desc', label: '说明文字', type: 'textarea' },
      ],
      render: (p) => `<section class="blk pagehead" data-type="pageHeader">
        <div class="wrap">
          ${p.eyebrow ? `<span class="eyebrow">${esc(p.eyebrow)}</span>` : ''}
          <h1>${esc(p.title)}</h1>
          ${p.desc ? `<p>${nl2br(p.desc)}</p>` : ''}
        </div>
      </section>`,
    },

    hero: {
      label: '首屏 Hero',
      hint: '大标题 + 按钮 + 配图，网站第一眼',
      defaults: {
        variant: 'split', eyebrow: 'GEO · 生成式引擎优化',
        title: '让你的品牌，', titleHighlight: '成为 AI 的答案',
        subtitle: '用一句话说明你为客户解决什么问题。',
        primaryText: '立即咨询', primaryHref: '/contact/',
        secondaryText: '了解更多', secondaryHref: '/services/',
        image: '', tags: ['核心优势一', '核心优势二', '核心优势三'],
      },
      fields: [
        { key: 'variant', label: '布局', type: 'select', options: [{ v: 'split', l: '左右分栏' }, { v: 'centered', l: '居中' }] },
        { key: 'eyebrow', label: '顶部小标签', type: 'text' },
        { key: 'title', label: '主标题（上行）', type: 'text' },
        { key: 'titleHighlight', label: '主标题（渐变高亮行）', type: 'text' },
        { key: 'subtitle', label: '副标题', type: 'textarea' },
        { key: 'primaryText', label: '主按钮文字', type: 'text' },
        { key: 'primaryHref', label: '主按钮链接', type: 'text' },
        { key: 'secondaryText', label: '次按钮文字', type: 'text' },
        { key: 'secondaryHref', label: '次按钮链接', type: 'text' },
        { key: 'image', label: '右侧配图', type: 'image' },
        { key: 'tags', label: '优势标签（每行一个）', type: 'strlist' },
      ],
      render: (p) => {
        const centered = p.variant === 'centered';
        const tags = (p.tags || []).filter(Boolean);
        return `<section class="blk hero ${centered ? 'is-centered' : ''}" data-type="hero">
          <div class="wrap hero-grid">
            <div class="hero-copy">
              ${p.eyebrow ? `<span class="pill"><i></i>${esc(p.eyebrow)}</span>` : ''}
              <h1>${esc(p.title || '')}${p.titleHighlight ? `<br><span class="grad">${esc(p.titleHighlight)}</span>` : ''}</h1>
              ${p.subtitle ? `<p class="lead">${nl2br(p.subtitle)}</p>` : ''}
              <div class="hero-actions">
                ${btn({ text: p.primaryText, href: p.primaryHref }, 'btn-primary btn-lg')}
                ${btn({ text: p.secondaryText, href: p.secondaryHref }, 'btn-ghost btn-lg')}
              </div>
              ${tags.length ? `<ul class="hero-tags">${tags.map((t) => `<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul>` : ''}
            </div>
            ${centered ? '' : `<div class="hero-art">
              <div class="frame">${media(p.image, '亿企云')}</div>
              <div class="float float-a">
                <span class="dot">${icon('radar')}</span>
                <div><div class="k">AI 提及率</div><div class="v">+65%</div></div>
              </div>
              <div class="float float-b">
                <span class="dot">${icon('target')}</span>
                <div><div class="k">答案位次</div><div class="v">Top 3</div></div>
              </div>
            </div>`}
          </div>
        </section>`;
      },
    },

    metrics: {
      label: '数据指标',
      hint: '一排关键数字',
      defaults: { items: [{ value: '300+', label: '服务企业' }, { value: '92%', label: '见效率' }] },
      fields: [
        { key: 'items', label: '指标', type: 'list', itemLabel: '指标', newItem: () => ({ value: '100+', label: '指标名称' }),
          fields: [{ key: 'value', label: '数值', type: 'text' }, { key: 'label', label: '说明', type: 'text' }] },
      ],
      render: (p) => {
        const items = p.items || [];
        if (!items.length) return '';
        return `<section class="blk metrics"><div class="wrap"><div class="metrics-grid reveal">
          ${items.map((m) => `<div class="m"><div class="v">${esc(m.value)}</div><div class="l">${esc(m.label)}</div></div>`).join('')}
        </div></div></section>`;
      },
    },

    features: {
      label: '能力网格',
      hint: '图标卡片阵列，适合陈述能力/优势',
      defaults: {
        eyebrow: '核心能力', title: '在这里写一个有力的标题', desc: '', columns: 3,
        items: [
          { icon: 'spark', title: '能力名称', desc: '用两行说明这项能力带来的结果。' },
          { icon: 'target', title: '能力名称', desc: '用两行说明这项能力带来的结果。' },
          { icon: 'chart', title: '能力名称', desc: '用两行说明这项能力带来的结果。' },
        ],
      },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'desc', label: '说明', type: 'textarea' },
        { key: 'columns', label: '每行列数', type: 'select', options: [{ v: 2, l: '2 列' }, { v: 3, l: '3 列' }, { v: 4, l: '4 列' }] },
        { key: 'items', label: '卡片', type: 'list', itemLabel: '卡片', newItem: () => ({ icon: 'spark', title: '新能力', desc: '描述' }),
          fields: [
            { key: 'icon', label: '图标', type: 'select', options: ICON_OPTIONS },
            { key: 'title', label: '标题', type: 'text' },
            { key: 'desc', label: '描述', type: 'textarea' },
          ] },
      ],
      render: (p) => `<section class="blk section section--soft" data-type="features">
        <div class="wrap">
          ${head(p, false)}
          <div class="feature-grid reveal" data-cols="${esc(p.columns || 3)}">
            ${(p.items || []).map((it) => `<div class="card">
              <div class="ic-box">${icon(it.icon)}</div>
              <h3>${esc(it.title)}</h3>
              <p>${nl2br(it.desc)}</p>
            </div>`).join('')}
          </div>
        </div>
      </section>`,
    },

    textImage: {
      label: '图文分栏',
      hint: '一侧文字一侧图片，适合讲清一个观点',
      defaults: {
        eyebrow: '小标签', title: '在这里写一个观点', desc: '一段 2-4 行的说明文字。',
        bullets: ['要点一', '要点二', '要点三'], image: '', imageSide: 'right',
        primaryText: '', primaryHref: '',
      },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'desc', label: '正文', type: 'textarea' },
        { key: 'bullets', label: '要点（每行一个）', type: 'strlist' },
        { key: 'image', label: '配图', type: 'image' },
        { key: 'imageSide', label: '图片位置', type: 'select', options: [{ v: 'right', l: '右侧' }, { v: 'left', l: '左侧' }] },
        { key: 'primaryText', label: '按钮文字（可留空）', type: 'text' },
        { key: 'primaryHref', label: '按钮链接', type: 'text' },
      ],
      render: (p) => `<section class="blk section" data-type="textImage">
        <div class="wrap">
          <div class="split reveal ${p.imageSide === 'left' ? 'is-reverse' : ''}">
            <div class="text">
              ${p.eyebrow ? `<span class="eyebrow">${esc(p.eyebrow)}</span>` : ''}
              <h2>${esc(p.title)}</h2>
              ${p.desc ? `<p class="body">${nl2br(p.desc)}</p>` : ''}
              ${(p.bullets || []).filter(Boolean).length ? `<ul class="checks">${p.bullets.filter(Boolean).map((b) => `<li><span class="tick">${icon('check')}</span><span>${esc(b)}</span></li>`).join('')}</ul>` : ''}
              ${p.primaryText ? `<div class="foot">${btn({ text: p.primaryText, href: p.primaryHref }, 'btn-ghost')}</div>` : ''}
            </div>
            <div class="media">${media(p.image, p.title)}</div>
          </div>
        </div>
      </section>`,
    },

    process: {
      label: '流程步骤',
      hint: '带序号的步骤条',
      defaults: {
        eyebrow: '交付流程', title: '四步完成交付', desc: '',
        steps: [{ title: '第一步', desc: '说明这一步做什么。' }, { title: '第二步', desc: '说明这一步做什么。' }],
      },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'desc', label: '说明', type: 'textarea' },
        { key: 'steps', label: '步骤', type: 'list', itemLabel: '步骤', newItem: () => ({ title: '新步骤', desc: '说明' }),
          fields: [{ key: 'title', label: '步骤名', type: 'text' }, { key: 'desc', label: '说明', type: 'textarea' }] },
      ],
      render: (p) => `<section class="blk section" data-type="process">
        <div class="wrap">
          ${head(p, true)}
          <div class="steps reveal">
            ${(p.steps || []).map((s, i) => `<div class="step">
              <div class="num">0${i + 1}</div>
              <h3>${esc(s.title)}</h3>
              <p>${nl2br(s.desc)}</p>
            </div>`).join('')}
          </div>
        </div>
      </section>`,
    },

    cases: {
      label: '案例卡片',
      hint: '带成果数字的案例网格',
      defaults: {
        eyebrow: '服务案例', title: '他们已经在 AI 的答案里', desc: '',
        items: [{ tag: '行业', title: '客户名称', desc: '一句话说明做了什么、带来什么结果。', metric: '+120%', metricLabel: '核心指标', image: '' }],
      },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'desc', label: '说明', type: 'textarea' },
        { key: 'items', label: '案例', type: 'list', itemLabel: '案例',
          newItem: () => ({ tag: '行业', title: '客户名称', desc: '描述', metric: '+100%', metricLabel: '核心指标', image: '' }),
          fields: [
            { key: 'image', label: '封面图（可留空）', type: 'image' },
            { key: 'tag', label: '行业标签', type: 'text' },
            { key: 'title', label: '客户名称', type: 'text' },
            { key: 'desc', label: '描述', type: 'textarea' },
            { key: 'metric', label: '成果数字', type: 'text' },
            { key: 'metricLabel', label: '数字说明', type: 'text' },
          ] },
      ],
      render: (p) => `<section class="blk section section--soft" data-type="cases">
        <div class="wrap">
          ${head(p, false)}
          <div class="case-grid reveal">
            ${(p.items || []).map((c) => `<article class="case">
              <div class="cover">
                ${c.image ? media(c.image, c.title) : `<span class="initial">${esc((c.title || 'C').slice(0, 2))}</span>`}
                ${c.tag ? `<span class="tagchip">${esc(c.tag)}</span>` : ''}
              </div>
              <div class="body">
                <h3>${esc(c.title)}</h3>
                <p>${nl2br(c.desc)}</p>
                ${c.metric ? `<div class="metric"><b>${esc(c.metric)}</b><span>${esc(c.metricLabel || '')}</span></div>` : ''}
              </div>
            </article>`).join('')}
          </div>
        </div>
      </section>`,
    },

    logos: {
      label: '客户 Logo 墙',
      hint: '一行文字形式的客户名',
      defaults: { title: '已服务 300+ 企业', items: [{ name: '客户一' }, { name: '客户二' }, { name: '客户三' }, { name: '客户四' }] },
      fields: [
        { key: 'title', label: '标题', type: 'text' },
        { key: 'items', label: '客户', type: 'list', itemLabel: '客户', newItem: () => ({ name: '客户名' }),
          fields: [{ key: 'name', label: '名称', type: 'text' }] },
      ],
      render: (p) => `<section class="blk logos" data-type="logos">
        <div class="wrap">
          ${p.title ? `<p class="lg-title">${esc(p.title)}</p>` : ''}
          <div class="logo-row reveal">${(p.items || []).map((i) => `<span class="lg">${esc(i.name)}</span>`).join('')}</div>
        </div>
      </section>`,
    },

    testimonial: {
      label: '客户证言',
      hint: '居中大段引用',
      defaults: { quote: '把客户最有说服力的一句话放在这里。', author: '姓名', role: '公司 · 职位' },
      fields: [
        { key: 'quote', label: '引用内容', type: 'textarea' },
        { key: 'author', label: '姓名', type: 'text' },
        { key: 'role', label: '身份', type: 'text' },
      ],
      render: (p) => `<section class="blk section section--soft" data-type="testimonial">
        <div class="wrap">
          <div class="quote-block reveal">
            <div class="mark">“</div>
            <blockquote>${nl2br(p.quote)}</blockquote>
            <div class="who">
              <span class="avatar">${esc((p.author || '·').slice(0, 1))}</span>
              <div><div class="n">${esc(p.author)}</div><div class="r">${esc(p.role)}</div></div>
            </div>
          </div>
        </div>
      </section>`,
    },

    faq: {
      label: '常见问题',
      hint: '可展开的问答列表',
      defaults: { eyebrow: '常见问题', title: '你可能想知道', items: [{ q: '问题一？', a: '答案。' }] },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'items', label: '问答', type: 'list', itemLabel: '问答', newItem: () => ({ q: '新问题？', a: '答案。' }),
          fields: [{ key: 'q', label: '问题', type: 'text' }, { key: 'a', label: '答案', type: 'textarea' }] },
      ],
      render: (p) => `<section class="blk section" data-type="faq">
        <div class="wrap">
          <div class="section-head is-center reveal">
            ${p.eyebrow ? `<span class="eyebrow">${esc(p.eyebrow)}</span>` : ''}
            ${p.title ? `<h2 class="section-title">${esc(p.title)}</h2>` : ''}
          </div>
          <div class="faq-list reveal">
            ${(p.items || []).map((f) => `<details class="faq-item"><summary>${esc(f.q)}</summary><div class="a">${nl2br(f.a)}</div></details>`).join('')}
          </div>
        </div>
      </section>`,
    },

    cta: {
      label: '行动号召',
      hint: '深色横幅 + 按钮',
      defaults: { title: '在这里写一句让人想行动的标题', desc: '补充一句说明。', primaryText: '立即咨询', primaryHref: '/contact/', note: '' },
      fields: [
        { key: 'title', label: '标题', type: 'text' },
        { key: 'desc', label: '说明', type: 'textarea' },
        { key: 'primaryText', label: '按钮文字', type: 'text' },
        { key: 'primaryHref', label: '按钮链接', type: 'text' },
        { key: 'note', label: '底部小字', type: 'text' },
      ],
      render: (p) => `<section class="blk cta-band" data-type="cta">
        <div class="wrap"><div class="cta-inner reveal">
          <h2>${esc(p.title)}</h2>
          ${p.desc ? `<p>${nl2br(p.desc)}</p>` : ''}
          <div class="act">${btn({ text: p.primaryText, href: p.primaryHref }, 'btn-dark btn-lg')}</div>
          ${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}
        </div></div>
      </section>`,
    },

    contact: {
      label: '联系方式 + 表单',
      hint: '联系方式列表与咨询表单',
      defaults: {
        eyebrow: '联系方式', title: '三种方式，随时找到我们', desc: '',
        items: [
          { icon: 'phone', label: '咨询热线', value: '400-000-0000' },
          { icon: 'mail', label: '商务邮箱', value: 'hello@example.com' },
          { icon: 'pin', label: '公司地址', value: '城市 · 地址' },
        ],
        showForm: true, formTitle: '留下联系方式', formDesc: '我们会尽快回复你。',
      },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'desc', label: '说明', type: 'textarea' },
        { key: 'items', label: '联系信息', type: 'list', itemLabel: '条目', newItem: () => ({ icon: 'phone', label: '名称', value: '内容' }),
          fields: [
            { key: 'icon', label: '图标', type: 'select', options: ICON_OPTIONS },
            { key: 'label', label: '名称', type: 'text' },
            { key: 'value', label: '内容', type: 'text' },
          ] },
        { key: 'showForm', label: '显示咨询表单', type: 'bool' },
        { key: 'formTitle', label: '表单标题', type: 'text' },
        { key: 'formDesc', label: '表单说明', type: 'text' },
      ],
      render: (p) => `<section class="blk section" data-type="contact">
        <div class="wrap contact-grid">
          <div class="reveal">
            ${p.eyebrow ? `<span class="eyebrow">${esc(p.eyebrow)}</span>` : ''}
            <h2 class="section-title">${esc(p.title)}</h2>
            ${p.desc ? `<p class="section-desc">${nl2br(p.desc)}</p>` : ''}
            <div class="contact-list">
              ${(p.items || []).map((i) => `<div class="row">
                <span class="ic">${icon(i.icon)}</span>
                <div><div class="k">${esc(i.label)}</div><div class="v">${esc(i.value)}</div></div>
              </div>`).join('')}
            </div>
          </div>
          ${p.showForm === false ? '' : `<div class="form-card reveal">
            <h3>${esc(p.formTitle || '留下联系方式')}</h3>
            ${p.formDesc ? `<p class="fd">${esc(p.formDesc)}</p>` : ''}
            <form class="form" data-yc-form>
              <div class="row2">
                <div class="field"><label>你的称呼</label><input name="name" required maxlength="40" placeholder="怎么称呼你"></div>
                <div class="field"><label>手机 / 微信</label><input name="contact" required maxlength="60" placeholder="方便联系的方式"></div>
              </div>
              <div class="field"><label>公司 / 品牌</label><input name="company" maxlength="60" placeholder="你所在的品牌"></div>
              <div class="field"><label>想解决的问题</label><textarea name="message" maxlength="800" placeholder="例如：我们想出现在「GEO 服务商」的 AI 答案里"></textarea></div>
              <button class="btn btn-primary" type="submit">提交，等我们联系</button>
              <div class="form-msg" data-yc-form-msg></div>
            </form>
          </div>`}
        </div>
      </section>`,
    },

    richtext: {
      label: '长文段落',
      hint: '纯文字段落，适合制度、说明',
      defaults: { title: '标题', paragraphs: ['第一段内容。'] },
      fields: [
        { key: 'title', label: '标题', type: 'text' },
        { key: 'paragraphs', label: '段落（每行一段）', type: 'strlist' },
      ],
      render: (p) => `<section class="blk section" data-type="richtext">
        <div class="wrap richtext reveal">
          ${p.title ? `<h2>${esc(p.title)}</h2>` : ''}
          ${(p.paragraphs || []).filter(Boolean).map((t) => `<p>${nl2br(t)}</p>`).join('')}
        </div>
      </section>`,
    },

    articles: {
      label: '文章列表',
      hint: '展示本栏目文章，内容在后台「文章」标签维护',
      defaults: { eyebrow: '全部文章', title: '文章列表', desc: '' },
      fields: [
        { key: 'eyebrow', label: '小标签', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'desc', label: '说明文字', type: 'textarea' },
      ],
      render: (p) => `<section class="blk section" data-type="articles">
        <div class="wrap">
          ${head(p, true)}
          <div class="article-grid" data-yc-articles><div class="state-note"><div class="spin"></div>正在加载文章</div></div>
        </div>
      </section>`,
    },
  };

  function renderBlock(block) {
    const def = TYPES[block.type];
    if (!def) return '';
    const html = def.render(block.props || {});
    return html.replace('class="blk', `data-block-id="${block.id}" class="blk`);
  }

  YC.esc = esc;
  YC.attr = attr;
  YC.icon = icon;
  YC.nl2br = nl2br;
  YC.TYPES = TYPES;
  YC.ICON_OPTIONS = ICON_OPTIONS;
  YC.renderBlock = renderBlock;
})();
