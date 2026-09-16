/* Пятнадцать маленьких приключений. ПК: два игрока. Телефон: герой и помощник. */
(() => {
 'use strict';
 const {create,LEVELS,FOOD,W,H}=window.LoveAdventures;
 const rootURL=new URL('./',document.currentScript.src),src=name=>new URL(name,rootURL).href;
 const solo=matchMedia('(pointer:coarse)').matches||matchMedia('(max-width:700px)').matches;
 const keys=new Set(),taps=new Set(),touch=new Set();
 let dialog,canvas,ctx,model,raf=0,last=0,images=null,callbacks={},priorFocus,hero=1,muted=true,audioContext,paused=false,choosing=false,drawTime=0,lastHud='',assetPromise=null;
 const saveKey='myreallove-quest-v2';
 function readSave(){
  try{const d=JSON.parse(localStorage.getItem(saveKey));if(d?.version===2)return {version:2,stage:Math.max(0,Math.min(LEVELS.length-1,Number(d.stage)||0)),completed:[...new Set((Array.isArray(d.completed)?d.completed:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<LEVELS.length))]};
   const old=JSON.parse(localStorage.getItem('myreallove-quest-v1'));if(old?.version===1&&Number.isInteger(old.stage)&&old.stage>=0&&old.stage<=4)return {version:2,stage:old.stage,completed:Array.from({length:old.won?5:old.stage},(_,i)=>i)};
  }catch{}return {version:2,stage:0,completed:[]};
 }
 function save(stage,completed=false){const d=readSave();d.stage=stage;if(completed&&!d.completed.includes(stage))d.completed.push(stage);try{localStorage.setItem(saveKey,JSON.stringify(d));}catch{}}
 function clearInput(){keys.clear();taps.clear();touch.clear();dialog?.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('active'));}
 const loadImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Не удалось загрузить картинку'));im.src=url;});
 async function characterImage(){let value=getComputedStyle(document.documentElement).getPropertyValue('--character-sheet');if(!value){await new Promise(resolve=>{const observer=new MutationObserver(()=>{if(document.documentElement.classList.contains('characters-ready')){observer.disconnect();resolve();}});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});setTimeout(()=>{observer.disconnect();resolve();},5000);});value=getComputedStyle(document.documentElement).getPropertyValue('--character-sheet');}const url=value.trim().replace(/^url\(["']?/,'').replace(/["']?\)$/,'');if(!url)throw new Error('Персонажи ещё загружаются');return loadImage(url);}
 function sliceEnemies(im){const output=[],cellW=im.width/4,cellH=im.height/2;for(let i=0;i<8;i++){const c=document.createElement('canvas');c.width=cellW;c.height=cellH;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,(i%4)*cellW,Math.floor(i/4)*cellH,cellW,cellH,0,0,cellW,cellH);const data=g.getImageData(0,0,cellW,cellH);let minX=cellW,minY=cellH,maxX=0,maxY=0;for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++){const k=(y*cellW+x)*4,r=data.data[k],green=data.data[k+1],b=data.data[k+2];if(green>85&&green>r*1.24&&green>b*1.24)data.data[k+3]=0;if(data.data[k+3]>30){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}g.putImageData(data,0,0);output.push({im:c,x:minX,y:minY,w:Math.max(1,maxX-minX+1),h:Math.max(1,maxY-minY+1)});}return output;}
 async function assets(){if(images)return images;if(!assetPromise)assetPromise=Promise.all([loadImage(src('worlds.webp')),loadImage(src('enemies.webp')),characterImage(),loadImage(src('adventure-worlds.webp')),loadImage(src('lucky.webp'))]).then(([backgrounds,enemies,characters,adventureWorlds,lucky])=>images={backgrounds,enemies:sliceEnemies(enemies),characters,adventureWorlds,lucky:sliceEnemies(lucky)}).catch(error=>{assetPromise=null;throw error;});return assetPromise;}
 const button=(label,cmd,primary=true,stage)=>`<button class="${primary?'primary':'quest-secondary'}" data-command="${cmd}"${stage===undefined?'':` data-stage="${stage}"`}>${label}</button>`;
 function ensureDialog(){
  if(dialog)return;dialog=document.createElement('dialog');dialog.className='quest-dialog'+(solo?' quest-solo':'');dialog.setAttribute('aria-labelledby','quest-title');
  dialog.innerHTML=`<div class="quest-top"><div class="quest-brand"><span>♥</span><strong id="quest-title">наше приключение</strong></div><div class="quest-top-actions"><button data-quest-levels>Выбор уровня</button><button data-quest-sound aria-pressed="false" aria-label="Включить звук игры">♫ выкл.</button><button data-quest-pause>Пауза</button><button data-quest-close>К истории ↗</button></div></div><div class="quest-browser" hidden></div><div class="quest-gamearea"><div class="quest-map"><span data-current-location></span><span data-total-progress></span><button data-quest-hint>Подсказка ♡</button></div><div class="quest-recipe" hidden></div><div class="quest-view"><canvas width="960" height="540" tabindex="0" aria-label="Игровое поле. Управление указано под игрой."></canvas><div class="quest-hud"><div class="quest-health" role="meter" aria-label="Общее здоровье" aria-valuemin="0" aria-valuemax="12"></div><div class="quest-objective"></div></div><div class="quest-panel"></div></div><div class="quest-controls-info"></div><div class="quest-touch"><div class="quest-dpad" aria-label="Направления движения"><button data-control="up" aria-label="Вверх">↑</button><button data-control="left" aria-label="Влево">←</button><button data-control="down" aria-label="Вниз">↓</button><button data-control="right" aria-label="Вправо">→</button></div><div class="quest-touch-actions"><button data-control="dash">Рывок</button><button data-control="attack">Действие</button></div></div><p class="quest-tip"></p></div><p class="quest-live" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);canvas=dialog.querySelector('canvas');ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  dialog.querySelector('[data-quest-close]').onclick=close;dialog.querySelector('[data-quest-levels]').onclick=()=>{if(images)showLevels();};dialog.querySelector('[data-quest-pause]').onclick=togglePause;
  dialog.querySelector('[data-quest-hint]').onclick=()=>{if(model?.hint)model.hint();else say(model?.level.hint||model?.level.goal||'Держитесь вместе ♡');};
  dialog.querySelector('[data-quest-sound]').onclick=()=>{muted=!muted;const b=dialog.querySelector('[data-quest-sound]');b.textContent=muted?'♫ выкл.':'♫ вкл.';b.setAttribute('aria-pressed',String(!muted));b.setAttribute('aria-label',muted?'Включить звук игры':'Выключить звук игры');sound('heal');};
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(choosing)close();else if(model?.status==='playing')togglePause();else showLevels();});dialog.addEventListener('close',cleanup);
  dialog.addEventListener('click',e=>{
   const b=e.target.closest('[data-command]');if(!b)return;const cmd=b.dataset.command;
   if(cmd==='level')brief(Number(b.dataset.stage));if(cmd==='start')start(Number(b.dataset.stage));if(cmd==='next')brief(model.stage+1);if(cmd==='retry')start(model.stage);
   if(cmd==='resume')resume();if(cmd==='levels')showLevels();if(cmd==='close')close();if(cmd==='reload')open(callbacks);
   if(cmd==='hero'){hero=Number(b.dataset.hero);if(model&&solo)model.hero=hero;dialog.querySelectorAll('[data-command=hero]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.hero)===hero)));}
  });
  for(const b of dialog.querySelectorAll('[data-control]')){
   b.addEventListener('pointerdown',e=>{if(model?.status!=='playing'||paused||choosing)return;e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(b.dataset.control);b.classList.add('active');});
   const release=()=>{touch.delete(b.dataset.control);b.classList.remove('active');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  }
 }
 function panel(title,body,buttons,kicker='НАШЕ МАЛЕНЬКОЕ ПРИКЛЮЧЕНИЕ'){
  const p=dialog.querySelector('.quest-panel');p.hidden=false;p.classList.remove('quest-win');p.innerHTML=`<span class="quest-kicker">${kicker}</span><h2>${title}</h2><p>${body}</p><div class="quest-panel-actions">${buttons}</div>`;
 }
 function thumbnail(level){const idx=level.world??level.background,cols=level.world===undefined?2:3,rows=level.world===undefined?2:4;return `background-image:url('${src(level.world===undefined?'worlds.webp':'adventure-worlds.webp')}');background-size:${cols*100}% ${rows*100}%;background-position:${(idx%cols)*100/(cols-1)}% ${Math.floor(idx/cols)*100/(rows-1)}%`;}
 function showLevels(){
  choosing=true;paused=true;clearInput();dialog.querySelector('.quest-gamearea').hidden=true;dialog.querySelector('[data-quest-pause]').disabled=true;
  const menu=dialog.querySelector('.quest-browser'),progress=readSave(),groups=[...new Set(LEVELS.map(l=>l.group))];menu.hidden=false;
  menu.innerHTML=`<div class="quest-select-heading"><div><p class="quest-select-kicker">НАШ МАЛЕНЬКИЙ МИР</p><h2>Куда сбежим сегодня?</h2><p>15 приключений. Все открыты — выбирайте любое.</p></div><div class="quest-completed-count"><strong>${progress.completed.length}<span> / 15</span></strong><small>воспоминаний собрано</small></div></div><div class="quest-select-mode">${solo?`<div><strong>Ты играешь — напарник помогает ♡</strong><span>Выбери, за кого отправишься в приключение.</span></div><div class="quest-character-choice"><button data-command="hero" data-hero="1" aria-pressed="${hero===1}">Настя</button><button data-command="hero" data-hero="0" aria-pressed="${hero===0}">Олег</button></div>`:'<div><strong>Двое за одной клавиатурой</strong><span>Олег — WASD + F · Настя — стрелки + Enter</span></div>'}${model?.status==='playing'?button('Вернуться в уровень','resume',false):''}</div>${groups.map(group=>`<section class="quest-level-group"><h3>${group}</h3><div class="quest-level-grid">${LEVELS.map((level,i)=>({level,i})).filter(({level})=>level.group===group).map(({level,i})=>`<button class="quest-level-card${progress.completed.includes(i)?' is-complete':''}" data-command="level" data-stage="${i}"><span class="quest-level-art" style="${thumbnail(level)}"><span class="quest-level-index">${String(i+1).padStart(2,'0')}</span>${progress.completed.includes(i)?'<span class="quest-level-check">♥ Пройдено</span>':''}</span><span class="quest-level-copy"><strong>${level.short}</strong><span>${level.name}</span></span></button>`).join('')}</div></section>`).join('')}`;
  menu.querySelector('[data-command=level]')?.focus({preventScroll:true});
 }
 function showGame(){choosing=false;dialog.querySelector('.quest-browser').hidden=true;dialog.querySelector('.quest-gamearea').hidden=false;dialog.querySelector('[data-quest-pause]').disabled=false;}
 async function open(options={}){
  callbacks=options;ensureDialog();if(!dialog.open){priorFocus=document.activeElement;dialog.showModal();}document.body.classList.add('quest-open');clearInput();paused=false;choosing=false;showGame();panel('Собираемся в приключение…','Сейчас появятся наши герои.','');
  try{await assets();if(!dialog.open)return;model=create(readSave().stage,{solo,hero});model.status='ready';showLevels();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
  catch{panel('Картинки задержались','Проверь соединение и попробуй ещё раз.',button('Загрузить снова','reload')+button('К истории','close',false));}
 }
 function brief(stage){
  if(stage<0||stage>=LEVELS.length)return;model=create(stage,{solo,hero});model.status='ready';paused=false;showGame();clearInput();setupControls();updateHud(true);draw();
  panel(model.level.name,model.level.goal+'<br><span class="quest-brief-note">'+model.level.intro+'</span>',button('Поехали, вместе ♡','start',true,stage)+button('Другой уровень','levels',false),model.level.group.toUpperCase());say(model.level.intro);
 }
 function start(stage){
  if(stage<0||stage>=LEVELS.length)return;model=create(stage,{solo,hero});model.takeEvents();paused=false;showGame();clearInput();last=performance.now();save(stage);setupControls();
  dialog.querySelector('.quest-panel').hidden=true;dialog.querySelector('[data-quest-pause]').textContent='Пауза';canvas.focus({preventScroll:true});say(model.level.intro);updateHud(true);sound('level');
 }
 function setupControls(){
  const battle=model.mode==='battle',race=model.level.kind==='race',kitchen=model.level.kind==='kitchen';
  const action=battle?(model.stage===2?'огонь':'удар'):'действие',second=race?'турбо':kitchen?'положить':'рывок';
  dialog.querySelector('[data-control=attack]').textContent=battle?(model.stage===2?'Огонь':'Удар'):kitchen?'Взять / отдать':'Действие';dialog.querySelector('[data-control=attack]').hidden=race;
  dialog.querySelector('[data-control=dash]').textContent=race?'Турбо':kitchen?'Положить':'Рывок';
  dialog.querySelector('.quest-controls-info').innerHTML=solo?`<div><strong>${hero===0?'Ты — Олег. Настя помогает':'Ты — Настя. Олег помогает'}</strong>${race?'Стрелки — руль. Турбо — ускорение.':battle?'Удерживай удар. Уклоняйся от красных кругов.':'Нажимай действие рядом с предметом. Подсказка покажет путь.'}</div>`:`<div><strong>ОЛЕГ · игрок 1</strong><kbd>W A S D</kbd> движение ${race?'':`· <kbd>F</kbd> ${action}`} · <kbd>G</kbd> ${second}</div><div><strong>НАСТЯ · игрок 2</strong><kbd>↑ ← ↓ →</kbd> движение ${race?'':`· <kbd>Enter</kbd> ${action}`} · <kbd>правый Shift</kbd> ${second}</div>`;
  const recipe=dialog.querySelector('.quest-recipe');recipe.hidden=!kitchen;
  if(kitchen)recipe.innerHTML=`<strong>РЕЦЕПТ</strong>${model.level.recipe.map(f=>`<span style="--food:${FOOD[f].color}">${FOOD[f].name}${FOOD[f].ready?'':' · нарезать'}</span>`).join('<i>+</i>')}<i>→</i><b>${FOOD[model.level.dish].name}</b><small>Действие: взять / готовить / подать · вторая кнопка: положить</small>`;
 }
 function say(text){dialog.querySelector('.quest-live').textContent=text;dialog.querySelector('.quest-tip').textContent=text;}
 function resume(){if(model?.status!=='playing')return;paused=false;showGame();clearInput();dialog.querySelector('.quest-panel').hidden=true;dialog.querySelector('[data-quest-pause]').textContent='Пауза';last=performance.now();canvas.focus({preventScroll:true});}
 function togglePause(){if(model?.status!=='playing'||choosing)return;if(paused){resume();return;}paused=true;clearInput();dialog.querySelector('[data-quest-pause]').textContent='Продолжить';panel('Никуда не спешим.','Приключение вас подождёт.',button('Продолжить','resume')+button('Выбор уровня','levels',false),'ПАУЗА');}
 function cleanup(){cancelAnimationFrame(raf);clearInput();document.body.classList.remove('quest-open');dialog.querySelectorAll('.quest-win video').forEach(v=>v.pause());callbacks.onClose?.();if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});}
 function close(){if(dialog?.open)dialog.close();}
 const codes=['KeyW','KeyA','KeyS','KeyD','KeyF','KeyG','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','ShiftRight','KeyP'];
 addEventListener('keydown',e=>{if(!dialog?.open||!codes.includes(e.code)||choosing||model?.status!=='playing'||(paused&&e.code!=='KeyP'))return;e.preventDefault();e.stopPropagation();if(e.code==='KeyP'){if(!e.repeat)togglePause();return;}keys.add(e.code);taps.add(e.code);},true);
 addEventListener('keyup',e=>{keys.delete(e.code);if(dialog?.open&&model?.status==='playing'&&!choosing&&!paused&&codes.includes(e.code)){e.preventDefault();e.stopPropagation();}},true);
 addEventListener('blur',()=>{clearInput();if(dialog?.open&&model?.status==='playing'&&!paused&&!choosing)togglePause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog?.open&&model?.status==='playing'&&!paused&&!choosing)togglePause();});
 function inputs(){
  const pressed=code=>keys.has(code)||taps.has(code),p0={x:Number(pressed('KeyD'))-Number(pressed('KeyA')),y:Number(pressed('KeyS'))-Number(pressed('KeyW')),attack:pressed('KeyF'),dash:pressed('KeyG')},p1={x:Number(pressed('ArrowRight'))-Number(pressed('ArrowLeft')),y:Number(pressed('ArrowDown'))-Number(pressed('ArrowUp')),attack:pressed('Enter'),dash:pressed('ShiftRight')},all=[p0,p1];
  if(solo)all[hero]={x:Number(touch.has('right'))-Number(touch.has('left'))+all[hero].x,y:Number(touch.has('down'))-Number(touch.has('up'))+all[hero].y,attack:touch.has('attack')||all[hero].attack,dash:touch.has('dash')||all[hero].dash};return all;
 }
 function updateHud(force=false){
  const objective=model.objective(),key=[model.stage,model.health,objective,model.status].join();if(!force&&key===lastHud)return;lastHud=key;
  const health=dialog.querySelector('.quest-health'),battle=model.mode==='battle';health.textContent=battle?'♥'.repeat(model.health)+'♡'.repeat(model.maxHealth-model.health):'ОЛЕГ + НАСТЯ ♡';
  if(battle){health.setAttribute('role','meter');health.setAttribute('aria-valuenow',String(model.health));health.setAttribute('aria-valuetext',`${model.health} из 12`);}else{health.removeAttribute('role');health.removeAttribute('aria-valuenow');health.removeAttribute('aria-valuetext');health.setAttribute('aria-label','Напарники: Олег и Настя');}
  dialog.querySelector('.quest-objective').textContent=objective;dialog.querySelector('[data-current-location]').textContent=model.level.short;dialog.querySelector('[data-total-progress]').textContent=readSave().completed.length+' / 15 пройдено';
 }
 function onEvents(){
  for(const e of model.takeEvents()){
   if(['attack','hurt','heal','level','dash','kill','key'].includes(e.type))sound(e.type);
   if(e.type==='message')say(e.value);if(e.type==='key'&&model.stage===0)say('Настя: «Ключ наш! Скорее к выходу справа!»');
   if(e.type==='clear'){
    save(model.stage,true);callbacks.onAchievement?.(model.level.achievement,'Ещё одно приключение. Вместе.','♥');
    panel('Получилось.<br>Мы справились.',model.level.outro,button('Следующее приключение →','next')+button('Выбор уровня','levels',false),model.level.achievement.toUpperCase());clearInput();sound('level');
   }
   if(e.type==='dead'){panel('Ещё одна попытка.<br>Вместе получится.','Повторим этот уровень с полным здоровьем.',button('Попробовать ещё','retry')+button('Выбор уровня','levels',false),'НИЧЕГО СТРАШНОГО');clearInput();}
   if(e.type==='win'){
    save(model.stage,true);callbacks.onAchievement?.(model.level.achievement,'Любое приключение — вместе.','♥');clearInput();
    const moon=model.stage===14,p=dialog.querySelector('.quest-panel');p.hidden=false;p.classList.add('quest-win');
    p.innerHTML=`${moon?`<video src="${src('moon-ending.mp4')}" autoplay muted loop playsinline aria-label="Олег, Настя и Лаки гуляют по Луне и обнимаются"></video>`:`<img src="${src('happy-ending.gif')}" alt="Олег и Настя обнимаются на цветочном поле">`}<span class="quest-kicker">${moon?'ДО ЛУНЫ И ОБРАТНО':'ПЕРВОЕ ПРИКЛЮЧЕНИЕ ПРОЙДЕНО'}</span><h2>Мой любимый напарник.<br>В игре. И в жизни.</h2><div class="quest-panel-actions">${moon?'':button('Ещё приключения →','next')}${button('Выбор уровня','levels',moon)}${button('К нашей истории ♡','close',false)}</div>`;sound('level');
   }
  }
 }
  function sound(type){if(muted)return;try{audioContext ||=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const notes=type==='level'?[523,659,784,1047]:type==='heal'?[659,880]:type==='hurt'?[170,120]:type==='attack'?[350]:type==='kill'?[500,700]:[450];notes.forEach((freq,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+i*.075;o.type='triangle';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.022,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.14);});}catch{muted=true;}}
  function frame(t){if(!dialog.open)return;const dt=Math.min((t-last)/1000,.05);last=t;if(model&&images&&!choosing){if(!paused){model.update(dt,inputs());taps.clear();}drawTime=t/1000;draw();onEvents();updateHud();}raf=requestAnimationFrame(frame);}
  function text(value,x,y,size=16,color='#ffdeec',align='center'){ctx.save();ctx.font=`${size}px 'Courier New',monospace`;ctx.textAlign=align;ctx.fillStyle='#170e24';ctx.fillText(value,x+1,y+2);ctx.fillStyle=color;ctx.fillText(value,x,y);ctx.restore();}
  function heart(x,y,size=10,color='#f8a8cd'){ctx.save();ctx.fillStyle=color;const map=['01100110','11111111','11111111','01111110','00111100','00011000'];const unit=size/8;map.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')ctx.fillRect(Math.round(x+(i-4)*unit),Math.round(y+j*unit),Math.ceil(unit),Math.ceil(unit));}));ctx.restore();}
  function shadow(x,y,size=28){ctx.fillStyle='#16081f65';ctx.beginPath();ctx.ellipse(x,y,size,size*.23,0,0,7);ctx.fill();}
  function heroSprite(p,small=false,customHeight){const height=customHeight||(small?54:116),width=height*.84,im=images.characters,cw=im.width/4,ch=im.height/3,frame=p.moving?Math.floor(drawTime*9)%4:0,row=p.id===0?2:1;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));if(model.invincible>0&&Math.floor(drawTime*12)%2===0)ctx.globalAlpha=.5;ctx.scale(p.face,1);ctx.drawImage(im,frame*cw,row*ch,cw,ch,-width/2,-height,width,height);if(!small&&model.mode==='battle'&&p.attack>0){ctx.strokeStyle=p.id===0?'#ffdbb2':'#ff9ccd';ctx.lineWidth=5;ctx.beginPath();ctx.arc(32,-51,46,-1.2,1.15);ctx.stroke();for(let n=0;n<3;n++)heart(48+n*12,-65+n*12,8,'#ffb9d7');}ctx.restore();if(!small){text(p.id===0?'ОЛЕГ':'НАСТЯ',p.x,p.y-height+6,12,p.id===0?'#fff0c5':'#ffc9e0');if(p.dash<=0&&model.mode==='battle'){ctx.fillStyle='#ffb8d680';ctx.fillRect(p.x-13,p.y+10,26,2);}}}
  function ufo(x,y,id=0,enemy=false){shadow(x,y+25,34);ctx.save();ctx.translate(Math.round(x),Math.round(y));if(enemy){ctx.fillStyle='#65416f';ctx.fillRect(-27,-7,54,17);ctx.fillStyle='#ef7a9b';ctx.fillRect(-16,-16,32,17);ctx.fillStyle='#ffcabb';ctx.fillRect(-32,1,64,6);ctx.fillStyle='#42283e';ctx.fillRect(-7,-12,14,8);}else{ctx.fillStyle='#78638b';ctx.fillRect(-41,0,82,12);ctx.fillStyle='#e8c2dd';ctx.fillRect(-33,-5,66,14);ctx.fillStyle='#be83b6';ctx.fillRect(-25,12,50,5);ctx.fillStyle='#97d8dc85';ctx.beginPath();ctx.ellipse(0,-8,28,25,Math.PI,0,Math.PI);ctx.fill();const pp={id,x:0,y:3,face:1,moving:false};heroSprite(pp,true);ctx.fillStyle='#e4bddf';ctx.fillRect(-41,4,82,7);for(let i=-2;i<=2;i++){ctx.fillStyle=i%2===Math.floor(drawTime*4)%2?'#ffc1e0':'#bb8bd4';ctx.fillRect(i*13-3,8,6,4);}ctx.fillStyle='#ffb8d8';ctx.fillRect(-46-Math.floor(Math.sin(drawTime*20)*6),5,11,4);}ctx.restore();if(!enemy)text(id===0?'ОЛЕГ':'НАСТЯ',x,y-42,12);}
  function enemySprite(e){const row={skeleton:0,bear:2,alien:4,boss:6}[e.type],index=row+(e.phase==='warn'||e.phase==='recover'?1:0),s=images.enemies[index];const height=e.type==='boss'?172:e.type==='bear'?130:100,width=s.w/s.h*height;shadow(e.x,e.y,width*.32);ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.scale(-e.face,1);if(e.flash>0)ctx.globalAlpha=.45;const bob=e.phase==='walk'?Math.sin(drawTime*7+e.id)*2:0;ctx.drawImage(s.im,s.x,s.y,s.w,s.h,-width/2,-height+bob,width,height);ctx.restore();if(e.type==='boss'||e.type==='bear'){const barW=e.type==='boss'?150:110;ctx.fillStyle='#170a24';ctx.fillRect(e.x-barW/2-2,e.y-height-16,barW+4,8);ctx.fillStyle='#e697b8';ctx.fillRect(e.x-barW/2,e.y-height-14,barW*e.hp/e.max,4);}}
  function draw(){
    ctx.clearRect(0,0,W,H);
    if(model.mode==='adventure'){window.LoveQuestScenes.draw(ctx,model,images,drawTime,{text,heart,shadow,heroSprite,enemySprite});return;}
    if(model.level.world!==undefined)window.LoveQuestScenes.background(ctx,images,model.level.world);
    else{const bg=images.backgrounds,idx=model.level.background,bw=bg.width/2,bh=bg.height/2;ctx.drawImage(bg,(idx%2)*bw,Math.floor(idx/2)*bh,bw,bh,0,0,W,H);}
    ctx.fillStyle=model.stage===4?'#270d333d':'#1b102219';ctx.fillRect(0,0,W,H);
    for(let i=0;i<24;i++){const x=(i*137+drawTime*(model.stage===2?-12:2)+W*100)%W,y=70+(i*83)%440;ctx.fillStyle=i%2?'#ffbcdb60':'#c7bbdf50';ctx.fillRect(x,y+Math.sin(drawTime+i)*7,2,2);}
    if(model.stage===0&&model.keyTaken){const p=model.portal;ctx.fillStyle='#bb74b445';ctx.fillRect(p.x-28,p.y-118,56,123);ctx.strokeStyle='#efb6d5';ctx.lineWidth=3;ctx.strokeRect(p.x-28,p.y-118,56,123);text('ВЫХОД',p.x,p.y-131,13);heart(p.x,p.y-70,24);}
    for(const e of model.enemies)if(e.phase==='warn'){ctx.fillStyle='#ed72724a';ctx.strokeStyle='#ff9eae';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.hitX,e.hitY,e.radius,e.radius*.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();text('!',e.hitX,e.hitY-10,24,'#ffe2a8');}
    for(const item of model.pickups){shadow(item.x,item.y,12);heart(item.x,item.y-20+Math.sin(drawTime*4)*5,22);}
    if(model.key){const {x,y}=model.key;shadow(x,y,18);ctx.strokeStyle='#ffe095';ctx.lineWidth=7;ctx.beginPath();ctx.arc(x-10,y-27+Math.sin(drawTime*3)*5,10,0,Math.PI*2);ctx.moveTo(x,y-27);ctx.lineTo(x+24,y-27);ctx.lineTo(x+24,y-18);ctx.moveTo(x+15,y-27);ctx.lineTo(x+15,y-20);ctx.stroke();text('КЛЮЧ',x,y-53,13,'#ffe6a8');}
    if(model.stage===2){for(const e of model.enemies)ufo(e.x,e.y,0,true);for(const p of model.players)ufo(p.x,p.y,p.id);}else{const entities=[...model.players.map(p=>({p,y:p.y})),...model.enemies.map(e=>({e,y:e.y}))].sort((a,b)=>a.y-b.y);for(const item of entities)if(item.p){shadow(item.p.x,item.p.y,24);heroSprite(item.p);}else enemySprite(item.e);}
    for(const b of model.bullets){if(b.enemy){ctx.fillStyle='#ff9f7d';ctx.fillRect(b.x-5,b.y-4,11,8);}else heart(b.x,b.y-5,15);}
    for(const e of model.effects){ctx.save();ctx.globalAlpha=Math.min(1,e.t*3);if(e.type==='hit'||e.type==='poof'){for(let i=0;i<7;i++){const a=i*Math.PI*2/7,spread=(.7-e.t)*75;ctx.fillStyle=i%2?'#fac1d7':'#eedabe';ctx.fillRect(e.x+Math.cos(a)*spread,e.y+Math.sin(a)*spread,5,5);}}else if(e.type==='heal')text('+2 ♥',e.x,e.y-20,20,'#e9e5be');else if(e.type==='impact'){ctx.strokeStyle='#ffadc9';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(e.x,e.y,(e.r||65)*(1-e.t),25,0,0,7);ctx.stroke();}else if(e.type==='dash'){ctx.fillStyle='#eed4f555';ctx.fillRect(e.x-30,e.y-25,65,4);}ctx.restore();}
    if(model.status==='playing'&&model.time<5){ctx.fillStyle='#1d1024ba';ctx.fillRect(190,475,580,36);text(model.level.goal,480,498,13);}
  }
  window.LoveQuest={open,close,get active(){return Boolean(dialog?.open);}};
})();
