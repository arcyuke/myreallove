/* Отрисовка новых карт. Геометрия стен совпадает с игровой логикой. */
(() => {
 'use strict';
 const {FOOD,W,H}=window.LoveAdventures;
 function background(ctx,images,index){const im=images.adventureWorlds,cw=im.width/3,ch=im.height/4;ctx.drawImage(im,index%3*cw,Math.floor(index/3)*ch,cw,ch,0,0,W,H);}
 function draw(ctx,q,images,time,helpers){
  const {text,heart,shadow,heroSprite,enemySprite}=helpers;
  background(ctx,images,q.level.world);ctx.fillStyle='#15112424';ctx.fillRect(0,0,W,H);
  const color=id=>id===0?'#ffe0a0':'#ffa6cf';
  function label(s,x,y,size=17,c='#fff0e5'){text(s,x,y,size,c);}
  function plate(x,y,c,active=false,labelText=''){
   ctx.fillStyle='#161225a8';ctx.fillRect(x-30,y-18,60,40);ctx.fillStyle=active?c:'#584856';ctx.fillRect(x-26,y-18,52,32);
   ctx.strokeStyle=c;ctx.lineWidth=3;ctx.strokeRect(x-26,y-18,52,32);if(active){ctx.fillStyle=c+'66';ctx.fillRect(x-34,y-24,68,46);}
   if(labelText)label(labelText,x,y+6,18,active?'#302035':'#fff2d6');
  }
  function exit(p,ready=true){
   ctx.fillStyle=ready?'#d297bb44':'#301e36aa';ctx.fillRect(p.x-31,p.y-45,62,63);ctx.strokeStyle=ready?'#ffd1e4':'#aa7a96';ctx.lineWidth=3;ctx.strokeRect(p.x-31,p.y-45,62,63);
   heart(p.x,p.y-26,20,ready?'#ffd6e6':'#976b88');label(ready?'ВДВОЁМ СЮДА':'ВСТРЕТИМСЯ ЗДЕСЬ',p.x,p.y+41,13);
  }
  function gear(x,y,c,size=15){ctx.save();ctx.translate(x,y);ctx.rotate(time*.4);ctx.fillStyle=c;for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.fillRect(-5,-size-4,10,10);}ctx.beginPath();ctx.arc(0,0,size,0,7);ctx.fill();ctx.fillStyle='#372634';ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.fill();ctx.restore();}
  function star(x,y,c){ctx.save();ctx.translate(x,y);ctx.fillStyle=c;ctx.beginPath();for(let i=0;i<10;i++){const r=i%2?7:16,a=i*Math.PI/5-Math.PI/2;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.restore();}
  function paw(x,y,c='#ffe5bf'){ctx.fillStyle=c;ctx.fillRect(x-8,y-2,16,13);for(let i=0;i<3;i++)ctx.fillRect(x-13+i*10,y-13+(i===1?-3:0),7,8);}
  function dog(d){const index=d.moving?Math.floor(time*7)%4:5,s=images.lucky[index],height=50,width=height*s.w/s.h;shadow(d.x,d.y,23);ctx.save();ctx.translate(d.x,d.y);ctx.scale(d.face||1,1);ctx.drawImage(s.im,s.x,s.y,s.w,s.h,-width/2,-height,width,height);ctx.restore();label('ЛАКИ',d.x,d.y-height-8,13,'#ffe2aa');}
  function food(item,x,y,scale=1){
   if(!item)return;const id=typeof item==='string'?item:item.food;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#24192aaa';ctx.fillRect(-16,-16,32,32);
   if(id==='tomato'){ctx.fillStyle='#e86c63';ctx.fillRect(-11,-8,22,18);ctx.fillRect(-7,-12,14,25);ctx.fillStyle='#75a36b';ctx.fillRect(-3,-15,6,8);}
   else if(id==='cheese'||id==='pizza'){ctx.fillStyle='#f4cc7e';ctx.beginPath();ctx.moveTo(-14,-12);ctx.lineTo(14,-12);ctx.lineTo(0,14);ctx.closePath();ctx.fill();ctx.fillStyle=id==='pizza'?'#d8745b':'#c89a53';for(const [x,y] of [[-7,-7],[5,-5],[0,4]])ctx.fillRect(x,y,5,5);}
   else if(id==='fish'||id==='shrimp'){ctx.fillStyle='#f4ab92';ctx.fillRect(-13,-6,22,13);ctx.fillRect(7,-10,6,20);ctx.fillStyle='#ffe2bd';ctx.fillRect(-5,-6,3,13);ctx.fillRect(2,-6,3,13);}
   else if(id==='coconut'){ctx.fillStyle='#f5e5c9';ctx.fillRect(-9,-12,18,25);ctx.fillStyle='#85aa93';ctx.fillRect(-9,-4,18,7);ctx.fillStyle='#e8cb9e';ctx.fillRect(-7,-16,14,4);}
   else if(id==='sushi'){ctx.fillStyle='#e6dec1';ctx.fillRect(-13,-9,26,21);ctx.fillStyle='#f69c84';ctx.fillRect(-14,-12,28,9);ctx.fillStyle='#3b584b';ctx.fillRect(-3,-12,6,24);}
   else if(id==='tomyam'){ctx.fillStyle='#fff0dd';ctx.fillRect(-14,-2,28,10);ctx.fillRect(-10,8,20,6);ctx.fillStyle='#ee9e60';ctx.fillRect(-13,-7,26,10);ctx.fillStyle='#69985e';ctx.fillRect(-4,-6,6,4);}
   else{ctx.fillStyle=id==='rice'?'#fff3dc':'#e9c58f';ctx.fillRect(-12,-8,24,17);ctx.fillRect(-8,-12,16,25);ctx.fillStyle='#ba9e74';ctx.fillRect(-5,-5,3,3);ctx.fillRect(4,2,3,3);}
   if(item.ready&&!item.meal&&!FOOD[id]?.ready){ctx.fillStyle='#c9e19f';ctx.fillRect(9,9,8,7);}
   ctx.restore();
  }
  function rect(a,base,top){ctx.fillStyle='#120f205e';ctx.fillRect(a.x+4,a.y+6,a.w,a.h);ctx.fillStyle=base;ctx.fillRect(a.x,a.y,a.w,a.h);ctx.fillStyle=top;ctx.fillRect(a.x,a.y,a.w,7);ctx.strokeStyle='#1d172852';ctx.lineWidth=2;ctx.strokeRect(a.x,a.y,a.w,a.h);}
  function car(p,c){
   shadow(p.x,p.y,24);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);ctx.fillStyle='#131724';ctx.fillRect(-18,-18,12,8);ctx.fillRect(9,-18,12,8);ctx.fillRect(-18,10,12,8);ctx.fillRect(9,10,12,8);
   ctx.fillStyle=c;ctx.fillRect(-24,-12,47,24);ctx.fillRect(-18,-15,30,30);ctx.fillStyle='#355779';ctx.fillRect(0,-10,10,20);ctx.fillStyle='#f3f5e5';ctx.fillRect(18,-10,7,5);ctx.fillRect(18,5,7,5);ctx.fillStyle='#ffe9d0';ctx.fillRect(-13,-4,7,8);
   if(p.dashTime>0){ctx.fillStyle='#ffbf65';ctx.fillRect(-35,-7,12+Math.sin(time*25)*5,14);ctx.fillStyle='#fff0b8';ctx.fillRect(-31,-3,7,6);}ctx.restore();
   label(p===q.rival?'СОПЕРНИК':p.id===0?'ОЛЕГ':'НАСТЯ',p.x,p.y-28,12,c);if(p.finished)label('ФИНИШ ♡',p.x,p.y+37,14);
  }
  if(q.kind==='maze'){
   const g=q.grid;ctx.fillStyle='#4a454ddd';ctx.fillRect(g.x,g.y,g.size*15,g.size*7);
   q.map.forEach((row,r)=>[...row].forEach((tile,c)=>{const x=g.x+c*g.size,y=g.y+r*g.size;if(tile==='#'){
    rect({x,y,w:g.size,h:g.size},'#274e47','#528575');ctx.fillStyle='#376657';ctx.fillRect(x+7,y+12,42,31);if((r+c)%3===0){ctx.fillStyle='#b27599';ctx.fillRect(x+18,y+17,5,5);ctx.fillRect(x+33,y+33,4,4);}
   }else{ctx.strokeStyle='#ddc6c316';ctx.strokeRect(x+1,y+1,54,54);}}));
   exit(q.exit,q.shards.every(s=>s.taken));for(const s of q.shards)if(!s.taken){heart(s.x,s.y-7+Math.sin(time*3)*3,25,color(s.owner));label(s.owner===0?'О':'Н',s.x,s.y+23,13,color(s.owner));}
  }
  if(q.kind==='rescue'){
   for(const a of q.walls){rect(a,'#315d3f','#72955b');ctx.fillStyle='#527b48';for(let i=12;i<a.w;i+=25)ctx.fillRect(a.x+i,a.y+12,12,12);}
   ctx.fillStyle='#f2b8be';ctx.fillRect(q.exit.x-52,q.exit.y-33,104,66);ctx.fillStyle='#fff0de';for(let y=0;y<4;y++)for(let x=0;x<6;x++)if((x+y)%2===0)ctx.fillRect(q.exit.x-52+x*17,q.exit.y-33+y*16,17,16);label('НАШ ПЛЕД',q.exit.x,q.exit.y+54,14);
   for(const c of q.clues)if(!c.taken){ctx.fillStyle='#fff0bc2b';ctx.beginPath();ctx.arc(c.x,c.y,27,0,7);ctx.fill();paw(c.x,c.y+Math.sin(time*3)*3);}
   if(!q.dog.found&&q.clues.some(c=>!c.taken)){rect({x:758,y:385,w:77,h:52},'#4f7242','#8aab65');label('?',798,375,24);}else dog(q.dog);
  }
  if(q.kind==='race'){
   ctx.fillStyle='#332c49df';ctx.fillRect(72,118,822,377);ctx.strokeStyle='#ffb4cf';ctx.lineWidth=5;ctx.strokeRect(86,136,793,340);
   rect(q.walls[0],'#4e405a','#80698a');label('ДВА СЕРДЦА',480,287,26,'#f9cbdf');label('НА СТАРТЕ',480,319,22,'#cba9cd');
   ctx.setLineDash([16,16]);ctx.strokeStyle='#d5bcc357';ctx.lineWidth=2;ctx.strokeRect(189,196,576,201);ctx.setLineDash([]);
   q.checkpoints.forEach((cp,i)=>{const active=q.players.some(p=>!p.finished&&p.next===i);ctx.strokeStyle=active?'#f8e5a1':'#b1a5c245';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cp.x,cp.y,37,0,7);ctx.stroke();label(i===4?'ФИНИШ':String(i+1),cp.x,cp.y+6,i===4?11:19,active?'#ffeeb8':'#d3c5d2');});
   for(let i=0;i<5;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?'#2b253d':'#f5e8d7';ctx.fillRect(440+j*10,139+i*13,10,13);}
   car(q.rival,'#a4c4d0');q.players.forEach(p=>car(p,color(p.id)));if(q.time<3)label(String(Math.ceil(3-q.time)),480,398,76,'#ffe6d7');
  }
  if(q.kind==='school'){
   q.walls.forEach(a=>{rect(a,'#9b634a','#d5a770');ctx.fillStyle='#ece1c0';ctx.fillRect(a.x+22,a.y+13,28,21);ctx.fillRect(a.x+75,a.y+12,25,20);});
   for(const a of q.answers)plate(a.x,a.y,a.value===8&&q.pass?'#bad995':'#d1b194',q.pass&&a.value===8,String(a.value));
   label('2 + 3 × 2 = ?',440,117,26,'#fff0c5');plate(q.bell.x,q.bell.y,'#f4d97c',q.bellOn,'♫');label('ЗВОНОК',q.bell.x,q.bell.y+44,15);
   if(!q.bellOn){ctx.fillStyle='#f8d5882b';ctx.beginPath();ctx.moveTo(q.teacher.x,q.teacher.y);ctx.arc(q.teacher.x,q.teacher.y,132,q.teacher.angle-.5,q.teacher.angle+.5);ctx.closePath();ctx.fill();}
   enemySprite({...q.teacher,type:'alien',face:-1,phase:q.bellOn?'recover':'walk',id:0,hp:1,max:1});label('УЧИТЕЛЬ',q.teacher.x,q.teacher.y-113,13);exit(q.exit,q.bellOn);
  }
  if(q.kind==='kitchen'){
   if(q.stage===12){for(const a of q.walls.slice(q.stations.length))rect(a,'#20304b','#7492b4');ctx.fillStyle='#6e7693';ctx.fillRect(440,281,75,114);for(let y=287;y<393;y+=16){ctx.fillStyle='#c9c0b74a';ctx.fillRect(440,y,75,3);}for(const spill of q.spills){ctx.fillStyle='#d5a87088';ctx.beginPath();ctx.ellipse(spill.x,spill.y,spill.r,spill.r*.6,0,0,7);ctx.fill();}}
   else q.walls.slice(q.stations.length).forEach(a=>rect(a,'#886447','#d0ac7b'));
   for(const s of q.stations){
    const base=s.type==='source'?'#7c6054':s.type==='prep'?'#8a7256':s.type==='cook'?'#575169':'#829479';
    rect({x:s.x-35,y:s.y-22,w:70,h:44},base,'#dfc8a5');label(s.label.toUpperCase(),s.x,s.y+46,15,s.type==='serve'?'#efffc9':'#fff0dc');
    if(s.type==='source')food(s.food,s.x,s.y-7);
    if(s.type==='prep'){ctx.fillStyle='#e1c496';ctx.fillRect(s.x-25,s.y-14,50,25);if(s.item)food(s.item,s.x,s.y-5,.8);else{ctx.fillStyle='#e7e2dc';ctx.fillRect(s.x-15,s.y-4,29,5);ctx.fillStyle='#645269';ctx.fillRect(s.x+13,s.y-4,10,5);}}
    if(s.type==='cook'){
     ctx.fillStyle='#202239';ctx.fillRect(s.x-24,s.y-14,48,28);if(s.ready){food({food:q.level.dish,meal:true},s.x,s.y-9);label('ГОТОВО!',s.x,s.y-35,15,'#d6f0af');}
     else s.added.forEach((f,i)=>food(f,s.x-18+i*18,s.y-5,.5));
     if(s.remaining>0)for(let i=0;i<3;i++){ctx.globalAlpha=.5;ctx.fillStyle='#fff0de';ctx.fillRect(s.x-15+i*15,s.y-35-((time*12+i*8)%22),4,7);ctx.globalAlpha=1;}
    }
    if(s.type==='serve'){heart(s.x,s.y-8,25,'#e6ecc5');label(String(q.served)+' / 3',s.x,s.y-35,17);}
    if(s.remaining>0){const max=s.type==='prep'?1.4:q.level.cookTime;ctx.fillStyle='#231b2c';ctx.fillRect(s.x-30,s.y+25,60,5);ctx.fillStyle='#d9df9e';ctx.fillRect(s.x-30,s.y+25,60*(1-s.remaining/max),5);}
   }
   q.items.forEach(i=>food(i.item,i.x,i.y,.85));
  }
  if(q.kind==='workshop'||q.kind==='moon'){
   const moon=q.kind==='moon';ctx.fillStyle=moon?'#10172adf':'#24192ede';ctx.fillRect(moon?365:440,95,moon?230:80,405);
   const open=q.bridgeOpen||q.bridgeLatched;
   if(open){const x=moon?365:440,y=moon?337:295,ww=moon?230:80,hh=moon?122:85;ctx.fillStyle=moon?'#9fa4bd':'#aa8055';ctx.fillRect(x,y,ww,hh);ctx.strokeStyle=moon?'#d4e9ee':'#efd69a';ctx.lineWidth=4;ctx.strokeRect(x,y,ww,hh);for(let bx=x+7;bx<x+ww;bx+=16){ctx.fillStyle='#f9e2c340';ctx.fillRect(bx,y,3,hh);}}
   if(moon){
    for(const s of q.stars)if(!s.taken)star(s.x,s.y+Math.sin(time*2+s.x)*4,color(s.owner));
    q.beacons.forEach((b,i)=>{plate(b.x,b.y,color(i),b.on,i===0?'О':'Н');label('МАЯК',b.x,b.y+44,14,color(i));if(b.on){ctx.fillStyle=color(i)+'28';ctx.fillRect(b.x-9,96,18,b.y-107);}});
    if(open)dog({x:q.exit.x,y:q.exit.y+10,face:1,moving:false});else label('ВКЛЮЧИТЕ ОБА МАЯКА',480,302,15);
   }else{
    plate(q.plate.x,q.plate.y,'#deb26a',q.bridgeOpen,'↓');label('ДЕРЖИ ПЛИТУ',q.plate.x,q.plate.y+44,15);
    plate(q.lever.x,q.lever.y,'#b9c7a3',q.bridgeLatched,'↗');label('РЫЧАГ',q.lever.x,q.lever.y+44,15);
    if(q.bridgeLatched){q.gears.forEach(g=>{if(!g.taken){gear(g.x,g.y,color(g.owner));label(g.owner===0?'О':'Н',g.x,g.y+33,13,color(g.owner));}});q.pads.forEach((p,i)=>{const active=q.players.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<32);plate(p.x,p.y,color(i),active,i===0?'О':'Н');});if(q.charge>0){ctx.fillStyle='#ead59f';ctx.fillRect(655,375,155*Math.min(1,q.charge/1.5),6);}}
    exit(q.exit,q.doorOpen);
   }
  }
  if(q.hintTimer>0&&q.kind!=='race'){
   q.players.forEach(p=>{if(q.solo&&p.id!==q.hero)return;const target=q.intent(p).target;if(!target)return;ctx.strokeStyle=color(p.id)+'bb';ctx.lineWidth=2;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(p.x,p.y);for(const point of q.pathTo(p,target))ctx.lineTo(point.x,point.y);ctx.stroke();ctx.setLineDash([]);});
  }
  if(q.kind!=='race')for(const p of [...q.players].sort((a,b)=>a.y-b.y)){
   shadow(p.x,p.y,18);heroSprite(p,false,q.kind==='maze'?65:78);
   if(p.held){food(p.held,p.x,p.y-91,.85);}
   if(q.solo&&p.id!==q.hero){ctx.fillStyle='#a8dfc3';ctx.fillRect(p.x-3,p.y+9,6,3);}
  }
  if(q.status==='playing'&&q.time<4&&q.kind!=='kitchen'){ctx.fillStyle='#16142bc9';ctx.fillRect(175,503,610,27);label(q.level.goal,480,522,13);}
 }
 window.LoveQuestScenes={draw,background};
})();
