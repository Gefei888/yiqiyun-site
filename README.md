# 亿企云官网（GitHub Pages 静态版）

亿企云 GEO 生成式引擎优化服务商官网的纯静态版本，部署于 GitHub Pages。

- 线上地址：https://gefei888.github.io/yiqiyun-site/
- 内容来源：构建时从站点数据库（`data/site.db`）导出到 `assets/js/data-static.js`
- 页面：首页 / 关于我们 / 产品服务 / 服务案例 / 公司新闻 / 技术知识 / 联系我们 + 6 篇文章详情 + 404

## 特点

- **预渲染静态 HTML**：内容直接写在 HTML 里，搜索引擎与 AI 爬虫（GEO 场景）无需执行 JS 即可读取全文
- **保留交互**：JS 在浏览器端用同一份数据重新渲染，移动端菜单、进场动画等交互不变
- **子路径适配**：`assets/js/base.js` 自动探测部署前缀（`/<repo>/`），导航与图片链接自适应
- **SEO**：每页含 canonical / OG / JSON-LD（Organization、FAQPage、Service、Article、BreadcrumbList）

## 与自主版（PHP）的差异

| 功能 | 自主版（宝塔部署） | GitHub Pages 静态版 |
| --- | --- | --- |
| 内容展示 | ✅ | ✅（构建时快照） |
| 后台管理 admin | ✅ | ❌ |
| 留言表单提交 | ✅ | ❌（提交会提示需后端） |
| 图片上传 | ✅ | ❌ |

需要后台/留言功能时，请使用 `yiqiyun-site-bt.zip`（宝塔面板 PHP 部署包）。

## 重新构建

源数据变更后，运行：

```bash
python ../tools/build_static.py
```

会重新导出数据、预渲染并输出到本目录。然后 `git commit && git push` 即可自动更新线上站点。
