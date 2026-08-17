#!/usr/bin/env node
/*
 * 构建脚本：把 src/ + data/ + assets/ 打包成单个 dist/index.html
 * 用法：node build.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const b64 = p => fs.readFileSync(path.join(root, p)).toString('base64');

/* ---------- 读数据 ---------- */
const recipes = json('data/recipes.json');
const drinks = json('data/drinks.json');
const eatout = json('data/eatout.json');
const ingObj = json('data/ingredients.json');

/* ingredients.json 是给人看的对象格式，运行时压成数组省体积 */
const JA = {};
for (const [zh, v] of Object.entries(ingObj)) {
  JA[zh] = [v.ja, v.store, v.en, v.cat, v.shelf];
}

/* ---------- 校验：早发现比上线后发现好 ---------- */
const TAGS = '鸡,猪,牛羊,海鲜,蛋,豆制品,素菜,汤,炒菜,炖菜,凉菜,烤箱,汁物,丼物,面食,米饭,快手菜,中餐,日料,西餐,韩餐,东南亚,意餐,聚会菜,下酒菜,便当菜,熟食'.split(',');
const CUISINES = ['中餐', '日料', '西餐', '韩餐', '东南亚', '意餐'];
const problems = [];
const ids = new Set();

for (const r of recipes) {
  const at = `recipes[${r.id}] ${r.name}`;
  if (ids.has(r.id)) problems.push(`${at}：id 重复`);
  ids.add(r.id);
  if (!r.ja) problems.push(`${at}：缺日语名`);
  if (!Array.isArray(r.ings) || !r.ings.length) problems.push(`${at}：没有食材`);
  for (const i of r.ings || []) if (!JA[i]) problems.push(`${at}：食材「${i}」不在 ingredients.json 里`);
  const n = r.nutri || {};
  if (typeof n.kcal !== 'number' || !n.kcal) problems.push(`${at}：缺营养数据`);
  else {
    const calc = n.p * 4 + n.f * 9 + n.c * 4;
    const off = Math.abs(calc - n.kcal) / n.kcal;
    if (off > 0.15) problems.push(`${at}：三大营养素换算对不上 kcal（差 ${Math.round(off * 100)}%）`);
    const expect = n.kcal > 450 ? 'high' : 'light';
    if (r.cal !== expect) problems.push(`${at}：cal 应为 ${expect}`);
  }
  const tags = (r.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  for (const t of tags) if (!TAGS.includes(t)) problems.push(`${at}：未知标签「${t}」`);
  if (!tags.some(t => CUISINES.includes(t))) problems.push(`${at}：没有菜系标签`);
  if (!['meal', 'breakfast'].includes(r.type)) problems.push(`${at}：type 只能是 meal / breakfast`);
  if (!['batch', 'marinate', 'cut', 'fresh'].includes(r.prepType)) problems.push(`${at}：prepType 不合法`);
  if (typeof r.dinner !== 'boolean') problems.push(`${at}：dinner 必须是 true / false`);
}
for (const d of drinks) {
  for (const i of d.ings || []) if (!JA[i] && !['冰块', '热水', '水'].includes(i)) problems.push(`drinks[${d.id}]：食材「${i}」不在 ingredients.json 里`);
}
for (const x of eatout) {
  const at = `eatout[${x.id}] ${x.shop}`;
  for (const k of ['shop', 'shopJa', 'genre', 'name', 'nameJa', 'emoji', 'tip', 'order', 'jp']) {
    if (!x[k]) problems.push(`${at}：缺字段 ${k}`);
  }
  if (typeof x.price !== 'number') problems.push(`${at}：price 必须是数字`);
  const n = x.nutri || {};
  if (!n.kcal) problems.push(`${at}：缺营养数据`);
  else if (Math.abs(n.p * 4 + n.f * 9 + n.c * 4 - n.kcal) / n.kcal > 0.15) problems.push(`${at}：营养换算对不上`);
}

if (problems.length) {
  console.error('\n❌ 数据有问题，构建中止：\n');
  problems.slice(0, 40).forEach(p => console.error('   ' + p));
  if (problems.length > 40) console.error(`   …还有 ${problems.length - 40} 条`);
  console.error('');
  process.exit(1);
}

/* ---------- 图标 & manifest ---------- */
const icon180 = 'data:image/png;base64,' + b64('assets/icon-180.png');
const icon512 = 'data:image/png;base64,' + b64('assets/icon-512.png');
const manifest = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify({
  name: '今天吃什么',
  short_name: '今天吃什么',
  description: '住在日本的中文厨房助手',
  start_url: '.',
  display: 'standalone',
  background_color: '#FBF6EC',
  theme_color: '#FBF6EC',
  icons: [
    { src: icon180, sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
}));

/* ---------- 拼装 ---------- */
const data = `/* ===== 数据层（由 build.js 从 data/*.json 生成，勿手改）===== */
const JA=${JSON.stringify(JA)};
const RECIPES=${JSON.stringify(recipes)};
const DRINKS=${JSON.stringify(drinks)};
const EATOUT=${JSON.stringify(eatout)};
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>今天吃什么</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="今天吃什么">
<meta name="theme-color" content="#FBF6EC">
<meta name="description" content="住在日本的中文厨房助手：一键出今天三餐，冰箱吃干净，买菜清单带日语">
<link rel="manifest" href="${manifest}">
<link rel="apple-touch-icon" href="${icon180}">
<link rel="icon" href="${icon180}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<style>
${read('src/style.css')}
</style>
</head>
<body>
${read('src/body.html')}
<script>
${data}
${read('src/app.js')}
<\/script>
</body>
</html>`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);

console.log('✅ 构建完成  dist/index.html');
console.log(`   ${(html.length / 1024).toFixed(0)} KB　菜谱 ${recipes.length} 道　饮品 ${drinks.length} 款　外食 ${eatout.length} 家　食材 ${Object.keys(JA).length} 条`);
