'use strict';
/* ══════════════════════════════════════════════════════════
   桃园 · 像素画
   全部在低分辨率 canvas 上手绘，再以 nearest 放大整数倍。
   ══════════════════════════════════════════════════════════ */

const P = {
  bg:'#0b0c0f', ground:'#12161c', ground2:'#151a21',
  block:'#171c24', roof:'#1c222c', roofHi:'#232a35', edge:'#2b3441',
  road:'#39424f', road2:'#4b5665', roadHi:'#5b6878',
  brick:'#3a2622', brickHi:'#4d3129', brickLo:'#2a1b18',
  win:'#f2c67a', win2:'#c9a25a', winDim:'#5a4a30', winOff:'#1b2029',
  water:'#1b2f44', water2:'#24405c', park:'#16211c', park2:'#1b2a20',
  tree:'#20301f', tree2:'#2a3d24',
  cordon:'#7fa0cf', cordon2:'#4a6488',
  red:'#b3322b', redHi:'#d8503f', fire:'#f2a33a',
  paper:'#d8ccb0', dim:'#8f8672', ink:'#111417', blue:'#4f74a8',
  skin:'#c9a17a'
};

function RNG(seed){ let s=seed||1; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
const B4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const dith=(x,y,t)=> t*16 > B4[y&3][x&3]+.5;

function px(g,x,y,c){ g.fillStyle=c; g.fillRect(x|0,y|0,1,1); }
function rect(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function frame(g,x,y,w,h,c){ rect(g,x,y,w,1,c); rect(g,x,y+h-1,w,1,c); rect(g,x,y,1,h,c); rect(g,x+w-1,y,1,h,c); }
function dithFill(g,x,y,w,h,c,t){ for(let j=0;j<h;j++)for(let i=0;i<w;i++) if(dith(x+i,y+j,t)) px(g,x+i,y+j,c); }
function glow(g,cx,cy,r,color,a){
  const grd=g.createRadialGradient(cx,cy,1,cx,cy,r);
  grd.addColorStop(0,`rgba(${color},${a})`); grd.addColorStop(1,`rgba(${color},0)`);
  g.fillStyle=grd; g.fillRect(cx-r,cy-r,r*2,r*2);
}

/* 小楼：主体 + 屋顶 + 窗 */
function building(g,x,y,w,h,opt){
  opt=opt||{};
  const base=opt.base||P.block, roof=opt.roof||P.roof, rnd=opt.rnd||RNG(7);
  rect(g,x,y,w,h,base);
  frame(g,x,y,w,h,P.edge);
  rect(g,x,y,w,2,roof);
  rect(g,x,y,w,1,opt.roofHi||P.roofHi);
  const fl=opt.floors||3, cols=Math.max(1,Math.floor((w-6)/6)), rowH=Math.floor((h-8)/fl);
  for(let f=0;f<fl;f++){
    for(let cl=0;cl<cols;cl++){
      const wx=x+4+cl*6, wy=y+5+f*rowH;
      if(wy+3>y+h-2) continue;
      const lit=rnd()<(opt.lit===undefined?.5:opt.lit);
      rect(g,wx,wy,3,3, lit? (rnd()<.3?P.win:P.win2) : P.winOff);
    }
  }
  if(opt.door) rect(g,x+((w/2)|0)-2, y+h-6, 4,6, opt.doorC||P.winDim);
  return {x,y,w,h};
}

/* ══════════ 标题 640×360 ══════════ */
function drawTitle(){
  const cv=document.getElementById('title-c'); if(!cv) return;
  const W=640,H=360; cv.width=W; cv.height=H;
  const g=cv.getContext('2d'); const rnd=RNG(1993);

  // 天空
  const sky=g.createLinearGradient(0,0,0,226);
  sky.addColorStop(0,'#06070a'); sky.addColorStop(.42,'#0a0c11');
  sky.addColorStop(.74,'#121019'); sky.addColorStop(1,'#1d1417');
  g.fillStyle=sky; g.fillRect(0,0,W,226);
  dithFill(g,0,0,W,220,'#0e1014',.3);
  for(let i=0;i<70;i++){
    const x=rnd()*W, y=22+rnd()*96, w=24+rnd()*70;
    dithFill(g,x,y,w,3,rnd()<.5?'#101116':'#0b0c10',.45);
  }
  // 远楼
  let x=0;
  while(x<W){
    const w=10+((rnd()*24)|0), h=12+((rnd()*30)|0);
    rect(g,x,222-h,w,h+4, rnd()<.5?'#0f1115':'#121419');
    rect(g,x,222-h,w,1,'#181c22');
    for(let k=0;k<w*h/70;k++) if(rnd()<.28) px(g,x+1+rnd()*(w-2),222-h+2+rnd()*(h-4), rnd()<.5?'#3a3122':'#262220');
    x+=w;
  }
  // 董事会方塔
  const tx=556;
  rect(g,tx,96,44,126,'#0d0f13'); rect(g,tx,96,44,1,'#181c22');
  for(let yy=104;yy<218;yy+=6) for(let xx=tx+4;xx<tx+40;xx+=6) if(rnd()<.22) rect(g,xx,yy,2,3,P.win2);

  // 地面
  rect(g,0,226,W,134,'#0c0f13');
  dithFill(g,0,226,W,134,'#101419',.36);
  rect(g,0,268,W,70,'#12171f');
  for(let yy=268;yy<340;yy+=7) rect(g,0,yy,W,1,'#171d25');
  for(let xx=0;xx<W;xx+=14) rect(g,xx,268,1,72,'#171d25');

  // 桃园
  const bx=200, by=104, bw=248, bh=128;
  rect(g,bx,by,bw,bh,P.brickLo);
  frame(g,bx,by,bw,bh,'#1a1211');
  for(let yy=by+2;yy<by+bh;yy+=3) rect(g,bx+1,yy,bw-2,1, (yy%6===0)?P.brick:'#2d1d19');
  rect(g,bx-8,by-9,bw+16,9,'#2a201c'); rect(g,bx-8,by-9,bw+16,1,'#3d2c24');
  rect(g,bx-2,by-11,bw+4,3,'#241a17');
  for(let f=0;f<4;f++){
    const yy=by+8+f*30;
    for(let cl=0;cl<8;cl++){
      const xx2=bx+12+cl*29;
      const lit = f===3? (cl%3!==1) : (rnd()<.6);
      rect(g,xx2,yy,10,14, lit? P.win : P.winOff);
      rect(g,xx2,yy,10,2, lit? '#ffe0a8' : '#242a33');
      rect(g,xx2+5,yy,1,14,'#2a1d18'); rect(g,xx2,yy+7,10,1,'#2a1d18');
    }
  }
  // 正门与门灯
  rect(g,bx+bw/2-20,by+bh-28,40,28,'#241a17');
  rect(g,bx+bw/2-17,by+bh-25,34,25,'#3a2a22');
  rect(g,bx+bw/2-13,by+bh-22,26,22,'#0f0c0a');
  rect(g,bx+bw/2-2,by+bh-28,4,28,'#2a1d18');
  px(g,bx+bw/2-22,by+bh-24,'#ffd9a0'); px(g,bx+bw/2+21,by+bh-24,'#ffd9a0');
  // 横幅
  const banX=bx+14, banY=by-32;
  rect(g,banX,banY,bw-28,16,P.red);
  rect(g,banX,banY,bw-28,1,P.redHi);
  rect(g,banX,banY+15,bw-28,1,'#6a1b16');
  for(let i=0;i<9;i++) rect(g,banX+10+i*23,banY+4,13,7,'#efe3c8');
  // 台阶
  for(let s=0;s<3;s++) rect(g,bx+bw/2-28+s*2,by+bh+s*3,56-s*4,3,'#1f252d');
  // 旗
  rect(g,bx+bw-16,by-58,2,48,'#2a3038');
  rect(g,bx+bw-14,by-58,15,9,P.blue); rect(g,bx+bw-14,by-58,15,1,'#6d8fc4');

  // 人群
  for(let i=0;i<250;i++){
    const cy=238+rnd()*32, cx=104+rnd()*440;
    const sc=.62+(cy-238)/44;
    const hh=Math.round(6*sc), ww=Math.max(2,Math.round(3*sc));
    rect(g,cx,cy,ww,hh,'#141a23');
    rect(g,cx,cy-hh,ww,Math.max(3,ww), rnd()<.2? P.skin : '#1d2530');
    rect(g,cx,cy,ww,1,'#2a3442');
  }
  for(let i=0;i<18;i++){ const cx=118+rnd()*400, cy=240+rnd()*26; px(g,cx,cy,'#f2a33a'); px(g,cx,cy-1,'#ffe0a8'); }

  // 门灯
  glow(g,bx+bw/2,by+bh+10,90,'242,163,58',.17);
  glow(g,bx+bw/2,by+64,150,'242,190,120',.07);

  // 封锁线与岗亭
  for(let xx=44;xx<600;xx+=6){ if(xx%18<11){ rect(g,xx,232,5,1,P.cordon2); rect(g,xx,233,5,1,'#243248'); } }
  rect(g,556,196,30,38,'#1a2028'); frame(g,556,196,30,38,'#2b3340');
  rect(g,561,204,10,8,P.win2); rect(g,565,218,7,10,'#2a1d18');
  rect(g,552,192,38,5,'#232b34');

  // 前景路障
  for(let i=0;i<9;i++){
    const cx=12+i*72;
    rect(g,cx,274,32,8,'#1e242c'); frame(g,cx,274,32,8,'#2b3441');
    rect(g,cx+2,275,28,1,'#39485a');
    rect(g,cx+11,282,5,12,'#11161c'); rect(g,cx+17,282,5,12,'#11161c');
  }
  for(let i=0;i<6;i++){
    const cx=52+i*104;
    rect(g,cx,264,3,12,'#3f2c22'); rect(g,cx-1,263,5,3,'#d8503f'); rect(g,cx-1,268,5,3,'#d8503f');
  }

  // 底部压暗
  rect(g,0,292,W,68,'#05070a');
  const vg=g.createLinearGradient(0,240,0,H);
  vg.addColorStop(0,'rgba(5,6,8,0)'); vg.addColorStop(.42,'rgba(5,6,8,.45)'); vg.addColorStop(1,'rgba(4,5,7,.96)');
  g.fillStyle=vg; g.fillRect(0,240,W,120);
}
/* ══════════ 地图 440×260 ══════════ */
function drawMapBase(){
  const cv=document.getElementById('map-c'); if(!cv) return null;
  cv.width=440; cv.height=260;
  const g=cv.getContext('2d'); const W=440,H=260;
  const rnd=RNG(93);
  rect(g,0,0,W,H,P.ground); dithFill(g,0,0,W,H,P.ground2,.5);
  for(let x=0;x<W;x+=20) rect(g,x,0,1,H,'#141922');
  for(let y=0;y<H;y+=20) rect(g,0,y,W,1,'#141922');

  // 校区围墙
  frame(g,20,20,W-40,H-40,'#252c36');
  frame(g,22,22,W-44,H-44,'#12161c');
  // 北门 / 南门
  rect(g,204,20,16,3,'#2b3441'); rect(g,204,H-23,16,3,'#2b3441');

  // 主干道
  rect(g,0,72,W,8,P.road); rect(g,0,72,W,1,P.roadHi); rect(g,0,79,W,1,'#232b35');
  rect(g,196,0,8,H,P.road); rect(g,196,0,1,H,P.roadHi); rect(g,203,0,1,H,'#232b35');
  // 支路
  rect(g,60,80,3,64,P.road2); rect(g,290,80,3,58,P.road2);
  rect(g,74,150,118,3,P.road2); rect(g,204,150,86,3,P.road2);
  rect(g,24,178,32,3,P.road2); rect(g,208,206,58,3,P.road2);

  // 大操场（左下）
  rect(g,84,166,124,76,P.park);
  rect(g,88,170,116,68,P.park2);
  frame(g,88,170,116,68,'#26362a');
  for(let yy=178;yy<236;yy+=8) rect(g,92,yy,108,1,'#1e2d22');
  g.strokeStyle='#3a2b28'; g.lineWidth=1;
  g.beginPath(); g.ellipse(146,204,48,26,0,0,Math.PI*2); g.stroke();
  g.beginPath(); g.ellipse(146,204,40,20,0,0,Math.PI*2); g.stroke();
  rect(g,92,166,108,5,'#232b34'); // 看台
  for(let i=0;i<18;i++) px(g,96+i*6,167,'#313a45');

  // 东湖（右上）
  rect(g,326,96,92,36,P.water);
  rect(g,328,98,88,32,P.water2);
  for(let i=0;i<50;i++) px(g,330+rnd()*84,100+rnd()*28,'#2d5170');
  frame(g,326,96,92,36,'#2a3a48');

  // 停车场（右下）
  rect(g,296,176,84,26,'#1a2028'); frame(g,296,176,84,26,'#242c36');
  for(let i=0;i<7;i++) rect(g,300+i*11,180,8,14,rnd()<.5?'#2a3341':'#313b4b');
  for(let i=0;i<7;i++) rect(g,300+i*11,194,8,2,'#141a21');

  // 填充建筑
  building(g,36,102,26,18,{floors:2,lit:.45,rnd:RNG(21)});          // 图书馆
  building(g,104,38,44,20,{floors:2,lit:.5,rnd:RNG(22)});           // 教学楼
  building(g,270,40,34,18,{floors:2,lit:.45,rnd:RNG(23)});          // 实验楼
  building(g,316,38,30,16,{floors:2,lit:.4,rnd:RNG(24)});           // 办公楼
  building(g,34,196,28,18,{floors:2,lit:.55,rnd:RNG(25)});          // 食堂
  building(g,30,144,18,14,{floors:2,lit:.4,rnd:RNG(26)});           // 宿舍1
  building(g,52,214,30,16,{floors:3,lit:.5,rnd:RNG(27)});           // 宿舍2
  building(g,214,214,32,16,{floors:2,lit:.5,rnd:RNG(28)});          // 体育馆
  building(g,376,206,26,14,{floors:2,lit:.35,rnd:RNG(29)});         // 后勤

  // 主要地点
  const B=(loc,w,h,opt)=>{ const p={x:loc.x/2,y:loc.y/2}; building(g,p.x-w/2,p.y-h/2,w,h,opt); return p; };
  const pTy=B(LOC[0],54,42,{floors:4,lit:.62,door:1,base:'#3a2622',roof:'#2a201c',rnd:RNG(11)});
  rect(g,pTy.x-22,pTy.y+21,44,4,'#242a32');
  frame(g,pTy.x-26,pTy.y-25,52,50,'#2a2320');   // 桃园围墙
  const pBx=B(LOC[1],38,24,{floors:3,lit:.5,rnd:RNG(12)});
  const pAb=B(LOC[2],34,22,{floors:2,lit:.45,rnd:RNG(13)});
  const pBw=B(LOC[3],32,24,{floors:3,lit:.55,rnd:RNG(14)});
  const pXs=B(LOC[5],32,22,{floors:2,lit:.4,rnd:RNG(15)});
  const pDs=B(LOC[6],58,46,{floors:4,lit:.72,base:'#2a2228',roof:'#211a20',rnd:RNG(16)});
  const pRm=B(LOC[7],26,44,{floors:5,lit:.8,rnd:RNG(17)});
  rect(g,pRm.x,pRm.y-30,2,10,'#2b3441'); px(g,pRm.x,pRm.y-32,P.red);

  // 树与绿篱
  for(let i=0;i<90;i++){
    const tx=24+rnd()*392, ty=24+rnd()*212;
    if(tx>84&&tx<210&&ty>164&&ty<244) continue;
    if(tx>320&&tx<424&&ty>92&&ty<136) continue;
    if(Math.abs(tx-220)<10||Math.abs(ty-76)<10) continue;
    rect(g,tx,ty-2,1,2,'#1a2418');
    rect(g,tx-2,ty-5,5,4, rnd()<.5?P.tree:P.tree2);
  }
  // 路名牌
  rect(g,300,120,26,8,'#141920');
  return g;
}

function drawMapDynamic(selId, state){
  const cv=document.getElementById('map-c'); if(!cv) return;
  const g=drawMapBase(); if(!g) return;
  const rnd=RNG(7);
  const arm=state? state.arm:42, pub=state? state.pub:30;

  // 操场上的人
  const n=Math.round(6+pub*1.5);
  for(let i=0;i<n;i++){
    const a=rnd()*Math.PI*2, r=Math.sqrt(rnd());
    const cx=146+Math.cos(a)*r*44, cy=204+Math.sin(a)*r*22;
    rect(g,cx,cy,1,2,'#2b3440'); px(g,cx,cy-2,'#3d4a58');
  }
  // 桃园门口
  for(let i=0;i<Math.min(34,4+pub/4);i++){
    const cx=150+(rnd()*26-13), cy=139+rnd()*8;
    rect(g,cx,cy,1,2,'#313b47');
  }
  // 保安封锁线
  const lines=arm>=58?3:arm>=45?2:1;
  for(let k=0;k<lines;k++){
    const yy=152+k*7;
    for(let xx=112;xx<200;xx+=4){ if((xx+k*3)%12<7) rect(g,xx,yy,3,1,P.cordon2); }
  }
  // 集结中的保安
  const cops=Math.round(2+arm/12);
  for(let i=0;i<cops;i++){
    const cx=214+rnd()*12, cy=120+rnd()*12;
    rect(g,cx,cy,1,3,'#3a4250'); px(g,cx,cy-2,'#5a6472');
  }
  // 选中
  const loc=LOC.find(l=>l.id===selId);
  if(loc){
    const p={x:loc.x/2,y:loc.y/2};
    g.strokeStyle='#f2a33a'; g.setLineDash([2,2]);
    g.strokeRect(Math.round(p.x-32),Math.round(p.y-32),64,64);
    g.setLineDash([]);
  }
}

/* ══════════ 桃园剖面 380×262 ══════════ */
/* 楼内派系按楼层从高到低排成行；drawFloor 和界面标签共用这份几何 */
function floorRows(st){
  st=st||{};
  const inside=FR.filter(f=>((st.fl? st.fl[f.id]:f.floor)>=0))
    .sort((a,b)=>((st.fl?st.fl[b.id]:b.floor)-(st.fl?st.fl[a.id]:a.floor)));
  const by=22, bh=178, n=Math.max(1,inside.length), rowH=Math.floor((bh-6)/n);
  return inside.map((f,i)=>{
    const fl=(st.fl? st.fl[f.id]:f.floor);
    return { id:f.id, f, y:by+3+i*rowH, h:rowH-3, tag:(fl===0?'B1':fl+'F') };
  });
}

function drawFloor(state, selFaction){
  const cv=document.getElementById('floor-c'); if(!cv) return;
  const W=380,H=262; cv.width=W; cv.height=H;
  const g=cv.getContext('2d'); const rnd=RNG(5);
  rect(g,0,0,W,H,'#0c0f13');
  dithFill(g,0,0,W,H,'#101419',.35);

  // 夜空
  rect(g,0,0,W,26,'#090b0f');
  for(let i=0;i<44;i++) px(g,90+rnd()*280,rnd()*24, rnd()<.3?'#2a3038':'#1a1f26');

  const bx=84, by=22, bw=272, bh=178;
  // 楼体
  rect(g,bx-6,by-7,bw+12,7,'#241a17');
  rect(g,bx,by,bw,bh,P.brickLo);
  frame(g,bx,by,bw,bh,'#1a1211');
  for(let yy=by;yy<by+bh;yy+=3) rect(g,bx,yy,bw,1,(yy%6===0)?P.brick:'#2d1d19');

  const st=state||{};
  const rows=floorRows(st);
  rows.forEach((r,i)=>{
    const f=r.f;
    const loy=st.fac? st.fac[f.id]:f.loy;
    const cnt=st.cnt? st.cnt[f.id]:f.n;
    rect(g,bx+2,r.y-2,bw-4,2,'#241a17');
    rect(g,bx,r.y+r.h,bw,2,'#241a17');
    const rooms=3, rw=(bw-10)/rooms;
    for(let r2=0;r2<rooms;r2++){
      const rx=bx+4+r2*rw;
      rect(g,rx,r.y+1,rw-3,r.h-2,'#161b22');
      frame(g,rx,r.y+1,rw-3,r.h-2,'#1f161a');
      const lit=((r2*29+i*23)%100) < loy;
      if(!lit) continue;
      rect(g,rx+2,r.y+3,rw-7,r.h-8,'#1b2029');
      // 灯
      px(g,rx+rw/2-1,r.y+2,P.win);
      glow(g,rx+rw/2,r.y+8,26,'242,198,122',.12);
      // 桌椅
      const desks=Math.min(2,1+Math.round(cnt/60));
      for(let d2=0;d2<desks;d2++){
        const dx=rx+5+d2*Math.max(12,Math.floor((rw-14)/2));
        rect(g,dx,r.y+Math.floor(r.h/2)+3,10,2,'#2a313c');
        rect(g,dx+1,r.y+Math.floor(r.h/2)+5,8,1,'#20262e');
      }
      // 人
      const pn=Math.min(5,Math.round(cnt/22));
      for(let p2=0;p2<pn;p2++){
        const qx=rx+4+((p2*9)%Math.max(6,rw-10)), qy=r.y+5+((p2%2)*4);
        rect(g,qx,qy,3,4,'#28303b');
        rect(g,qx,qy-3,3,3, rnd()<.3? P.skin : '#333d49');
      }
    }
    // 标签连线
    rect(g,82,r.y+r.h/2,2,1,'#3a4450');
  });

  // 楼梯
  rect(g,bx+bw-16,by+2,12,bh-4,'#141920');
  for(let yy=by+6;yy<by+bh-6;yy+=5) rect(g,bx+bw-14,yy,8,1,'#232a34');
  rect(g,bx+bw-10,by+2,3,bh-4,'#1d242e');

  // 楼顶：旗 + 喇叭
  rect(g,bx+bw/2-26,by-24,1,17,'#2a3038');
  rect(g,bx+bw/2-25,by-24,12,7,P.blue);
  rect(g,bx+bw/2+22,by-16,14,7,'#1e242c'); rect(g,bx+bw/2+24,by-14,10,3,'#2b3441');
  for(let i=0;i<3;i++) rect(g,bx+bw/2+36+i*3,by-15-i,2,2,'#3a4450');

  // 地面 + 楼外的人
  rect(g,0,H-40,W,40,'#0d1015');
  dithFill(g,0,H-40,W,40,'#111519',.35);
  const outside=FR.filter(f=>((st.fl? st.fl[f.id]:f.floor)<0));
  const outN=outside.reduce((a,f)=>a+(st.cnt? st.cnt[f.id]:f.n),0);
  const mob=Math.min(90, Math.round(outN/2));
  for(let i=0;i<mob;i++){
    const cx=96+rnd()*250, cy=H-30+rnd()*22;
    const hh=3+Math.round(rnd()*3);
    rect(g,cx,cy,2,hh,'#31404f'); px(g,cx,cy-2, rnd()<.3?P.skin:'#333d49');
  }
  // 封锁线
  for(let xx=80;xx<W-10;xx+=5){ if(xx%15<9) rect(g,xx,H-42,4,1,P.cordon2); }

  // 选中高亮
  if(selFaction){
    const r=rows.find(x=>x.id===selFaction);
    if(r){
      g.strokeStyle='#f2a33a'; g.setLineDash([3,2]);
      g.strokeRect(bx+2,r.y-2, bw-4, r.h+4);
      g.setLineDash([]);
    }
  }
}
/* ══════════ 强攻 380×316 ══════════ */
function drawAssault(st){
  const cv=document.getElementById('assault-c'); if(!cv) return;
  const W=380,H=316; cv.width=W; cv.height=H;
  const g=cv.getContext('2d'); const rnd=RNG(st? st.wave*13+3:3);
  rect(g,0,0,W,H,'#090c10');
  const sky=g.createLinearGradient(0,0,0,180);
  sky.addColorStop(0,'#08090c'); sky.addColorStop(.6,'#0d0f14'); sky.addColorStop(1,'#1a1216');
  g.fillStyle=sky; g.fillRect(0,0,W,180);
  dithFill(g,0,0,W,160,'#0f1116',.3);
  glow(g,300,120,140,'216,80,63',.14);

  rect(g,0,196,W,120,'#0c0f13');
  dithFill(g,0,196,W,120,'#101419',.4);
  for(let x=0;x<W;x+=14) rect(g,x,196,1,120,'#141a21');

  const bx=96, by=48, bw=200, bh=140;
  rect(g,bx,by,bw,bh,P.brickLo);
  frame(g,bx,by,bw,bh,'#1a1211');
  for(let yy=by;yy<by+bh;yy+=3) rect(g,bx,yy,bw,1,(yy%6===0)?P.brick:'#2d1d19');
  rect(g,bx-6,by-8,bw+12,8,'#241a17');
  rect(g,bx-6,by-8,bw+12,1,'#3a2a22');
  for(let f=0;f<3;f++) for(let cl=0;cl<7;cl++){
    const xx=bx+12+cl*27, yy=by+12+f*40;
    const lit=rnd()<.55;
    rect(g,xx,yy,11,16, lit?P.win:P.winOff);
    rect(g,xx,yy,11,2, lit?'#ffe0a8':'#2a2118');
    rect(g,xx+5,yy,1,16,'#2a1d18');
  }
  // 正门 + 工事
  rect(g,bx+bw/2-20,by+bh-30,40,30,'#241a17');
  rect(g,bx+bw/2-16,by+bh-27,32,27,'#0f0c0a');
  for(let i=0;i<5;i++) rect(g,bx+bw/2-26+i*11,by+bh+2,10,7,'#3a3026');
  for(let i=0;i<4;i++) rect(g,bx+bw/2-21+i*11,by+bh+9,10,7,'#2e261e');
  // 台阶
  rect(g,bx+bw/2-30,by+bh,60,3,'#1f252d');

  // 三处防守点
  const marks=[
    {x:bx+bw/2, y:by+bh+6, n:'正门'},
    {x:bx+bw-6, y:by+90, n:'东侧梯'},
    {x:bx+bw-26,y:by+10, n:'广播室'}
  ];
  if(st&&st.def){
    st.def.forEach((d,i)=>{
      const m=marks[i];
      for(let k=0;k<d;k++){
        const cx=m.x+((k%5)-2)*4, cy=m.y+((k/5)|0)*5-8;
        rect(g,cx,cy,2,3,P.cordon); px(g,cx,cy-2,'#cfe0f5');
      }
    });
  }
  // 攻方
  const atk=14+(st?st.wave*12:12);
  for(let k=0;k<atk;k++){
    const cx=10+rnd()*(W-20), cy=210+rnd()*60;
    rect(g,cx,cy,2,4,'#8a2f26'); px(g,cx,cy-2,'#d0583a');
    if(rnd()<.3) rect(g,cx-3,cy+1,3,1,'#5a1f1a');
  }
  // 探照灯
  if(st&&st.wave>=2){
    g.fillStyle='rgba(255,230,180,.06)';
    g.beginPath(); g.moveTo(352,36); g.lineTo(250,196); g.lineTo(372,196); g.closePath(); g.fill();
  }
  // 路灯
  for(const lx of [24,352]){
    rect(g,lx,184,2,112,'#242c36');
    rect(g,lx-6,180,14,4,'#2b3441'); rect(g,lx-4,184,10,2,'#ffe0a8');
    glow(g,lx+1,186,70,'255,224,170',.14);
  }
  // 前景：混凝土块与锥筒
  for(let i=0;i<7;i++){
    const cx=6+i*56;
    rect(g,cx,272,36,14,'#1d242d'); frame(g,cx,272,36,14,'#2b3441');
    rect(g,cx+1,273,34,1,'#39485a');
    rect(g,cx+2,278,32,2,'#0f1319');
    if(i%2===0){ rect(g,cx+3,282,6,3,'#c9a25a'); rect(g,cx+21,282,6,3,'#c9a25a'); }
  }
  // 一辆停着的车
  rect(g,300,246,54,18,'#151b23'); frame(g,300,246,54,18,'#242c36');
  rect(g,308,236,38,12,'#151b23'); frame(g,308,236,38,12,'#242c36');
  rect(g,312,240,16,6,'#1e2a36'); rect(g,332,240,12,6,'#1e2a36');
  rect(g,306,262,10,5,'#0d1116'); rect(g,338,262,10,5,'#0d1116');
  // 前景压暗
  const vg=g.createLinearGradient(0,250,0,H);
  vg.addColorStop(0,'rgba(5,6,8,0)'); vg.addColorStop(1,'rgba(5,6,8,.75)');
  g.fillStyle=vg; g.fillRect(0,250,W,66);
}

/* ══════════ 事件插画 320×360 ══════════ */
function drawEvent(scene){
  const cv=document.getElementById('event-c'); if(!cv) return;
  const W=320,H=360; cv.width=W; cv.height=H;
  const g=cv.getContext('2d'); const rnd=RNG((scene||'x').length*37+11);
  rect(g,0,0,W,H,'#0b0c0f');
  const sky=g.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#08090c'); sky.addColorStop(.5,'#0c0f14'); sky.addColorStop(1,'#0f1318');
  g.fillStyle=sky; g.fillRect(0,0,W,H);
  for(let i=0;i<60;i++) px(g,rnd()*W,rnd()*140, rnd()<.3?'#2a3038':'#1a1f26');
  const S=scene||'night';

  if(S==='order'){
    rect(g,0,250,W,110,'#0e1116'); dithFill(g,0,250,W,110,'#12161c',.4);
    rect(g,0,56,W,194,'#171c24'); frame(g,0,56,W,194,'#0f1318');
    for(let y=66;y<250;y+=4) rect(g,0,y,W,1,'#141922');
    rect(g,112,84,96,166,'#241a17'); frame(g,112,84,96,166,'#3a2622');
    rect(g,120,94,80,64,'#2d1d19');
    rect(g,126,104,68,96,'#e8dcc0'); rect(g,126,104,68,1,'#ffffff');
    rect(g,132,112,24,4,'#b3322b');
    for(let i=0;i<7;i++) rect(g,132,124+i*10,52-(i%3)*7,2,'#3a3a38');
    px(g,160,108,P.red);
    rect(g,40,46,20,4,'#2b3441'); glow(g,50,54,90,'242,230,200',.16);
  }
  else if(S==='black'){
    rect(g,0,60,40,300,'#0a0c10'); rect(g,280,60,40,300,'#0a0c10');
    rect(g,40,52,240,308,'#0d1014'); frame(g,40,52,240,308,'#151a21');
    for(let i=0;i<6;i++){ const x=52+i*38; rect(g,x,90,24,140,'#0b0e12'); frame(g,x,90,24,140,'#12161c'); }
    // 人（剪影）
    for(let i=0;i<7;i++){
      const x=48+rnd()*220, y=246+rnd()*10, hh=46+rnd()*20;
      rect(g,x,y,14,hh,'#06080b'); rect(g,x+3,y-12,8,12,'#06080b');
    }
    rect(g,150,286,5,20,'#c9a25a'); px(g,152,284,'#ffe0a8'); px(g,153,282,'#fff0c8');
    glow(g,153,286,110,'242,200,120',.26);
  }
  else if(S==='guard'){
    rect(g,0,246,W,114,'#0e1116'); dithFill(g,0,246,W,114,'#12161c',.4);
    // 岗亭
    rect(g,206,120,86,126,'#1a2028'); frame(g,206,120,86,126,'#2b3340');
    rect(g,216,130,66,58,'#151a22');
    rect(g,216,198,66,40,'#0d1014');
    rect(g,236,192,22,46,'#241a17');
    rect(g,196,116,106,5,'#232b34');
    // 两个保安
    for(const [x,y] of [[112,212],[76,226]]){
      rect(g,x,y,16,44,'#2a3444');
      rect(g,x+2,y-16,12,16,P.skin);
      rect(g,x+1,y-21,14,6,'#1b2430');
      rect(g,x+2,y+44,6,20,'#222b38'); rect(g,x+9,y+44,6,20,'#222b38');
      rect(g,x+16,y+12,3,16,'#3a4453');
      rect(g,x+3,y+8,10,12,'#313d4e');
    }
    // 校门
    rect(g,0,240,64,7,'#2a3038'); rect(g,0,247,18,60,'#2a3038'); rect(g,44,247,18,60,'#2a3038');
    glow(g,250,200,50,'242,198,122',.12);
  }
  else if(S==='crowd'){
    rect(g,0,0,W,150,'#0a0d11');
    rect(g,26,18,268,132,P.brickLo); frame(g,26,18,268,132,'#1a1211');
    for(let f=0;f<3;f++) for(let cl=0;cl<9;cl++){
      const xx=40+cl*27, yy=30+f*40;
      rect(g,xx,yy,11,16, rnd()<.6?P.win:P.winOff);
      rect(g,xx,yy,11,2,'#ffe0a8');
    }
    rect(g,0,150,W,210,'#10141a');
    for(let yy=150;yy<250;yy+=6) rect(g,0,yy,W,1,'#151a21');
    for(let i=0;i<150;i++){
      const cy=196+rnd()*164, cx=rnd()*W, sc=cy/360;
      const hh=Math.max(6,Math.round(22*sc)), ww=Math.max(3,Math.round(9*sc));
      rect(g,cx,cy,ww,hh,'#1d242e');
      rect(g,cx+1,cy-hh,ww,Math.max(3,Math.round(7*sc)), rnd()<.25? P.skin : '#242b35');
    }
    for(let i=0;i<26;i++){ const x=rnd()*W,y=200+rnd()*140; px(g,x,y,P.fire); }
    glow(g,160,160,120,'242,198,122',.10);
  }
  else if(S==='phone'){
    // 夜里的办公室：窗前一个人，手里一块亮屏
    rect(g,0,0,W,H,'#11161e');
    dithFill(g,0,0,W,H,'#0f141b',.4);
    // 窗
    rect(g,18,44,116,150,'#0a0f15'); frame(g,18,44,116,150,'#26303c');
    rect(g,22,48,108,142,'#16222e');
    for(let i=0;i<3;i++) rect(g,22,48+i*47,108,2,'#26303c');
    rect(g,74,48,2,142,'#26303c');
    // 窗外的雨
    for(let i=0;i<46;i++){ const x=24+rnd()*104, y=50+rnd()*138; rect(g,x,y,1,3,'#2f4256'); }
    // 背后的一盏灯，把人和窗分开
    glow(g,236,34,150,'242,198,122',.08);
    // 光晕（在人物身后）
    glow(g,212,196,130,'150,190,235',.18);
    // 人影
    rect(g,182,152,60,84,'#07090d');           // 躯干
    rect(g,176,148,72,9,'#07090d');            // 肩
    rect(g,210,140,8,10,'#07090d');            // 脖子
    rect(g,200,112,28,30,'#07090d');           // 头
    rect(g,196,108,36,6,'#07090d');            // 头发
    rect(g,238,172,18,9,'#07090d');            // 手臂
    // 手机
    rect(g,244,148,20,34,'#0d1218'); frame(g,244,148,20,34,'#39485a');
    rect(g,246,152,16,26,'#cfe0f5');
    rect(g,248,155,11,2,'#4f74a8'); rect(g,248,160,8,2,'#7fa0cf'); rect(g,248,165,10,2,'#4f74a8');
    glow(g,254,164,64,'190,220,255',.22);
    // 桌沿
    rect(g,0,300,W,60,'#0a0d11');
    rect(g,0,300,W,2,'#1d2530');
    for(let i=0;i<26;i++) rect(g,rnd()*W,306+rnd()*48,2,3,'#0e1218');
  }
  else if(S==='paper'){
    rect(g,0,188,W,172,'#12100e'); rect(g,0,188,W,2,'#2a201c');
    // 吊灯
    rect(g,250,0,2,118,'#1e242c');
    rect(g,236,118,30,2,'#2b3441');
    rect(g,240,120,22,3,'#2b3441');
    rect(g,244,123,14,3,'#2b3441');
    rect(g,248,126,6,2,'#7a6a4a');
    glow(g,251,130,130,'242,200,120',.22);
    // 背景书架
    rect(g,18,64,64,104,'#0f141b'); frame(g,18,64,64,104,'#1a2029');
    for(let i=0;i<3;i++){
      rect(g,20,88+i*30,60,2,'#181f28');
      for(let b=0;b<7;b++) rect(g,22+b*8,72+i*30,5,16, rnd()<.5?'#241d16':'#1d242c');
    }
    rect(g,66,204,156,94,'#e8dcc0'); rect(g,70,208,148,86,'#f1e7cf');
    // 茶杯
    rect(g,236,236,16,14,'#cfc4a8'); rect(g,238,238,12,5,'#2a2118');
    rect(g,252,240,4,7,'#cfc4a8');
    rect(g,76,214,46,3,'#b3322b');
    for(let i=0;i<8;i++) rect(g,76,224+i*9,124-(i%3)*11,2,'#3a3a38');
    rect(g,180,290,34,6,'#2a2118');
    rect(g,198,272,4,22,'#c9a25a');
    rect(g,0,300,W,60,'#0e0c0a');
  }
  else if(S==='press'){
    rect(g,0,240,W,120,'#0e1116');
    rect(g,104,40,112,200,'#171c24'); frame(g,104,40,112,200,'#0f1318');
    rect(g,112,120,96,120,'#0d1014');
    for(const [x,y] of [[44,208],[244,204]]){
      rect(g,x+8,y,3,64,'#2b3441'); rect(g,x,y+60,20,4,'#2b3441');
      rect(g,x-2,y-22,24,22,'#1b2029'); rect(g,x+4,y-18,14,10,'#2b3441');
      rect(g,x-4,y-20,8,6,'#3a4453'); px(g,x-6,y-18,'#e0745a');
    }
    for(const [x,y] of [[112,212],[196,218]]){
      rect(g,x,y,16,40,'#232a35'); rect(g,x+3,y-16,10,16,P.skin); rect(g,x+2,y-21,12,6,'#1b2430');
    }
    glow(g,40,186,70,'255,255,255',.30);
  }
  else if(S==='food'){
    rect(g,0,228,W,132,'#0e1116'); dithFill(g,0,228,W,132,'#12161c',.4);
    rect(g,86,198,154,42,'#1b2029'); frame(g,86,198,154,42,'#2b3441');
    rect(g,104,176,28,26,'#2a3444'); rect(g,156,170,30,32,'#2a3444');
    for(let i=0;i<22;i++){ const x=108+rnd()*76, y=168-rnd()*64; px(g,x,y,'#3a4450'); }
    rect(g,100,240,14,14,'#14181f'); rect(g,212,240,14,14,'#14181f');
    rect(g,52,192,16,44,'#232a35'); rect(g,54,176,11,16,P.skin); rect(g,53,171,13,6,'#1b2430');
    glow(g,108,180,60,'242,200,120',.10);
  }
  else if(S==='door'){
    rect(g,0,110,W,250,'#0e1116');
    rect(g,36,52,248,308,'#171c24'); frame(g,36,52,248,308,'#0f1318');
    rect(g,68,84,184,276,'#0a0d11');
    for(let x=72;x<256;x+=10) rect(g,x,84,3,276,'#2f3641');
    for(let y=100;y<340;y+=40) rect(g,68,y,184,3,'#2f3641');
    rect(g,150,236,18,40,'#232a35'); rect(g,154,220,11,16,P.skin); rect(g,153,215,13,6,'#1b2430');
    glow(g,158,250,120,'242,200,120',.14);
  }
  else {
    rect(g,0,150,W,210,'#0e1116');
    rect(g,56,46,208,116,P.brickLo); frame(g,56,46,208,116,'#1a1211');
    for(let f=0;f<3;f++) for(let cl=0;cl<7;cl++){
      const xx=68+cl*27, yy=58+f*36;
      rect(g,xx,yy,11,16, rnd()<.6?P.win:P.winOff);
      rect(g,xx,yy,11,2,'#ffe0a8');
    }
    for(let i=0;i<50;i++){ const x=rnd()*W,y=230+rnd()*110; rect(g,x,y,1,3,'#1d242e'); }
    glow(g,160,110,170,'242,163,58',.15);
  }

  // 前景压暗 + 扫描线
  const vg=g.createLinearGradient(0,250,0,H);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.75)');
  g.fillStyle=vg; g.fillRect(0,250,W,110);
  for(let y=0;y<H;y+=4) rect(g,0,y,W,1,'rgba(0,0,0,.16)');
}
