/* ===================== 今天吃什么 · 日本版 ===================== */
const KEY='jpKitchen_v3';
const $=id=>document.getElementById(id);
const TAG_LIB=['鸡','猪','牛羊','海鲜','蛋','豆制品','素菜','汤','炒菜','炖菜','凉菜','烤箱','汁物','丼物','面食','米饭','快手菜','中餐','日料','西餐','韩餐','东南亚','意餐','聚会菜','下酒菜','便当菜','熟食','外卖'];
const CUISINES=['中餐','日料','西餐','意餐','韩餐','东南亚'];
const SEASON_CATS=['🧂 调料酱汁','🌿 香料香草'];
const PREP_LABEL={batch:'整锅做，分装存',marinate:'提前腌好',cut:'提前切配',fresh:'现做最好'};
const PREP_ICON ={batch:'🍲',marinate:'🧴',cut:'🔪',fresh:'⏱️'};
const PERISH_CATS=['🥬 蔬菜','🍎 水果','🥩 肉蛋海鲜','🥛 乳品甜点'];

/* ---------- 食材表工具 ---------- */
const jaOf   = z => (JA[z]||[])[0] || '';
const storeOf= z => (JA[z]||[])[1] || 'normal';
const catOf  = z => (JA[z]||[])[3] || '📦 其他';
const shelfOf= z => (JA[z]||[])[4] || 14;
const isSeason = z => SEASON_CATS.includes(catOf(z));   // 调料香料：不算进「冰箱里有没有」，也不扣库存
const isStable = z => shelfOf(z)>=180;                   // 放不坏的：冰箱里显示「常备」

/* ---------- 日期 ---------- */
const dkey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const daysBetween=(a,b)=>Math.floor((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5);
function prettyDate(){const d=new Date();return `${d.getMonth()+1}月${d.getDate()}日 ${'日一二三四五六'[d.getDay()]}曜日`}

/* ---------- 状态 ---------- */
const DEFAULT={
  v:3,
  profile:{sex:'f',age:30,h:165,w:55,act:1.5,goal:'keep',diet:'all',avoid:[],city:'',area:''},
  pantry:[], recipes:[], off:[], favOv:{}, drinks:[],
  today:{date:'',breakfast:[],lunch:[],dinner:[],extra:[]},
  history:{}, plan:{}, shop:{}, skipped:[], memo:'',
  mood:{tummy:false,lazy:false,cal:null},
  autoConsume:true, onboarded:false,
  favShops:['麦当劳','滨寿司','松屋']
};
let S=load();
function load(){
  try{
    const d=JSON.parse(localStorage.getItem(KEY));
    if(!d||typeof d!=='object')return structuredClone(DEFAULT);
    const m=structuredClone(DEFAULT);
    Object.keys(m).forEach(k=>{ if(d[k]!==undefined&&d[k]!==null) m[k]=d[k] });
    m.profile=Object.assign(structuredClone(DEFAULT.profile),d.profile||{});
    m.mood=Object.assign(structuredClone(DEFAULT.mood),d.mood||{});
      m.pantry=(m.pantry||[]).map(x=>typeof x==='string'?{n:x,d:dkey(),q:1}:x).filter(x=>x&&x.n);
    return m;
  }catch(e){return structuredClone(DEFAULT)}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('存储空间不足')}}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1900)}

/* ---------- 主食 ---------- */
const STAPLES=[
  {id:'s_rice',  name:'米饭',   ja:'ごはん',        emoji:'🍚',_staple:1,type:'meal',     tags:'米饭',ings:['米饭'],  nutri:{kcal:234,p:4,f:0,c:54}},
  {id:'s_bread', name:'吐司两片',ja:'食パン 2枚',    emoji:'🍞',_staple:1,type:'breakfast',tags:'面食',ings:['吐司'],  nutri:{kcal:316,p:11,f:5,c:57}},
  {id:'s_noodle',name:'一把面条',ja:'うどん・そば 1玉',emoji:'🍜',_staple:1,type:'meal',   tags:'面食',ings:['面条'],  nutri:{kcal:250,p:8,f:2,c:52}},
  {id:'s_rice2', name:'米饭 大碗',ja:'ごはん 大盛り', emoji:'🍚',_staple:1,type:'meal',    tags:'米饭',ings:['米饭'],  nutri:{kcal:350,p:6,f:1,c:80}}
];
const STAPLE_ING=['米饭','吐司','面条','意面','乌冬面','荞麦面','素面','细面','河粉','法棍','面包','麦片','年糕','饺子','包子','馒头','千层面皮','手抓饼皮','面粉','大饼'];
function hasStaple(r){
  if(r._staple)return true;
  if(/丼|饭|面|吐司|三明治|汉堡|咖喱|包|饺|饼|粥|寿司|意大利|拌饭|炒粉/.test(r.name||''))return true;
  return (r.ings||[]).some(i=>STAPLE_ING.some(s=>i.includes(s)));
}

/* ---------- 🍜 外食：包装成和菜谱一样的形状 ---------- */
const EATOUT_R=EATOUT.map(x=>({
  id:x.id, _eatout:1, name:`${x.shop} · ${x.name}`, ja:`${x.shopJa}　${x.nameJa}`,
  emoji:x.emoji, type:'meal', tags:x.genre, spicy:'gentle',
  cal:x.nutri.kcal>450?'high':'light', keep:false, fav:false, serving:1,
  dinner:x.nutri.p>=18, ings:[], nutri:x.nutri, steps:'', note:x.tip,
  prepType:'fresh', prep:'', shop:x.shop, shopJa:x.shopJa, genre:x.genre,
  price:x.price, healthy:x.healthy, order:x.order, jp:x.jp, tip:x.tip
}));
const EATOUT_GENRES=[...new Set(EATOUT.map(x=>x.genre))];

/* ---------- 菜谱合集：预置 + 用户 ---------- */
function allRecipes(){
  const off=new Set(S.off||[]);
  const mine=new Map((S.recipes||[]).map(r=>[r.id,r]));
  const out=[];
  RECIPES.forEach(r=>{ if(off.has(r.id))return; out.push(mine.has(r.id)?mine.get(r.id):r) });
  (S.recipes||[]).forEach(r=>{ if(!RECIPES.some(x=>x.id===r.id)) out.push(r) });
  return out.map(r=>S.favOv[r.id]!==undefined?Object.assign({},r,{fav:S.favOv[r.id]}):r);
}
function allDrinks(){
  const mine=new Map((S.drinks||[]).map(d=>[d.id,d]));
  const out=DRINKS.map(d=>mine.get(d.id)||d);
  (S.drinks||[]).forEach(d=>{if(!DRINKS.some(x=>x.id===d.id))out.push(d)});
  return out;
}
const byId=id=>STAPLES.find(s=>s.id===id)||EATOUT_R.find(e=>e.id===id)
  ||allRecipes().find(r=>r.id===id)||allDrinks().find(d=>d.id===id);
const isDrink=id=>allDrinks().some(d=>d.id===id);

/* ---------- 营养目标 ---------- */
function targets(){
  const p=S.profile, w=+p.w||55, h=+p.h||165, a=+p.age||30;
  const bmr = p.sex==='m' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
  const tdee = bmr*(+p.act||1.5);
  const mult = p.goal==='cut'?0.82 : p.goal==='gain'?1.12 : 1;
  const kcal = Math.round(tdee*mult/10)*10;
  const prot = Math.round((p.goal==='keep'?1.5:1.8)*w);
  const fat  = Math.round(kcal*0.32/9);
  const carb = Math.max(0,Math.round((kcal-prot*4-fat*9)/4));
  return {kcal,p:prot,f:fat,c:carb,tdee:Math.round(tdee),bmr:Math.round(bmr)};
}
function nutriOf(id,x){
  const r=byId(id); const n=(r&&r.nutri)||{kcal:0,p:0,f:0,c:0}; const k=x||1;
  return {kcal:(n.kcal||0)*k,p:(n.p||0)*k,f:(n.f||0)*k,c:(n.c||0)*k};
}
function slotNutri(key){
  return (S.today[key]||[]).reduce((s,it)=>{
    const n=nutriOf(it.id,it.x); s.kcal+=n.kcal;s.p+=n.p;s.f+=n.f;s.c+=n.c; return s;
  },{kcal:0,p:0,f:0,c:0});
}
function dayNutri(){
  return ['breakfast','lunch','dinner','extra'].reduce((s,k)=>{
    const n=slotNutri(k); s.kcal+=n.kcal;s.p+=n.p;s.f+=n.f;s.c+=n.c; return s;
  },{kcal:0,p:0,f:0,c:0});
}

/* ---------- 库存匹配 ---------- */
const EXACT_ONLY=['油','盐','醋','糖','面','茶','酒','蒜','葱','姜','水','米'];
function looseSame(a,b){
  a=String(a||'').trim(); b=String(b||'').trim();
  if(!a||!b)return false;
  if(a===b)return true;
  if(EXACT_ONLY.includes(a)||EXACT_ONLY.includes(b))return false;
  return a.length>=2&&b.length>=2&&(a.includes(b)||b.includes(a));
}
const pantryNames=()=>S.pantry.map(x=>x.n);
const inPantry=z=>S.pantry.some(x=>looseSame(x.n,z));
function pantryEntry(z){return S.pantry.find(x=>looseSame(x.n,z))}
function daysLeft(item){
  const used=daysBetween(item.d||dkey(),dkey());
  return shelfOf(item.n)-used;
}
const expiring = ()=>S.pantry.filter(x=>!isStable(x.n)&&daysLeft(x)<=2).sort((a,b)=>daysLeft(a)-daysLeft(b));

/* ---------- 过滤 ---------- */
const MEAT_TAGS={nored:['猪','牛羊'],fish:['猪','牛羊','鸡'],veg:['猪','牛羊','鸡','海鲜']};
function dietOK(r){
  const p=S.profile, av=p.avoid||[];
  if(av.length&&av.some(a=>a&&((r.name||'').includes(a)||(r.ings||[]).some(i=>i.includes(a)))))return false;
  const d=p.diet||'all'; if(d==='all')return true;
  if(r._eatout){   // 外食没有食材表，扫菜名和点单内容
    const txt=(r.name||'')+(r.order||'')+(r.ja||'');
    const beef=['牛','ビーフ','ステーキ','焼肉','丼','ハラミ','カルビ','タン'],
          pork=['豚','猪','とんかつ','排骨','里脊','餃子','ハム','ベーコン','ソーセージ','チャーシュー','豚汁'],
          chick=['鶏','鸡','チキン','唐揚','焼き鳥','親子','ささみ','手羽','カツ'],
          fish=['魚','鱼','鮭','鯖','鲭','鰤','鮪','鰻','鰹','寿司','刺身','天ぷら','うなぎ','海鲜','虾','えび','エビ','貝','ツナ','サーモン','マグロ','さば','しらす','だし'];
    if(d==='veg'&&[...beef,...pork,...chick,...fish,'肉','ラーメン','串','天婦羅'].some(k=>txt.includes(k)))return false;
    if(d==='fish'&&[...beef,...pork,...chick].some(k=>txt.includes(k)))return false;
    if(d==='nored'&&[...beef,...pork].some(k=>txt.includes(k)))return false;
    return true;
  }
  const bad=MEAT_TAGS[d]||[]; const tags=(r.tags||'').split(',').map(x=>x.trim());
  if(tags.some(t=>bad.includes(t)))return false;
  const meat=['鸡','猪','牛','羊','虾','鱼','肉','火腿','培根','香肠','排骨','鳕鱼','三文鱼','金枪鱼','鸭','贝','蛤','蟹'];
  const land=['鸡','猪','牛','羊','火腿','培根','香肠','排骨','鸭','肉末','绞肉'];
  const ings=(r.ings||[]).join('');
  if(d==='veg'&&meat.some(k=>ings.includes(k)))return false;
  if(d==='fish'&&land.some(k=>ings.includes(k)))return false;
  if(d==='nored'&&['猪','牛','羊','培根','火腿','香肠','排骨'].some(k=>ings.includes(k)))return false;
  return true;
}
function isLazy(r){
  if((r.tags||'').includes('熟食')||(r.tags||'').includes('外卖'))return true;
  if(['炸','焗','千层','红烧','炖'].some(k=>(r.name||'').includes(k)))return false;
  return (r.ings||[]).length<=6&&(r.tags||'').includes('快手菜');
}
function moodOK(r){
  if(!dietOK(r))return false;
  if(S.mood.tummy&&r.spicy!=='gentle')return false;
  if(S.mood.lazy&&!isLazy(r))return false;
  if(S.mood.cal&&(r.cal||'light')!==S.mood.cal)return false;
  return true;
}

/* ---------- 排菜 ---------- */
const KEYING=['茄子','土豆','鸡','猪','牛','羊','排骨','面','米饭','鳕鱼','鲑鱼','虾','蛋','豆腐','咖喱'];
function mainKey(r){
  const h=KEYING.find(k=>(r.name||'').includes(k)); if(h)return h;
  const i=KEYING.find(k=>(r.ings||[]).some(x=>x.includes(k)));
  return i||r.id;
}
function recentIds(days){
  const out=new Set(); const now=new Date();
  for(let i=1;i<=days;i++){
    const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);
    const h=S.history[dkey(d)]; if(!h)continue;
    ['breakfast','lunch','dinner'].forEach(k=>(h[k]||[]).forEach(it=>out.add(it.id)));
  }
  return out;
}
function score(r,exp){
  let s=Math.random()*2.2;
  const ings=r.ings||[];
  let have=0,miss=0,hot=0;
  ings.forEach(i=>{
    if(isSeason(i)){ if(!inPantry(i))miss+=0.25; return }
    if(exp.some(e=>looseSame(e.n,i))){hot++;have++}
    else if(inPantry(i))have++;
    else miss++;
  });
  s += hot*3.2 + have*1.1 - miss*0.95;
  if(r.fav)s+=1.6;
  return s;
}
// 能撑起一顿的主菜：有肉蛋奶鱼豆制品
const PROT_TAGS=['鸡','猪','牛羊','海鲜','蛋','豆制品'];
function isMain(r){
  if(r.dinner===true)return true;
  if(r._staple||r.type==='breakfast')return false;
  const tags=(r.tags||'').split(',').map(x=>x.trim());
  return PROT_TAGS.some(t=>tags.includes(t))&&((r.nutri&&r.nutri.p)||0)>=15;
}
function homeReady(r){        // 主料全在冰箱里（调料另算）
  const core=(r.ings||[]).filter(i=>!isSeason(i));
  return core.length&&core.every(inPantry);
}
function gen(mode){          // mode: 'all' | 'fav' | 'home'
  const exp=expiring();
  const recent=recentIds(3);
  let pool=allRecipes().filter(r=>moodOK(r));
  if(mode==='fav')pool=pool.filter(r=>r.fav);
  if(mode==='home'){
    let h=pool.filter(homeReady);
    if(h.length<3)h=allRecipes().filter(r=>dietOK(r)).filter(homeReady);
    if(h.length<2){toast('冰箱里的主料还不够排一天，先去买点 🛒');return}
    pool=h;
  }
  else if(pool.length<6)pool=allRecipes().filter(r=>dietOK(r));
  const fresh=pool.filter(r=>!recent.has(r.id));
  const usable=fresh.length>=6?fresh:pool;
  const T=targets();
  const bfPool=usable.filter(r=>r.type==='breakfast');
  const mlPool=usable.filter(r=>r.type!=='breakfast');
  const PROT_MIN=Math.max(20,Math.round(T.p*0.28));
  const used=new Set();
  // 从高分候选里带权随机 —— 保证优先用冰箱，但每天不重样
  const drawFrom=list=>{
    if(!list.length)return null;
    const lo=list[list.length-1].s;
    const w=list.map(x=>Math.pow(x.s-lo+0.6,2.2));
    const tot=w.reduce((a,b)=>a+b,0);
    let t=Math.random()*tot;
    for(let i=0;i<list.length;i++){ t-=w[i]; if(t<=0)return i }
    return list.length-1;
  };
  const pick=(arr,budget,maxN,needMain)=>{
    if(!arr.length)return [];
    const out=[]; let got=0, staple=false, prot=0;
    const takeFrom=list=>{
      let rank=list.filter(r=>!used.has(mainKey(r))&&!out.some(o=>o.id===r.id))
                   .map(r=>({r,s:score(r,exp)})).sort((a,b)=>b.s-a.s).slice(0,16);
      const i=drawFrom(rank); if(i==null)return false;
      const r=rank[i].r;
      out.push({id:r.id,x:1,eaten:false}); used.add(mainKey(r));
      staple=staple||hasStaple(r);
      got+=(r.nutri&&r.nutri.kcal)||400; prot+=(r.nutri&&r.nutri.p)||0;
      return true;
    };
    // 正餐先锁一道有肉蛋奶鱼豆的主菜 —— 不许出现「拌黄瓜 + 菠菜汤」
    const mains=arr.filter(isMain);
    if(needMain&&mains.length)takeFrom(mains);
    while(out.length<maxN){
      if(got+(staple?0:240)>=budget*0.92)break;
      if(!takeFrom(arr))break;
    }
    // 兜底：蛋白质还是不够，再加一道主菜
    if(needMain&&prot<PROT_MIN&&mains.length&&out.length<=maxN)takeFrom(mains);
    // 没有主食就配一份饭 / 面包
    if(out.length&&!staple){
      const s=(byId(out[0].id)||{}).type==='breakfast'?'s_bread':'s_rice';
      out.unshift({id:s,x:1,eaten:false});
    }
    return out;
  };
  const res={date:dkey(),breakfast:[],lunch:[],dinner:[],extra:[]};
  res.breakfast=pick(bfPool.length?bfPool:mlPool, T.kcal*0.25, 1, false);
  res.lunch    =pick(mlPool, T.kcal*0.375, 2, true);
  res.dinner   =pick(mlPool, T.kcal*0.375, 2, true);
  S.today=res; rebuildShop(); save(); renderAll();
  genNote(exp,mode);
}
function genNote(exp,mode){
  const box=$('genNote');
  const ids=['breakfast','lunch','dinner'].flatMap(k=>(S.today[k]||[]).map(i=>i.id));
  if(!ids.length){box.classList.add('hide');return}
  const names=ids.map(i=>byId(i)).filter(r=>r&&!r._staple).map(r=>r.name);
  const usedExp=exp.filter(e=>ids.some(i=>((byId(i)||{}).ings||[]).some(x=>looseSame(x,e.n))));
  const miss=Object.keys(S.shop).length;
  const d=dayNutri(),T=targets();
  let h=`${mode==='home'?'主料全在冰箱里：':mode==='fav'?'都是你常做的：':''}<b>${names.join('、')}</b>。`;
  if(usedExp.length)h+=`顺手用掉了快过期的 <b>${usedExp.map(e=>e.n).join('、')}</b> 👍 `;
  h+=`合计约 <b>${Math.round(d.kcal)}</b> kcal，占今天目标 <b>${Math.round(d.kcal/T.kcal*100)}%</b>；`;
  h+= miss? (mode==='home'?`只差 <b>${miss}</b> 样调料小件，看清单 🧂`:`还差 <b>${miss}</b> 样要买，已丢进清单 🛒`)
          : `家里料全齐，直接开火 🍳`;
  box.innerHTML=h; box.classList.remove('hide');
}

/* ---------- 购物清单 ---------- */
function rebuildShop(){
  const old=S.shop||{}; const next={}; const need={};
  ['breakfast','lunch','dinner','extra'].forEach(k=>(S.today[k]||[]).forEach(it=>{
    const r=byId(it.id); if(!r||r._staple||r._eatout)return;
    (r.ings||[]).forEach(i=>{ if(!inPantry(i)&&i!=='冰块'&&i!=='热水'&&i!=='水')need[i]=Math.max(need[i]||1,it.x||1) });
  }));
  (S.skipped||[]).forEach(z=>delete need[z]);
  Object.entries(need).forEach(([zh,q])=>{
    const k='k_'+zh;
    next[k]={zh,ja:jaOf(zh),store:storeOf(zh),qty:q>1?'×'+q:'',done:old[k]?old[k].done:false,extra:false};
  });
  Object.entries(old).forEach(([k,v])=>{ if(v.extra&&!next[k])next[k]=v });
  S.shop=next;
}

/* ---------- 渲染：今天 ---------- */
const SLOTS=[{k:'breakfast',icn:'🌅',lbl:'早餐',r:.25},{k:'lunch',icn:'🍚',lbl:'午餐',r:.375},
             {k:'dinner',icn:'🌙',lbl:'晚餐',r:.375},{k:'extra',icn:'🍮',lbl:'加餐 / 饮品',r:0}];
function ensureToday(){
  const t=dkey();
  if(S.today.date!==t){
    if(S.today.date&&['breakfast','lunch','dinner','extra'].some(k=>(S.today[k]||[]).length))
      S.history[S.today.date]=structuredClone(S.today);
    S.today={date:t,breakfast:[],lunch:[],dinner:[],extra:[]};
    const keys=Object.keys(S.history).sort(); while(keys.length>60)delete S.history[keys.shift()];
    save();
  }
  // 备菜排期：到日子了自动把晚餐填好
  const pl=(S.plan||{})[t];
  if(pl&&pl.length&&!(S.today.dinner||[]).length){
    S.today.dinner=pl.map(x=>({id:x.id,x:x.x||1,eaten:false,prepped:true}));
    rebuildShop(); save();
  }
  Object.keys(S.plan||{}).forEach(k=>{ if(daysBetween(k,t)>2)delete S.plan[k] });
}
function renderNutri(){
  const T=targets(), d=dayNutri();
  const pct=T.kcal?Math.min(999,Math.round(d.kcal/T.kcal*100)):0;
  const C=2*Math.PI*40;
  $('ringArc').setAttribute('stroke-dasharray',C);
  $('ringArc').setAttribute('stroke-dashoffset',C*(1-Math.min(1,pct/100)));
  $('ringArc').setAttribute('stroke',pct>110?'var(--tomato)':pct>=80?'var(--leaf)':'var(--sun)');
  $('ringPct').textContent=pct+'%';
  $('ringKcal').textContent=Math.round(d.kcal)+' / '+T.kcal;
  [['p','蛋白质'],['f','脂肪'],['c','碳水']].forEach(([k])=>{
    const v=Math.round(d[k]), t=T[k];
    $(k+'Txt').textContent=v+' / '+t+' g';
    const bar=$(k+'Bar'); bar.style.width=Math.min(100,t?v/t*100:0)+'%';
    bar.classList.toggle('over',t&&v>t*1.2);
  });
  const left=T.kcal-d.kcal;
  let msg;
  if(!d.kcal) msg='还没排菜。点上面的 🎲，一秒出今天';
  else if(left>120) msg=`还差 <b>${Math.round(left)}</b> kcal 到目标，蛋白质还缺 <b>${Math.max(0,Math.round(T.p-d.p))}</b> g`;
  else if(left<-150) msg=`比目标多了 <b>${Math.round(-left)}</b> kcal —— 少一道，或者明天走两步 🚶`;
  else msg=`刚刚好 ✓ 蛋白质 <b>${Math.round(d.p/T.p*100)}%</b>、脂肪 <b>${Math.round(d.f/T.f*100)}%</b>`;
  $('nutriFootTxt').innerHTML=msg;
}
function dishRowHTML(it,slotKey){
  const r=byId(it.id); if(!r)return '';
  const n=nutriOf(it.id,it.x);
  const miss=(r._staple||r._eatout)?[]:(r.ings||[]).filter(i=>!inPantry(i));
  return `<div class="dish-row ${it.eaten?'eaten':''}">
    <span class="em">${r.emoji||'🍲'}</span>
    <div class="info">
      <div class="nm">${r.name}${it.x>1?` ×${it.x}`:''}</div>
      ${r.ja?`<div class="ja">${r.ja}</div>`:''}
      <div class="mi">${r._eatout?`¥${r.price}　${r.order||''}`:(r.ings||[]).join('、')}</div>
      <div class="tagline">
        <span class="mini g">${Math.round(n.kcal)} kcal</span>
        <span class="mini">蛋白 ${Math.round(n.p)}g</span>
        <span class="mini">脂肪 ${Math.round(n.f)}g</span>
        ${r._eatout?'<span class="mini b">🍜 在外面吃</span>'
          :miss.length?`<span class="mini r">差 ${miss.length} 样</span>`:'<span class="mini g">料齐了</span>'}
        ${it.prepped?'<span class="mini b">🍱 周末备好的，热一下</span>':r.keep?'<span class="mini b">🍱 能吃两顿</span>':''}
      </div>
    </div>
    <div class="ops">
      <button data-eat="${it.id}" data-slot="${slotKey}" title="做好了">${it.eaten?'↩️':'✅'}</button>
      <button data-detail="${it.id}">📖</button>
      <button data-rm="${it.id}" data-slot="${slotKey}">✕</button>
    </div></div>`;
}
function renderToday(){
  ensureToday();
  $('dateTitle').textContent='今天';
  $('dateSub').textContent=prettyDate();
  const T=targets();
  $('mealSlots').innerHTML=SLOTS.map(s=>{
    const items=S.today[s.k]||[]; const n=slotNutri(s.k);
    const budget=s.r?Math.round(T.kcal*s.r):0;
    const thin=s.k!=='breakfast'&&s.k!=='extra'&&items.length&&n.p<Math.max(20,T.p*0.28);
    return `<div class="slot">
      <div class="slot-head"><span class="icn">${s.icn}</span><span class="lbl">${s.lbl}</span>
        <span class="kc">${Math.round(n.kcal)}${budget?' / '+budget:''} kcal · 蛋白 ${Math.round(n.p)}g</span></div>
      ${thin?'<div class="thin-warn">⚠️ 这顿蛋白质偏低，加一道有肉蛋奶鱼豆的主菜更扛饿</div>':''}
      ${items.map(it=>dishRowHTML(it,s.k)).join('')}
      <div class="row-btns">
        <button class="slot-add" data-open="${s.k}">＋ ${items.length?'再加一道':'挑一道'}</button>
        ${s.k==='extra'?'':`<button class="slot-add" data-staple="${s.k}" style="flex:0 0 96px">🍚 加主食</button>`}
      </div>
    </div>`;
  }).join('');
  renderNutri(); renderReco();
}
function renderReco(){
  const wrap=$('recoWrap'), row=$('recoRow');
  const inToday=new Set(['breakfast','lunch','dinner','extra'].flatMap(k=>(S.today[k]||[]).map(i=>i.id)));
  const exp=expiring();
  const hits=allRecipes().filter(r=>!inToday.has(r.id)&&moodOK(r)&&(r.ings||[]).length)
    .map(r=>{
      const core=(r.ings||[]).filter(i=>!isSeason(i));
      const have=core.filter(inPantry);
      const hot=core.filter(i=>exp.some(e=>looseSame(e.n,i)));
      return {r,have,hot,missN:core.length-have.length};
    })
    .filter(x=>x.have.length)
    .sort((a,b)=> b.hot.length-a.hot.length || a.missN-b.missN || b.have.length-a.have.length)
    .slice(0,14);
  if(!hits.length){wrap.classList.add('hide');return}
  wrap.classList.remove('hide');
  row.innerHTML=hits.map(({r,have,hot,missN})=>
    `<button class="reco-pill ${missN===0?'ready':''}" data-reco="${r.id}">
      <span class="em">${r.emoji||'🍲'}</span>
      <span class="nm">${r.name}<small>${hot.length?'⏰ 用掉 '+hot.map(h=>h).join('、'):missN===0?'料全齐':'用 '+have.slice(0,2).join('、')+'，差 '+missN+' 样'}</small></span>
    </button>`).join('');
}

/* ---------- 渲染：冰箱 ---------- */
function renderFridge(){
  const list=$('fridgeList');
  $('fridgeCount').textContent=S.pantry.length?S.pantry.length+' 样':'';
  $('autoConsume').checked=!!S.autoConsume;
  const exp=expiring();
  const al=$('expireAlert');
  if(exp.length){
    al.classList.remove('hide');
    al.innerHTML=`⏰ <b>${exp.map(e=>e.n).join('、')}</b> 该吃了${exp.some(e=>daysLeft(e)<0)?'（有的已经过期）':''}。<br>
      <span class="muted">下面「冰箱里能做」和一键排菜都会优先用它们。</span>`;
  } else al.classList.add('hide');
  if(!S.pantry.length){
    list.innerHTML='<div class="empty"><span class="big">🧊</span>冰箱是空的<br>拍张小票，或者手动加几样</div>';return;
  }
  const groups={};
  S.pantry.forEach((x,i)=>{const c=catOf(x.n);(groups[c]=groups[c]||[]).push({x,i})});
  const order=['🥩 肉蛋海鲜','🥬 蔬菜','🍎 水果','🥛 乳品甜点','🍚 主食干货','🏪 现成即食','🍳 早餐常备','🧂 调料酱汁','🌿 香料香草','☕ 茶饮','🧴 日用品','📦 其他'];
  list.innerHTML=order.filter(c=>groups[c]).map(c=>{
    const arr=groups[c].sort((a,b)=>daysLeft(a.x)-daysLeft(b.x));
    return `<div class="grp-head"><b>${c}</b><span>${arr.length}</span></div>`+
      arr.map(({x,i})=>{
        const season=isStable(x.n); const dl=daysLeft(x);
        const cls=season?'':dl<0?'bad':dl<=2?'warn':'';
        const color=season?'var(--line)':dl<0?'var(--tomato)':dl<=2?'var(--sun)':'var(--leaf)';
        const age=season?'常备':dl<0?`过期 ${-dl} 天`:dl===0?'今天吃':`还剩 ${dl} 天`;
        return `<div class="fridge-item ${cls}">
          <span class="dot" style="background:${color}"></span>
          <span class="nm">${x.n}${x.q>1?` ×${x.q}`:''}<small>${jaOf(x.n)}</small></span>
          <span class="age">${age}</span>
          <button class="x" data-rmp="${i}">✕</button></div>`;
      }).join('');
  }).join('');
}

/* ---------- 渲染：菜谱库 ---------- */
let bookMain='all', bookTag=null, bookQ='';
function renderBook(){
  const mainRow=$('bookMain'), tagRow=$('bookTags'), list=$('bookList');
  const mains=[['all','全部'],['fav','⭐ 常做'],['ready','✅ 现在能做'],['keep','🍱 能吃两顿'],
               ['dinner','🍖 晚餐主菜'],['eatout','🍜 外食'],['breakfast','早餐'],['drink','饮品甜点']];
  mainRow.innerHTML=mains.map(([v,l])=>`<button class="chip leaf ${bookMain===v?'on':''}" data-bm="${v}">${l}</button>`).join('');
  let pool = bookMain==='drink' ? allDrinks().map(d=>Object.assign({},d,{_drink:true,tags:'饮品'}))
           : bookMain==='eatout' ? EATOUT_R : allRecipes();
  if(bookMain==='fav')pool=pool.filter(r=>r.fav);
  if(bookMain==='keep')pool=pool.filter(r=>r.keep);
  if(bookMain==='dinner')pool=pool.filter(isMain);
  if(bookMain==='breakfast')pool=pool.filter(r=>r.type==='breakfast');
  if(bookMain==='ready')pool=pool.filter(r=>(r.ings||[]).length&&(r.ings||[]).every(i=>isSeason(i)||inPantry(i)));
  const used=new Set(); pool.forEach(r=>(r.tags||'').split(',').forEach(t=>{t=t.trim();if(t)used.add(t)}));
  const order=CUISINES.filter(t=>used.has(t)).concat(TAG_LIB.filter(t=>used.has(t)&&!CUISINES.includes(t)));
  tagRow.innerHTML=order.map(t=>`<button class="chip ${bookTag===t?'on':''}" data-bt="${t}">${t}</button>`).join('');
  if(bookTag)pool=pool.filter(r=>(r.tags||'').split(',').map(x=>x.trim()).includes(bookTag));
  if(bookQ){const q=bookQ.toLowerCase();
    pool=pool.filter(r=>(r.name+(r.ja||'')+(r.en||'')+(r.ings||[]).join('')).toLowerCase().includes(q));}
  $('bookCount').textContent=pool.length+' 道';
  if(!pool.length){list.innerHTML='<div class="empty"><span class="big">🔍</span>没找到<br>换个词，或点右上角 ＋ 自己加一道</div>';return}
  list.innerHTML=pool.map(r=>{
    const core=(r.ings||[]).filter(i=>!isSeason(i));
    const ready=!r._eatout&&core.length&&core.every(inPantry);
    const n=r.nutri||{};
    return `<div class="rc ${ready||(r._eatout&&r.healthy)?'ready':''}">
      <span class="em">${r.emoji||'🍲'}</span>
      <div class="body">
        <div class="t">${r.name}</div>
        ${r.ja?`<div class="ja">${r.ja}</div>`:''}
        <div class="ing">${r._eatout?'¥'+r.price+'　'+(r.order||''):(r.ings||[]).join('、')}</div>
        ${n.kcal?`<div class="kcal"><b>${n.kcal}</b> kcal · 蛋白 ${n.p}g · 脂肪 ${n.f}g · 碳水 ${n.c}g</div>`:''}
        ${r._eatout?`<div class="eo-tip" style="margin-top:5px">💡 ${r.tip}</div>`:''}
        ${!r._eatout&&(r.keep||r.prepType)?`<div class="tagline" style="margin-top:5px">
          ${r.keep?'<span class="mini b">🍱 能吃两顿</span>':''}
          ${r.prepType&&r.prepType!=='fresh'?`<span class="mini">${PREP_ICON[r.prepType]} ${PREP_LABEL[r.prepType]}</span>`:''}</div>`:''}
      </div>
      <div class="ops">
        ${r._drink?'':`<button class="star" data-fav="${r.id}">${r.fav?'⭐':'☆'}</button>`}
        <button data-detail="${r.id}">📖</button>
        <button data-plan="${r.id}">＋</button>
      </div>
      ${r._eatout?(r.healthy?'<span class="ready-tag">💪 高蛋白</span>':''):ready?'<span class="ready-tag">现在就能做</span>':''}
    </div>`;
  }).join('');
}

/* ---------- 渲染：清单 ---------- */
function renderShop(){
  const box=$('shopList');
  const items=Object.entries(S.shop||{});
  if(!items.length){box.innerHTML='<div class="empty"><span class="big">🛒</span>清单是空的<br>去「今天」排几道菜</div>';updateBadge();return}
  const grp={normal:[],chinese:[]};
  items.forEach(([k,v])=>grp[v.store==='chinese'?'chinese':'normal'].push([k,v]));
  const lbl={normal:['🏪 普通超市','西友・イオン・OK・まいばすけっと'],chinese:['🥢 中华食材店 / 業務スーパー','这几样普通超市不一定有']};
  box.innerHTML=['normal','chinese'].filter(g=>grp[g].length).map(g=>
    `<div class="grp-head"><b>${lbl[g][0]}</b><span>${lbl[g][1]}</span></div>`+
    grp[g].map(([k,v])=>`<div class="shop-item ${v.done?'done':''}">
      <span class="box" data-buy="${k}"></span>
      <span class="nm" data-buy="${k}">${v.zh}${v.qty?` <span class="qty">${v.qty}</span>`:''}
        ${v.ja?`<i>${v.ja}</i>`:''}</span>
      <button class="x" data-skip="${k}">✕</button></div>`).join('')
  ).join('');
  updateBadge();
}
function updateBadge(){
  const n=Object.values(S.shop||{}).filter(v=>!v.done).length;
  $('shopBadge').textContent=n||'';
}

function renderAll(){renderToday();renderPlan();renderFridge();renderBook();renderShop();syncMood()}

/* ---------- 心情 ---------- */
function syncMood(){
  document.querySelectorAll('#moodRow .mood').forEach(b=>{
    const m=b.dataset.mood;
    b.classList.toggle('on', m==='tummy'?S.mood.tummy : m==='lazy'?S.mood.lazy : S.mood.cal===m);
  });
}
$('moodRow').addEventListener('click',e=>{
  const b=e.target.closest('.mood'); if(!b)return;
  const m=b.dataset.mood;
  if(m==='tummy')S.mood.tummy=!S.mood.tummy;
  else if(m==='lazy')S.mood.lazy=!S.mood.lazy;
  else S.mood.cal=S.mood.cal===m?null:m;
  save(); syncMood(); renderReco(); renderBook();
});

/* ---------- tabs ---------- */
document.querySelector('nav.tabs').addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]'); if(!b)return;
  document.querySelectorAll('nav.tabs button').forEach(x=>x.classList.toggle('on',x===b));
  ['today','fridge','book','shop'].forEach(t=>$('tab-'+t).classList.toggle('hide',t!==b.dataset.tab));
  window.scrollTo(0,0);
});

/* ---------- 今天页事件 ---------- */
$('genBtn').addEventListener('click',()=>gen('all'));
$('genFavBtn').addEventListener('click',()=>gen('fav'));
$('genHomeBtn').addEventListener('click',()=>gen('home'));
$('clearDay').addEventListener('click',()=>{
  S.today={date:dkey(),breakfast:[],lunch:[],dinner:[],extra:[]};
  rebuildShop();save();renderAll();$('genNote').classList.add('hide');toast('清空了');
});
$('tab-today').addEventListener('click',e=>{
  const eat=e.target.closest('[data-eat]');
  if(eat){ toggleEaten(eat.dataset.slot,eat.dataset.eat); return }
  const rm=e.target.closest('[data-rm]');
  if(rm){ const k=rm.dataset.slot;
    S.today[k]=(S.today[k]||[]).filter(i=>i.id!==rm.dataset.rm);
    rebuildShop();save();renderAll();return }
  const dt=e.target.closest('[data-detail]'); if(dt){openDetail(dt.dataset.detail);return}
  const sp=e.target.closest('[data-staple]');
  if(sp){ const k=sp.dataset.staple;
    addToSlot(k, k==='breakfast'?'s_bread':'s_rice'); return }
  const op=e.target.closest('[data-open]'); if(op){openPick(op.dataset.open);return}
  const rc=e.target.closest('[data-reco]');
  if(rc){ const r=byId(rc.dataset.reco); if(!r)return;
    const slot=r.type==='breakfast'?'breakfast':(S.today.lunch||[]).length?'dinner':'lunch';
    addToSlot(slot,r.id); toast(`${r.name} 排进${slot==='breakfast'?'早餐':slot==='lunch'?'午餐':'晚餐'}了`); }
});
function addToSlot(slot,id){
  S.today[slot]=S.today[slot]||[];
  if(S.today[slot].some(i=>i.id===id)){toast('已经在里面了');return}
  S.today[slot].push({id,x:1,eaten:false});
  rebuildShop();save();renderAll();
}
function toggleEaten(slot,id){
  const it=(S.today[slot]||[]).find(i=>i.id===id); if(!it)return;
  it.eaten=!it.eaten;
  if(it.eaten&&S.autoConsume){
    const r=byId(id); let n=0;
    (r._eatout?[]:(r.ings||[])).forEach(i=>{
      if(isSeason(i))return;
      const e=pantryEntry(i); if(!e)return;
      e.q=(e.q||1)-1; if(e.q<=0)S.pantry=S.pantry.filter(x=>x!==e);
      n++;
    });
    if(n)toast(`做好了！从冰箱扣掉 ${n} 样`); else toast('做好了 🍽️');
  } else if(it.eaten) toast('做好了 🍽️');
  rebuildShop();save();renderAll();
}

/* ---------- 选菜弹层 ---------- */
let pickSlot=null,pickTag=null,pickQ='';
function openPick(slot){
  pickSlot=slot;pickTag=null;pickQ='';$('pickSearch').value='';
  $('pickTitle').textContent={breakfast:'挑个早餐',lunch:'挑个午餐',dinner:'挑个晚餐',extra:'挑个加餐'}[slot]||'选菜';
  renderPick(); $('pickSheet').classList.add('show');
}
function renderPick(){
  let pool = pickSlot==='extra' ? allDrinks().map(d=>Object.assign({},d,{tags:'饮品',type:'extra'}))
           : STAPLES.filter(s=>pickSlot==='breakfast'?true:s.id!=='s_bread')
             .concat(allRecipes().filter(r=>pickSlot==='breakfast'?r.type==='breakfast':r.type!=='breakfast').filter(dietOK));
  const used=new Set(); pool.forEach(r=>(r.tags||'').split(',').forEach(t=>{t=t.trim();if(t)used.add(t)}));
  const order=CUISINES.filter(t=>used.has(t)).concat(TAG_LIB.filter(t=>used.has(t)&&!CUISINES.includes(t)));
  $('pickTags').innerHTML=order.map(t=>`<button class="chip ${pickTag===t?'on':''}" data-ptag="${t}">${t}</button>`).join('');
  if(pickTag)pool=pool.filter(r=>(r.tags||'').split(',').map(x=>x.trim()).includes(pickTag));
  if(pickQ){const q=pickQ.toLowerCase();pool=pool.filter(r=>(r.name+(r.ja||'')+(r.ings||[]).join('')).toLowerCase().includes(q))}
  const inSlot=new Set((S.today[pickSlot]||[]).map(i=>i.id));
  const rank=r=>{ if(r._staple)return -99;
    const core=(r.ings||[]).filter(i=>!isSeason(i));
    const have=core.filter(inPantry).length; return -(have*2+(r.fav?1:0)-(core.length-have)*0.5)};
  pool=pool.slice().sort((a,b)=>rank(a)-rank(b)).slice(0,80);
  $('pickList').innerHTML=pool.map(r=>{
    const core=(r.ings||[]).filter(i=>!isSeason(i));
    const ready=r._staple||(core.length&&core.every(inPantry));
    const n=r.nutri||{};
    return `<div class="rc ${ready?'ready':''}">
      <span class="em">${r.emoji||'🍲'}</span>
      <div class="body"><div class="t">${r.name}${inSlot.has(r.id)?' ✓':''}</div>
        ${r.ja?`<div class="ja">${r.ja}</div>`:''}
        <div class="ing">${(r.ings||[]).join('、')}</div>
        ${n.kcal?`<div class="kcal"><b>${n.kcal}</b> kcal · 蛋白 ${n.p}g</div>`:''}</div>
      <div class="ops"><button data-detail="${r.id}">📖</button><button data-add="${r.id}">${inSlot.has(r.id)?'✕':'＋'}</button></div>
      ${ready?'<span class="ready-tag">料齐了</span>':''}</div>`;
  }).join('')||'<div class="empty">没有符合的</div>';
}
$('pickSheet').addEventListener('click',e=>{
  const t=e.target.closest('[data-ptag]');
  if(t){pickTag=pickTag===t.dataset.ptag?null:t.dataset.ptag;renderPick();return}
  const a=e.target.closest('[data-add]');
  if(a){const id=a.dataset.add;const arr=S.today[pickSlot]=S.today[pickSlot]||[];
    const i=arr.findIndex(x=>x.id===id);
    if(i>=0)arr.splice(i,1); else arr.push({id,x:1,eaten:false});
    rebuildShop();save();renderAll();renderPick();return}
  const d=e.target.closest('[data-detail]'); if(d){openDetail(d.dataset.detail)}
});
$('pickSearch').addEventListener('input',e=>{pickQ=e.target.value.trim();renderPick()});

/* ---------- 详情 ---------- */
function openDetail(id){
  const r=byId(id); if(!r)return;
  $('dtTitle').textContent=r.name;
  const steps=(r.steps||'').split('|').filter(Boolean);
  const miss=(r._eatout?[]:(r.ings||[])).filter(i=>!inPantry(i));
  const n=r.nutri||{};
  $('dtBody').innerHTML=`
    ${r.ja?`<p style="color:var(--sky);font-size:15px;margin-bottom:2px">${r.ja}</p>`:''}
    ${r.en?`<p class="muted" style="margin-bottom:10px">${r.en}</p>`:''}
    ${n.kcal?`<div class="card flat" style="padding:10px 13px"><b>${n.kcal}</b> kcal　蛋白 <b>${n.p}</b>g　脂肪 <b>${n.f}</b>g　碳水 <b>${n.c}</b>g
       <div class="muted" style="margin-top:4px">约占今天目标 ${Math.round(n.kcal/targets().kcal*100)}%</div></div>`:''}
    ${r._eatout?`<div class="card flat" style="padding:11px 13px;background:var(--sun-dim);border-color:var(--sun)">
       💡 ${r.tip}</div>
       <h3 class="blk" style="margin-top:12px">点单</h3>
       <div class="card flat" style="padding:11px 13px"><b>${r.order}</b><br>
         <span style="color:var(--sky)">🗣️ ${r.jp}</span><br>
         <button class="btn-tiny" data-eocopy2="${r.id}" style="margin-top:7px">📋 复制这句日语</button></div>`:''}
    ${r._eatout?'':'<h3 class="blk" style="margin-top:12px">食材</h3>'}
    <div class="chips" style="margin-bottom:10px">${(r._eatout?[]:(r.ings||[])).map(i=>
      `<span class="chip ${inPantry(i)?'leaf on':''}">${i}${jaOf(i)?` · ${jaOf(i)}`:''}</span>`).join('')}</div>
    ${r._eatout?'':miss.length?`<p class="muted" style="margin-bottom:10px">🛒 还差：${miss.join('、')}</p>`:'<p class="muted" style="margin-bottom:10px">✅ 家里都有</p>'}
    ${steps.length?`<h3 class="blk">做法</h3><ol class="steps">${steps.map(s=>`<li>${s}</li>`).join('')}</ol>`:''}
    ${r.prep?`<div class="card flat" style="margin-top:10px;padding:10px 13px;font-size:13.5px;background:var(--sun-dim);border-color:var(--sun)">
       ${PREP_ICON[r.prepType]||'🍱'} <b>${PREP_LABEL[r.prepType]||'备菜'}</b>：${r.prep}${r.keep?'<br>🍱 做双份，第二天热一热就是一顿':''}</div>`:''}
    ${r.note?`<div class="card flat" style="margin-top:10px;padding:10px 13px;font-size:13.5px">💡 ${r.note}</div>`:''}
    <div class="row-btns" style="margin-top:14px">
      ${r._eatout?'':`<button class="btn-line" data-toshop="${r.id}">🛒 缺的丢进清单</button>`}
      <button class="btn-main" data-planq="${r.id}">＋ 排进今天</button></div>`;
  $('detailSheet').classList.add('show');
}
$('detailSheet').addEventListener('click',e=>{
  const cc=e.target.closest('[data-eocopy2]');
  if(cc){const x=byId(cc.dataset.eocopy2);copyText(x.jp.replace(/[「」]/g,''),'日语已复制');return}
  const s=e.target.closest('[data-toshop]');
  if(s){const r=byId(s.dataset.toshop);let n=0;
    (r.ings||[]).forEach(i=>{if(inPantry(i))return;const k='k_'+i;if(S.shop[k])return;
      S.shop[k]={zh:i,ja:jaOf(i),store:storeOf(i),qty:'',done:false,extra:true};n++});
    save();renderShop();toast(n?`加了 ${n} 样进清单`:'都有了');return}
  const p=e.target.closest('[data-planq]');
  if(p){const r=byId(p.dataset.planq);
    const slot=isDrink(r.id)?'extra':r.type==='breakfast'?'breakfast':(S.today.lunch||[]).length?'dinner':'lunch';
    addToSlot(slot,r.id);$('detailSheet').classList.remove('show');}
});

/* ---------- 菜谱库事件 ---------- */
$('tab-book').addEventListener('click',e=>{
  const m=e.target.closest('[data-bm]'); if(m){bookMain=m.dataset.bm;bookTag=null;renderBook();return}
  const t=e.target.closest('[data-bt]'); if(t){bookTag=bookTag===t.dataset.bt?null:t.dataset.bt;renderBook();return}
  const f=e.target.closest('[data-fav]');
  if(f){const id=f.dataset.fav;const r=byId(id);S.favOv[id]=!r.fav;save();renderBook();toast(S.favOv[id]?'⭐ 加进常做菜':'取消常做');return}
  const d=e.target.closest('[data-detail]'); if(d){openDetail(d.dataset.detail);return}
  const p=e.target.closest('[data-plan]');
  if(p){const r=byId(p.dataset.plan);
    const slot=isDrink(r.id)?'extra':r.type==='breakfast'?'breakfast':(S.today.lunch||[]).length?'dinner':'lunch';
    addToSlot(slot,r.id);toast(`${r.name} 排进今天了`);}
});
$('bookSearch').addEventListener('input',e=>{bookQ=e.target.value.trim();renderBook()});

/* ---------- 冰箱事件 ---------- */
$('tab-fridge').addEventListener('click',e=>{
  const rm=e.target.closest('[data-rmp]');
  if(rm){S.pantry.splice(+rm.dataset.rmp,1);rebuildShop();save();renderAll();}
});
$('autoConsume').addEventListener('change',e=>{S.autoConsume=e.target.checked;save()});
$('quickAddBtn').addEventListener('click',()=>{$('addSheet').classList.add('show');renderLib()});
function addPantry(name,q){
  name=String(name||'').trim(); if(!name)return false;
  const e=S.pantry.find(x=>x.n===name);
  if(e){e.q=(e.q||1)+(q||1);e.d=dkey()}
  else S.pantry.push({n:name,d:dkey(),q:q||1});
  return true;
}
function renderLib(){
  const cats={};
  Object.keys(JA).forEach(z=>{const c=catOf(z);(cats[c]=cats[c]||[]).push(z)});
  const order=['🥩 肉蛋海鲜','🥬 蔬菜','🍎 水果','🥛 乳品甜点','🍚 主食干货','🏪 现成即食','🧂 调料酱汁','🌿 香料香草','☕ 茶饮','🧴 日用品'];
  $('libPicker').innerHTML=order.filter(c=>cats[c]).map(c=>
    `<div class="grp-head"><b>${c}</b></div><div class="chips" style="margin-bottom:4px">`+
    cats[c].map(z=>`<button class="chip ${inPantry(z)?'leaf on':''}" data-lib="${z}">${z}</button>`).join('')+'</div>').join('');
}
$('addSheet').addEventListener('click',e=>{
  const b=e.target.closest('[data-lib]'); if(!b)return;
  const z=b.dataset.lib; const i=S.pantry.findIndex(x=>x.n===z);
  if(i>=0)S.pantry.splice(i,1); else addPantry(z,1);
  save();renderLib();renderFridge();renderToday();
});
$('addItemGo').addEventListener('click',doAddItem);
$('addItemInput').addEventListener('keydown',e=>{if(e.key==='Enter')doAddItem()});
function doAddItem(){
  const i=$('addItemInput');
  const names=i.value.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean);
  let n=0; names.forEach(x=>{if(addPantry(x,1))n++});
  i.value='';save();renderLib();renderFridge();renderToday();
  if(n)toast(`加了 ${n} 样`);
}

/* ---------- 清单事件 ---------- */
$('tab-shop').addEventListener('click',e=>{
  const b=e.target.closest('[data-buy]');
  if(b){const k=b.dataset.buy;if(S.shop[k]){S.shop[k].done=!S.shop[k].done;save();renderShop()}return}
  const s=e.target.closest('[data-skip]');
  if(s){const k=s.dataset.skip;const it=S.shop[k];if(it){S.skipped.push(it.zh);delete S.shop[k];save();renderShop();toast('这次不买了')}}
});
$('addExtra').addEventListener('click',addExtraItem);
$('extraItem').addEventListener('keydown',e=>{if(e.key==='Enter')addExtraItem()});
function addExtraItem(){
  const i=$('extraItem'); const v=i.value.trim(); if(!v)return;
  v.split(/[,，、]/).map(x=>x.trim()).filter(Boolean).forEach(z=>{
    S.shop['k_'+z]={zh:z,ja:jaOf(z),store:storeOf(z),qty:'',done:false,extra:true};
  });
  i.value='';save();renderShop();
}
$('clearDone').addEventListener('click',()=>{
  const bought=Object.entries(S.shop).filter(([k,v])=>v.done);
  if(!bought.length){toast('还没勾选任何东西');return}
  let n=0; bought.forEach(([k,v])=>{if(addPantry(v.zh,1))n++;delete S.shop[k]});
  S.skipped=[];save();renderAll();toast(`${n} 样放进冰箱了 🧊`);
});
$('clearMemo').addEventListener('click',()=>{S.memo='';$('memo').value='';save()});
$('memo').addEventListener('input',e=>{S.memo=e.target.value;clearTimeout(window._mt);window._mt=setTimeout(save,400)});

/* ---------- 买菜 AI ---------- */
function shopPrompt(){
  const items=Object.values(S.shop).filter(v=>!v.done);
  const P=S.profile;
  const place=[P.city,P.area].filter(Boolean).join(' ');
  const g={normal:[],chinese:[]};
  items.forEach(v=>g[v.store==='chinese'?'chinese':'normal'].push(`- ${v.zh}${v.ja?' / '+v.ja:''}${v.qty?' '+v.qty:''}`));
  let list='';
  if(g.normal.length)list+='【普通超市就有】\n'+g.normal.join('\n')+'\n';
  if(g.chinese.length)list+='\n【可能要去中华食材店 / 業務スーパー / カルディ】\n'+g.chinese.join('\n')+'\n';
  const memo=(S.memo||'').trim();
  return `你是一位熟悉日本本地超市的买菜向导。请帮我规划一条今天的买菜路线。
我看得懂中文，但在日本超市货架上只能看到日文，所以每样东西都要给我「中文名（日文货架名）」的对照。
请保持极高的可扫描性，不要写大段废话。

### 开头（300 字以内）
1. 根据我给的地点，指出附近**真实存在**的超市（西友 / イオン / まいばすけっと / OKストア / ライフ / 業務スーパー / ドン・キホーテ / 肉のハナマサ / カルディ / 中華食材店 等）
2. 说明你规划的是一条不走回头路、顺手买齐的路线
3. 结尾加这个提醒框：
> 📌 如果这个位置不准，告诉我你最近的车站名，我马上重排路线。

---

### 输出格式（严格照这个骨架，有几站写几站）

### 💰 总预算：[日元区间，例如 ¥2,000 - ¥3,200]

## 🛒 今天的路线

### 🚩 第 1 站｜[店铺类型]：[真实店名]
**⏰ [营业时间]　📍 [步行时间]**
- **🗺️ 地图**：[在 Google Maps 打开](https://www.google.com/maps/search/?api=1&query=店名+住所+市区町村)

> **💡 在这家买**

- **[日文货架名]**（中文名）— **¥[价格区间]**　→ [在哪个货架 / 挑选要点]
- **[日文货架名]**（中文名）— **¥[价格区间]**

### 🚩 第 2 站｜…（同上）

## 💡 今天的小提醒
1. [针对这次清单的挑选 / 省钱 / 找货提示]
2. [同上]

## 🗣️ 用得上的一句日语
- 「[日文]」（中文意思）—— 找不到东西时可以直接问店员

---

### 规则
1. 只用标准 Markdown，不要 HTML 标签或自定义组件
2. 店名、营业时间要真实，价格用日元给合理区间
3. **每样商品第一个加粗的必须是日文货架名**，括号里写中文
4. 中华食材（老抽、豆瓣酱、花椒、粉丝、腐乳这类）单独安排到業務スーパー / カルディ / 中華食材店，不要让我在普通超市里瞎找
5. 地图链接必须是 https://www.google.com/maps/search/?api=1&query= 接「店名+住所」，空格用 + 连接，不要输出空链接
6. 站点顺序按实际地理顺路排

---

### 我的情况
- 住在：${place||'（我没写地点，请先问我最近的车站再给建议）'}
- 今天要买：
${list}${memo?`\n另外记着：${memo}`:''}`;
}
function copyText(t,okMsg){
  const done=()=>toast(okMsg||'已复制，去贴给 AI 吧');
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(t).then(done).catch(()=>fallbackCopy(t,done));
  else fallbackCopy(t,done);
}
function fallbackCopy(t,cb){
  const ta=document.createElement('textarea');ta.value=t;
  ta.style.cssText='position:fixed;top:-9999px;opacity:0';document.body.appendChild(ta);
  ta.select();ta.setSelectionRange(0,999999);
  try{document.execCommand('copy');cb&&cb()}catch(e){toast('复制失败，请手动选中')}
  document.body.removeChild(ta);
}
$('askAI').addEventListener('click',()=>{
  if(!Object.values(S.shop).filter(v=>!v.done).length){toast('清单是空的');return}
  copyText(shopPrompt());
});

/* ---------- OCR ---------- */
const OCR_PROMPT=`这是一张日本超市的购物小票（或者我买的食材照片）。
请识别出我买的**食材类商品**，把每样翻译成中文常见叫法，只输出一行，用逗号分隔，不要任何解释。

规则：
- 只要食物和厨房日用品，忽略金额、税、积分、店名、袋子代（レジ袋）
- 用中文常见叫法，不要日文：豚こま切れ肉→猪肉片、鶏もも肉→鸡腿、玉ねぎ→洋葱、じゃがいも→土豆、
  にんじん→胡萝卜、ねぎ→大葱、ほうれん草→菠菜、キャベツ→包菜、なす→茄子、ピーマン→青椒、
  もやし→豆芽、しめじ／えのき→蘑菇、豆腐→豆腐、卵→鸡蛋、牛乳→牛奶、食パン→吐司、
  絹ごし→嫩豆腐、鮭→三文鱼、まぐろ→金枪鱼、ぶり→鰤鱼、ひき肉→肉末
- 商品名被缩写或看不清的，按最可能的食材猜，猜不出就跳过
- 同一样买了多份就只写一次

输出示例：
猪肉片, 鸡蛋, 菠菜, 牛奶, 豆腐, 洋葱`;
$('ocrBtn').addEventListener('click',()=>{
  $('ocrPaste').value='';$('ocrParsed').innerHTML='';$('ocrConfirmWrap').classList.add('hide');
  $('ocrSheet').classList.add('show');
});
$('ocrCopyPrompt').addEventListener('click',()=>copyText(OCR_PROMPT,'指令已复制，去 AI App 里连照片一起发'));
let ocrItems=[];
$('ocrParse').addEventListener('click',()=>parseOcr($('ocrPaste').value));
function parseOcr(raw){
  let t=String(raw||'').trim();
  t=t.replace(/```[a-z]*/gi,'').replace(/^[^：:]*[：:]/,'');
  const names=t.split(/[,，、\n;；]/).map(x=>x.replace(/^[-*\d.\s]+/,'').trim())
    .filter(x=>x&&x.length<=12&&!/^\d+$/.test(x));
  ocrItems=[...new Set(names)].map(n=>({n,on:true}));
  if(!ocrItems.length){toast('没解析出东西，检查一下格式');return}
  renderParsed();$('ocrConfirmWrap').classList.remove('hide');
}
function renderParsed(){
  $('ocrParsed').innerHTML=ocrItems.map((it,i)=>
    `<span class="pp ${it.on?'':'off'}" data-pi="${i}">${it.n}${jaOf(it.n)?` · ${jaOf(it.n)}`:''}</span>`).join('');
}
$('ocrParsed').addEventListener('click',e=>{
  const p=e.target.closest('[data-pi]'); if(!p)return;
  ocrItems[+p.dataset.pi].on=!ocrItems[+p.dataset.pi].on; renderParsed();
});
$('ocrConfirm').addEventListener('click',()=>{
  let n=0; ocrItems.filter(i=>i.on).forEach(i=>{if(addPantry(i.n,1))n++});
  save();renderAll();$('ocrSheet').classList.remove('show');
  toast(`${n} 样放进冰箱了 🧊`);
});
const pickRandom=arr=>arr&&arr.length?arr[Math.floor(Math.random()*arr.length)]:null;

/* ---------- 🍜 外食 ---------- */
let eoGenre=null, eoHealthy=false, eoSlot='dinner', eoPicks=[];
const favShops=()=>S.favShops||[];
const isFavShop=s=>favShops().includes(s);
function openEatout(){
  eoGenre=null;eoHealthy=false;
  eoSlot=(S.today.lunch||[]).length&&!(S.today.dinner||[]).length?'dinner'
        :new Date().getHours()<15?'lunch':'dinner';
  rollEatout();$('eoSheet').classList.add('show');
}
/* 今天还能吃多少 kcal —— 推荐会据此挑轻重 */
function remainKcal(){
  const left=targets().kcal-dayNutri().kcal;
  return left>200?left:0;   // 已经吃满了就按「挑最轻的」处理
}
/* 在一家店里挑一份：吃得尽兴，但别捅破今天的预算 */
function pickAtShop(shop,remain){
  const list=EATOUT_R.filter(x=>x.shop===shop&&dietOK(x));
  if(!list.length)return null;
  const fit=remain?list.filter(x=>x.nutri.kcal<=remain*1.15):[];
  const pool=fit.length?fit.slice().sort((a,b)=>b.nutri.kcal-a.nutri.kcal)
                       :list.slice().sort((a,b)=>a.nutri.kcal-b.nutri.kcal);
  return pickRandom(pool.slice(0,3));
}
/* 🎲 抽三个：第一个大概率是最爱那家，第二个是另一家常去的，第三个换口味 */
function rollEatout(){
  const remain=remainKcal();
  const favs=favShops().filter(s=>EATOUT_R.some(x=>x.shop===s&&dietOK(x)));
  const out=[];
  if(favs.length){
    // 排在前面的常去店权重更高
    const bag=[];
    favs.forEach((s,i)=>{
      const n=EATOUT_R.filter(x=>x.shop===s).length*(i===0?3:1);
      for(let k=0;k<n;k++)bag.push(s);
    });
    const s1=pickRandom(bag);
    const p1=pickAtShop(s1,remain); if(p1)out.push({r:p1,why:'fav1'});
    const rest=favs.filter(s=>s!==s1);
    if(rest.length){
      const p2=pickAtShop(pickRandom(rest),remain); if(p2)out.push({r:p2,why:'fav2'});
    }
  }
  // 换口味：非常去店，优先高蛋白
  let others=EATOUT_R.filter(x=>!isFavShop(x.shop)&&dietOK(x)&&!out.some(o=>o.r.id===x.id));
  if(remain)others=others.filter(x=>x.nutri.kcal<=remain*1.15).length
    ? others.filter(x=>x.nutri.kcal<=remain*1.15) : others;
  const healthy=others.filter(x=>x.healthy);
  const p3=pickRandom(healthy.length?healthy:others);
  if(p3)out.push({r:p3,why:'new'});
  // 不够三个就随便补
  while(out.length<3){
    const c=EATOUT_R.filter(x=>dietOK(x)&&!out.some(o=>o.r.id===x.id));
    if(!c.length)break;
    out.push({r:pickRandom(c),why:'new'});
  }
  eoPicks=out;
  renderEatout();
}
const WHY={fav1:['⭐','老地方'],fav2:['⭐','另一家常去的'],new:['🌱','换换口味']};
function renderRoll(){
  const box=$('eoRoll'); const remain=remainKcal();
  if(!eoPicks.length){box.innerHTML='';return}
  box.innerHTML=`
    <div class="sec-head" style="margin:0 2px 8px">
      <h2 style="font-size:20px">今天吃这个吧</h2>
      <button class="btn-tiny" id="eoReroll">🎲 换一批</button></div>
    ${remain?`<p class="muted" style="margin:-3px 2px 9px">今天还剩 <b>${Math.round(remain)}</b> kcal，按这个挑的</p>`
            :'<p class="muted" style="margin:-3px 2px 9px">今天已经吃得差不多了，给你挑了轻的</p>'}
    ${eoPicks.map(({r,why})=>`
      <div class="roll-card">
        <div class="rc-why">${WHY[why][0]} ${WHY[why][1]}</div>
        <div class="rc-top">
          <span class="em">${r.emoji}</span>
          <div class="rc-body">
            <div class="t">${r.name}</div>
            <div class="ja">${r.ja}</div>
            <div class="kcal"><b>¥${r.price}</b> · <b>${r.nutri.kcal}</b> kcal · 蛋白 <b>${r.nutri.p}</b>g</div>
          </div>
        </div>
        <div class="eo-tip">💡 ${r.tip}</div>
        <div class="row-btns" style="margin-top:9px">
          <button class="btn-line" data-eocopy="${r.id}">🗣️ 复制点单日语</button>
          <button class="btn-main" data-eoadd="${r.id}" style="padding:11px">就它了</button>
        </div>
      </div>`).join('')}
    <div class="grp-head" style="margin-top:16px"><b>或者自己翻</b><span>全部 ${EATOUT_R.length} 家</span></div>`;
}
function renderEatout(){
  renderRoll();
  $('eoSlotSeg').innerHTML=[['lunch','排进午餐'],['dinner','排进晚餐']]
    .map(([v,l])=>`<button data-eos="${v}" class="${eoSlot===v?'on':''}">${l}</button>`).join('');
  $('eoTags').innerHTML=`<button class="chip leaf ${eoHealthy?'on':''}" data-eoh="1">💪 高蛋白</button>`
    +EATOUT_GENRES.map(g=>`<button class="chip ${eoGenre===g?'on':''}" data-eog="${g}">${g}</button>`).join('');
  let list=EATOUT_R.filter(dietOK), loose=false;
  if(list.length<4){ list=EATOUT_R.slice(); loose=true }
  if(eoHealthy)list=list.filter(x=>x.healthy);
  if(eoGenre)list=list.filter(x=>x.genre===eoGenre);
  const T=targets();
  list=list.slice().sort((a,b)=>(b.healthy?1:0)-(a.healthy?1:0)||a.price-b.price);
  $('eoCount').innerHTML=loose
    ? `按你的忌口能吃的实在太少了（日本外食对素食很不友好），下面列了全部 <b>${list.length}</b> 家，自己挑`
    : list.length+' 家';
  $('eoList').innerHTML=list.map(x=>`
    <div class="rc ${x.healthy?'ready':''}" style="display:block">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <span class="em">${x.emoji}</span>
        <div class="body">
          <div class="t">${x.name}</div>
          <div class="ja">${x.ja}</div>
          <div class="kcal"><b>¥${x.price}</b> · <b>${x.nutri.kcal}</b> kcal · 蛋白 <b>${x.nutri.p}</b>g
            · 占今天 ${Math.round(x.nutri.kcal/T.kcal*100)}%</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex:none;align-items:flex-end">
          <button class="star" data-eofav="${x.shop}" style="font-size:16px;padding:2px 4px"
            title="标成常去的店">${isFavShop(x.shop)?'⭐':'☆'}</button>
          <button class="btn-tiny" data-eoadd="${x.id}">＋ 就这个</button>
        </div>
      </div>
      <div class="eo-tip">💡 ${x.tip}</div>
      <div class="eo-jp" data-eocopy="${x.id}">🗣️ ${x.jp}　<span>点一下复制</span></div>
    </div>`).join('')||'<div class="empty">没有符合的</div>';
}
$('eoSheet').addEventListener('click',e=>{
  if(e.target.id==='eoReroll'){rollEatout();return}
  const fv=e.target.closest('[data-eofav]');
  if(fv){const sh=fv.dataset.eofav; S.favShops=S.favShops||[];
    const i=S.favShops.indexOf(sh);
    if(i>=0){S.favShops.splice(i,1);toast(`${sh} 不再算常去的店`)}
    else{S.favShops.unshift(sh);toast(`${sh} 记成常去的店了 ⭐ 推荐会优先给它`)}
    save();rollEatout();return}
  const s=e.target.closest('[data-eos]'); if(s){eoSlot=s.dataset.eos;renderEatout();return}
  const h=e.target.closest('[data-eoh]'); if(h){eoHealthy=!eoHealthy;renderEatout();return}
  const g=e.target.closest('[data-eog]'); if(g){eoGenre=eoGenre===g.dataset.eog?null:g.dataset.eog;renderEatout();return}
  const c=e.target.closest('[data-eocopy]');
  if(c){const x=byId(c.dataset.eocopy);copyText(x.jp.replace(/[「」]/g,''),'日语已复制，给店员看就行');return}
  const a=e.target.closest('[data-eoadd]');
  if(a){addToSlot(eoSlot,a.dataset.eoadd);$('eoSheet').classList.remove('show');
    toast(`${byId(a.dataset.eoadd).shop} 排进${eoSlot==='lunch'?'午餐':'晚餐'}了 🍜`)}
});
$('eatoutBtn').addEventListener('click',openEatout);

/* ---------- 📅 本周晚餐排期（备菜产物） ---------- */
function dayLabel(k){
  const d=new Date(k+'T00:00:00');
  const diff=daysBetween(dkey(),k);
  const wd='周日周一周二周三周四周五周六'.slice(d.getDay()*2,d.getDay()*2+2);
  return (diff===0?'今天':diff===1?'明天':diff===2?'后天':`${d.getMonth()+1}/${d.getDate()}`)+' '+wd;
}
function schedulePrep(){
  const picked=prepPick.map(byId).filter(Boolean);
  if(!picked.length){toast('先选几道菜');return}
  const rounds=[picked.map(r=>r.id), picked.filter(r=>r.keep).map(r=>r.id)];
  const queue=[].concat(...rounds);
  S.plan={};
  const now=new Date();
  let day=1;
  queue.forEach(id=>{
    const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+day);
    S.plan[dkey(d)]=[{id,x:1}];
    day++;
  });
  save();renderAll();$('prepSheet').classList.remove('show');
  toast(`排好了，接下来 ${queue.length} 天的晚饭有着落 📅`);
  window.scrollTo(0,0);
}
function renderPlan(){
  const box=$('planCard');
  const keys=Object.keys(S.plan||{}).filter(k=>daysBetween(dkey(),k)>=0).sort();
  if(!keys.length){box.classList.add('hide');return}
  box.classList.remove('hide');
  box.innerHTML=`<div class="sec-head" style="margin-top:0"><h2>接下来几天的晚饭</h2>
      <button class="btn-tiny" id="clearPlan">清掉</button></div>
    ${keys.slice(0,7).map(k=>{
      const r=byId((S.plan[k][0]||{}).id); if(!r)return '';
      const today=daysBetween(dkey(),k)===0;
      return `<div class="plan-row ${today?'now':''}">
        <span class="pd">${dayLabel(k)}</span>
        <span class="pn">${r.emoji||'🍲'} ${r.name}</span>
        <span class="pk">${r.nutri?r.nutri.kcal+' kcal':''}</span></div>`;
    }).join('')}
    <div class="muted" style="margin-top:8px">到那天打开 App，晚餐会自动填好，热一下就行。</div>`;
}
document.addEventListener('click',e=>{
  if(e.target.id==='clearPlan'){S.plan={};save();renderAll();toast('排期清掉了')}
});

/* ---------- 🍱 周末备菜 ---------- */
let prepPick=[];
function openPrep(){
  if(!prepPick.length)suggestPrep();
  renderPrep(); $('prepSheet').classList.add('show');
}
function prepPool(){
  return allRecipes().filter(r=>dietOK(r)&&isMain(r)&&(r.keep||r.prepType==='batch'||r.prepType==='marinate'))
    .sort((a,b)=>(b.fav?1:0)-(a.fav?1:0)||(b.nutri.p||0)-(a.nutri.p||0));
}
function suggestPrep(){
  const pool=prepPool(); const used=new Set(); prepPick=[];
  const batch=pool.filter(r=>r.prepType==='batch');
  const mar=pool.filter(r=>r.prepType==='marinate');
  const take=(arr,n)=>{ const c=arr.filter(r=>!used.has(mainKey(r)));
    for(let i=0;i<n&&c.length;i++){
      const r=c[Math.floor(Math.random()*Math.min(c.length,10))];
      if(!r||prepPick.includes(r.id)){i--;continue}
      prepPick.push(r.id); used.add(mainKey(r));
      c.splice(c.indexOf(r),1);
    }};
  take(batch,2); take(mar,2);
  if(prepPick.length<3)take(pool,3-prepPick.length);
}
function renderPrep(){
  const pool=prepPool();
  $('prepPool').innerHTML=pool.slice(0,40).map(r=>
    `<button class="chip ${prepPick.includes(r.id)?'leaf on':''}" data-pp="${r.id}">${r.emoji||'🍲'} ${r.name}</button>`).join('');
  const picked=prepPick.map(byId).filter(Boolean);
  const box=$('prepPlan');
  if(!picked.length){box.innerHTML='<div class="empty">上面点几道，下面自动生成方案</div>';return}
  const order=['batch','marinate','cut','fresh'];
  const grp={}; picked.forEach(r=>(grp[r.prepType||'fresh']=grp[r.prepType||'fresh']||[]).push(r));
  const meals=picked.reduce((s,r)=>s+(r.keep?2:1),0);
  const tot=picked.reduce((s,r)=>({kcal:s.kcal+r.nutri.kcal*(r.keep?2:1),p:s.p+r.nutri.p*(r.keep?2:1)}),{kcal:0,p:0});
  const need=new Set(); picked.forEach(r=>(r.ings||[]).forEach(i=>{if(!isSeason(i))need.add(i)}));
  box.innerHTML=`
    <div class="gen-note" style="margin:0 0 12px">这 <b>${picked.length}</b> 道做完，够撑 <b>${meals}</b> 顿晚饭，
      合计 <b>${Math.round(tot.p)}g</b> 蛋白质。平日晚上只要热一下 / 下锅煎。</div>
    ${order.filter(k=>grp[k]).map(k=>`
      <div class="grp-head"><b>${PREP_ICON[k]} ${PREP_LABEL[k]}</b><span>${k==='batch'?'先开火，最占时间':k==='marinate'?'趁炖的时候腌':k==='cut'?'最后切配':'当天现做'}</span></div>
      ${grp[k].map(r=>`<div class="card flat" style="padding:11px 13px;margin-bottom:7px">
        <div style="font-weight:700">${r.emoji||'🍲'} ${r.name}${r.keep?' <span class="mini b">🍱 双份</span>':''}</div>
        <div class="muted" style="margin-top:3px">${r.prep||''}</div>
        <div class="muted" style="margin-top:3px">${r.nutri.kcal} kcal · 蛋白 ${r.nutri.p}g · ${(r.ings||[]).join('、')}</div>
      </div>`).join('')}`).join('')}
    <div class="grp-head"><b>🛒 一共要买</b><span>${need.size} 样</span></div>
    <div class="chips">${[...need].map(z=>`<span class="chip ${inPantry(z)?'leaf on':''}">${z}${jaOf(z)?' · '+jaOf(z):''}</span>`).join('')}</div>
    <button class="btn-main" id="prepSchedule" style="margin-top:14px">📅 排进接下来几天的晚饭</button>
    <div class="row-btns" style="margin-top:8px">
      <button class="btn-line" id="prepToShop">🛒 缺的丢进清单</button>
      <button class="btn-line" id="prepCopy">📋 让 AI 排工序</button>
    </div>`;
}
function prepPrompt(){
  const picked=prepPick.map(byId).filter(Boolean);
  return `我周末下午想一次把下面几道菜备好，平日晚上下班回来只要热一下就能吃。请帮我排一份**并行工序表**。

要做的菜：
${picked.map(r=>`- ${r.name}（${r.ja||''}）｜食材：${(r.ings||[]).join('、')}｜做法：${(r.steps||'').split('|').join(' → ')}｜${r.prep||''}`).join('\n')}

请输出：
1. **总耗时估计**，以及需要几个灶眼 / 用不用烤箱
2. **一张按时间轴排的并行工序表**（比如「0–10 分：肉解冻+腌上，同时烧一锅水」这种），要让等待时间被填满，不要串行罗列
3. 每道菜**分装和保存**的建议：用什么容器、冷藏还是冷冻、能放几天、复热怎么弄不难吃
4. 哪些步骤可以**再提前一天**做掉
5. 一份**洗切台面的顺序建议**，减少换刀换砧板的次数（生肉和蔬菜分开）

要求：简洁、可扫描，用 Markdown，不要客套话。`;
}
$('prepSheet').addEventListener('click',e=>{
  const p=e.target.closest('[data-pp]');
  if(p){const id=p.dataset.pp;const i=prepPick.indexOf(id);
    if(i>=0)prepPick.splice(i,1); else {if(prepPick.length>=6){toast('最多 6 道，别把周末搭进去');return}prepPick.push(id)}
    renderPrep();return}
  if(e.target.id==='prepToShop'){
    let n=0; prepPick.map(byId).forEach(r=>(r.ings||[]).forEach(i=>{
      if(inPantry(i))return; const k='k_'+i; if(S.shop[k])return;
      S.shop[k]={zh:i,ja:jaOf(i),store:storeOf(i),qty:'',done:false,extra:true};n++}));
    save();renderShop();toast(n?`加了 ${n} 样进清单`:'都有了');return}
  if(e.target.id==='prepSchedule'){schedulePrep();return}
  if(e.target.id==='prepCopy'){
    if(!prepPick.length){toast('先选几道菜');return}
    copyText(prepPrompt(),'工序指令已复制，贴给 AI');return}
});
$('prepBtn').addEventListener('click',openPrep);
$('prepReroll').addEventListener('click',()=>{suggestPrep();renderPrep();toast('换一组')});

/* ---------- 自定义菜谱 ---------- */
let rfType='meal',rfTags=[],rfEdit=null;
$('addRecipeBtn').addEventListener('click',()=>openRecipeForm());
function openRecipeForm(){
  rfEdit=null;rfType='meal';rfTags=[];
  ['rfName','rfIngs','rfJa','rfKcal','rfP','rfF','rfC','rfSteps','rfAiWhat','rfAiPaste'].forEach(i=>$(i).value='');
  $('rfFav').checked=true;
  document.querySelectorAll('#rfType button').forEach(b=>b.classList.toggle('on',b.dataset.v==='meal'));
  renderRfTags(); $('recipeSheet').classList.add('show');
}
function renderRfTags(){
  $('rfTags').innerHTML=TAG_LIB.map(t=>`<button class="chip ${rfTags.includes(t)?'on':''}" data-rt="${t}">${t}</button>`).join('');
}
$('rfTags').addEventListener('click',e=>{
  const b=e.target.closest('[data-rt]'); if(!b)return;
  const t=b.dataset.rt,i=rfTags.indexOf(t); i>=0?rfTags.splice(i,1):rfTags.push(t); renderRfTags();
});
$('rfType').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  rfType=b.dataset.v; document.querySelectorAll('#rfType button').forEach(x=>x.classList.toggle('on',x===b));
});
$('rfSave').addEventListener('click',()=>{
  const name=$('rfName').value.trim(); if(!name){toast('先写个菜名');return}
  const ings=$('rfIngs').value.split(/[,，、\n;；]/).map(x=>x.trim()).filter(Boolean);
  const kcal=+$('rfKcal').value||0;
  const r={
    id:rfEdit||('u'+Date.now().toString(36)),
    name, ja:$('rfJa').value.trim(), en:'', emoji:rfType==='breakfast'?'🍳':'🍲',
    type:rfType, tags:rfTags.join(',')||'快手菜', spicy:'gentle',
    cal:kcal>450?'high':'light', keep:false, fav:$('rfFav').checked, serving:1,
    ings, nutri:{kcal,p:+$('rfP').value||0,f:+$('rfF').value||0,c:+$('rfC').value||0},
    steps:$('rfSteps').value.split('\n').map(x=>x.trim()).filter(Boolean).join('|'), note:''
  };
  S.recipes=(S.recipes||[]).filter(x=>x.id!==r.id); S.recipes.unshift(r);
  save();$('recipeSheet').classList.remove('show');renderAll();toast(`${name} 加好了`);
});
function recipePrompt(what){
  return `请把这道菜整理成 JSON。直接输出 JSON，不要解释，不要代码块标记。

菜：${what}

格式：
{"name":"中文菜名","ja":"日语菜名","en":"英文名","emoji":"🍲",
 "type":"meal","tags":"中餐,炒菜","spicy":"gentle","cal":"light","fav":true,
 "ings":["食材1","食材2"],"ingsJa":["食材1的日语","食材2的日语"],
 "nutri":{"kcal":380,"p":24,"f":18,"c":30},
 "steps":["第一步","第二步"],"note":"一句话小贴士"}

说明：
- type：早餐 breakfast，正餐 meal
- tags：从这些里挑 2-4 个：${TAG_LIB.join(',')}
- spicy：辣 spicy，不辣 gentle；cal：≤450kcal 填 light，否则 high
- fav：如果是一周能做好几次的家常菜填 true
- ings 只写食材名不写用量；ingsJa 一一对应，写**日本超市货架上的实际叫法**
  （猪肉片→豚こま切れ肉、鸡腿→鶏もも肉、生抽→醤油、淀粉→片栗粉、大葱→長ねぎ）
- nutri 是**一人份**估算，要求 p*4+f*9+c*4 ≈ kcal（±12%）
- steps 每步一句话，写清火候和时间`;
}
$('rfAiCopy').addEventListener('click',()=>{
  const w=$('rfAiWhat').value.trim(); if(!w){toast('先写想加什么菜');return}
  copyText(recipePrompt(w));
});
$('rfAiParse').addEventListener('click',()=>{
  let t=$('rfAiPaste').value.replace(/```[a-z]*/gi,'').trim();
  const a=t.indexOf('{'),b=t.lastIndexOf('}'); if(a>=0&&b>a)t=t.slice(a,b+1);
  let o; try{o=JSON.parse(t)}catch(e){toast('JSON 格式不对');return}
  if(!o.name){toast('缺 name 字段');return}
  const A=v=>Array.isArray(v)?v:String(v||'').split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean);
  const ings=A(o.ings), ja=A(o.ingsJa);
  ings.forEach((z,i)=>{ if(ja[i]&&!JA[z])JA[z]=[ja[i],'normal','', '📦 其他',7] });
  const n=o.nutri||{};
  const r={id:'u'+Date.now().toString(36),name:o.name,ja:o.ja||'',en:o.en||'',emoji:o.emoji||'🍲',
    type:o.type==='breakfast'?'breakfast':'meal',tags:String(o.tags||'快手菜'),
    spicy:o.spicy==='spicy'?'spicy':'gentle',cal:(+n.kcal||0)>450?'high':'light',
    keep:!!o.keep,fav:o.fav!==false,serving:1,ings,
    nutri:{kcal:+n.kcal||0,p:+n.p||0,f:+n.f||0,c:+n.c||0},
    steps:A(o.steps).join('|'),note:o.note||''};
  S.recipes=(S.recipes||[]);S.recipes.unshift(r);
  save();$('recipeSheet').classList.remove('show');renderAll();toast(`${r.name} 导入好了 ✓`);
});

/* ---------- 设置 ---------- */
function segSet(id,v){document.querySelectorAll('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===String(v)))}
function segGet(id,def){const b=document.querySelector('#'+id+' button.on');return b?b.dataset.v:def}
['stSex','stAct','stGoal','stDiet','obSex','obAct','obGoal','obDiet'].forEach(id=>{
  const el=$(id); if(!el)return;
  el.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b)return;
    el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    if(id.startsWith('st'))showTdee('stTdee','st'); if(id.startsWith('ob'))showTdee('obTdee','ob');
  });
});
function readForm(pfx){
  return {sex:segGet(pfx+'Sex','f'),age:+$(pfx+'Age').value||30,h:+$(pfx+'H').value||165,
    w:+$(pfx+'W').value||55,act:+segGet(pfx+'Act','1.5'),goal:segGet(pfx+'Goal','keep')};
}
function showTdee(boxId,pfx){
  const old=S.profile; S.profile=Object.assign({},old,readForm(pfx));
  const T=targets(); S.profile=old;
  $(boxId).innerHTML=`一天大约需要 <b>${T.kcal} kcal</b><br>
    <span class="muted">蛋白质 ${T.p}g　脂肪 ${T.f}g　碳水 ${T.c}g　（基础代谢 ${T.bmr}）</span>`;
}
['stAge','stH','stW','obAge','obH','obW'].forEach(id=>{
  const el=$(id); if(el)el.addEventListener('input',()=>showTdee(id.startsWith('st')?'stTdee':'obTdee',id.slice(0,2)));
});
$('gearBtn').addEventListener('click',()=>{
  const p=S.profile;
  segSet('stSex',p.sex);segSet('stAct',p.act);segSet('stGoal',p.goal);segSet('stDiet',p.diet);
  $('stAge').value=p.age;$('stH').value=p.h;$('stW').value=p.w;
  $('stAvoid').value=(p.avoid||[]).join(', ');$('stCity').value=p.city||'';$('stArea').value=p.area||'';
  showTdee('stTdee','st');$('setSheet').classList.add('show');
});
$('setSave').addEventListener('click',()=>{
  Object.assign(S.profile,readForm('st'),{
    diet:segGet('stDiet','all'),
    avoid:$('stAvoid').value.split(/[,，、]/).map(x=>x.trim()).filter(Boolean),
    city:$('stCity').value.trim(),area:$('stArea').value.trim()});
  save();$('setSheet').classList.remove('show');renderAll();toast('存好了');
});
$('exportData').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`今天吃什么-备份-${dkey()}.json`;a.click();toast('备份下载好了');
});
$('importData').addEventListener('click',()=>$('importFile').click());
$('importFile').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(String(r.result));
    if(!d||typeof d!=='object'||!d.profile)throw 0;
    localStorage.setItem(KEY,JSON.stringify(d));location.reload();
  }catch(err){toast('这个文件读不了')}};
  r.readAsText(f);
});
$('resetAll').addEventListener('click',()=>{
  if(!confirm('确定全部清空？备份没导出的话就找不回来了'))return;
  localStorage.removeItem(KEY);location.reload();
});
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-close]'); if(c){$(c.dataset.close).classList.remove('show');return}
  if(e.target.classList.contains('mask'))e.target.classList.remove('show');
});

/* ---------- 引导 ---------- */
function obShow(n){[0,1,2].forEach(i=>$('obStep'+i).classList.toggle('hide',i!==n));window.scrollTo(0,0)}
$('obGo1').addEventListener('click',()=>{obShow(1);showTdee('obTdee','ob')});
$('obGo2').addEventListener('click',()=>obShow(2));
$('obSkip').addEventListener('click',()=>finishOb(true));
$('obSkip2').addEventListener('click',()=>obShow(2));
$('obFinish').addEventListener('click',()=>finishOb(false));
function finishOb(skip){
  if(!skip){
    Object.assign(S.profile,readForm('ob'),{
      diet:segGet('obDiet','all'),
      avoid:$('obAvoid').value.split(/[,，、]/).map(x=>x.trim()).filter(Boolean),
      city:$('obCity').value.trim(),area:$('obArea').value.trim()});
    $('obStock').value.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean).forEach(x=>addPantry(x,1));
  }
  ['盐','糖','食用油','酱油','醋','黑胡椒'].forEach(x=>{if(!inPantry(x))addPantry(x,1)});
  S.onboarded=true;save();
  $('ob').classList.remove('show');renderAll();
  setTimeout(()=>toast('点 🎲 试试，一秒出今天'),600);
}

/* ---------- 启动 ---------- */
function greet(){
  const h=new Date().getHours();
  $('greet').textContent=h<11?'早上好，今天吃点什么':h<15?'中午好，冰箱里还有货':h<21?'晚上好，来看看做什么':'夜宵时间到了';
}
document.documentElement.classList.add('auto-dark');
ensureToday();
$('memo').value=S.memo||'';
greet();renderAll();
if(!S.onboarded)$('ob').classList.add('show');
