/* 亿企云 · 静态版数据访问层
   站点内容由构建时导出到 assets/js/data-static.js，浏览器端只读本地数据。 */
(function () {
  const YC = (window.YC = window.YC || {});
  const D = window.YC_DATA || { site: {}, pages: [], blocks: [], articles: [] };
  const ok = (v) => Promise.resolve(v);

  const api = {
    getSite: () => ok(D.site || {}),
    getPages: () => ok(D.pages || []),
    getBlocks: (pageId) => ok((D.blocks || []).filter((b) => String(b.page_id) === String(pageId))),
    getArticles: (slug) => ok((D.articles || []).filter((a) => a.page_slug === slug)),
    getArticle: (id) => ok((D.articles || []).find((a) => String(a.id) === String(id)) || null),
    sendMessage: () => Promise.reject(new Error('本站为静态托管演示站，留言功能需接入后端接口')),
    cms: () => Promise.reject(new Error('静态站点无后台接口')),
    uploadImage: () => Promise.reject(new Error('静态站点无上传接口')),
    backupDb: () => Promise.reject(new Error('静态站点无备份接口')),
    restoreDb: () => Promise.reject(new Error('静态站点无备份接口')),
  };
  YC.api = api;
})();
