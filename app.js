(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const story = window.STORY;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {chapter:0,opened:false,busy:false,sound:false,dark:false,liked:false,sunrise:false,locked:false,gift:false};
  const seen = new Set();
  let mediaFiles=[], indexReady=false, toastTimer, toastDelay, audioContext, introTimer, openGallery=[], galleryPosition=0;
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normal = value => value.toLowerCase().replace(/\.[^.]+$/,'').replace(/[\s_\-()]+/g,'');
  const imagePattern = /\.(jpe?g|png|webp|avif|gif)$/i;
  const videoPattern = /\.(mp4|webm|mov|m4v|ogv)$/i;
  const mediaURL = path => './'+path.split('/').map(encodeURIComponent).join('/');
  function findMedia(name,type='image') {
    const test=type==='video'?videoPattern:imagePattern;
    const item=mediaFiles.find(path=>normal(path.split('/').pop())===normal(name)&&test.test(path));
    return item?{name,path:item,url:mediaURL(item),type}:null;
  }
  function allMedia(prefix) {
    const key=normal(prefix),found=new Map();
    for(const path of mediaFiles){
      if(!imagePattern.test(path))continue;
      const name=normal(path.split('/').pop());
      if(!name.startsWith(key))continue;
      const suffix=name.slice(key.length);
      if(suffix!==''&&!/^\d+$/.test(suffix))continue;
      if(!found.has(name))found.set(name,{name,path,url:mediaURL(path),type:'image',order:suffix===''?0:Number(suffix)});
    }
    return [...found.values()].sort((a,b)=>a.order-b.order||a.path.localeCompare(b.path));
  }
  function galleryMedia(c) {
    if(!c.reuse)return allMedia(c.prefix);
    const groups=c.reuse.map(allMedia),pool=[],used=new Set();
    const longest=Math.max(0,...groups.map(items=>items.length));
    for(let i=0;i<longest;i++)for(const items of groups){const item=items[i];if(item&&!used.has(item.path)){used.add(item.path);pool.push(item);}}
    if(!pool.length)return [];
    return Array.from({length:c.count||30},(_,i)=>pool[i%pool.length]);
  }
  function todayParts() {
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Novosibirsk',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
    return Object.fromEntries(parts.filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,+p.value]));
  }
  function plural(n,forms){return forms[(n%100>10&&n%100<20)?2:(n%10===1?0:(n%10>=2&&n%10<=4?1:2))];}
  function elapsed() {
    const p=todayParts();let y=p.year-2025,m=p.month-2,d=p.day-5;
    if(d<0){m--;d+=new Date(p.year,p.month-1,0).getDate();}if(m<0){y--;m+=12;}
    return [y>0?`${y} ${plural(y,['год','года','лет'])}`:'',m>0?`${m} ${plural(m,['месяц','месяца','месяцев'])}`:'',`${Math.max(0,d)} ${plural(Math.max(0,d),['день','дня','дней'])}`].filter(Boolean).join(' ')+' назад';
  }
  function togetherDays(){const p=todayParts();const n=Math.floor((Date.UTC(p.year,p.month-1,p.day)-Date.UTC(2025,2,16))/86400000);return `${n} ${plural(n,['день','дня','дней'])} рядом`;}
  function emptyMemory(text='Некоторые моменты — навсегда в сердце.') {return `<div class="missing-memory"><div><span class="memory-heart" aria-hidden="true">♡</span><p>${text}</p></div></div>`;}
  function imgMarkup(item,alt,cls=''){return `<img src="${escape(item.url)}" alt="${escape(alt)}" class="${cls}" loading="lazy" decoding="async">`;}
  function photo(name,caption='Наше воспоминание',card=true){
    const item=findMedia(name);
    const body=item?`<button class="media-button" data-photo="${escape(name)}" aria-label="Открыть фото: ${escape(caption)}">${imgMarkup(item,caption)}</button>`:emptyMemory();
    return card?`<figure class="memory-card">${body}<figcaption>${escape(caption)}</figcaption></figure>`:body;
  }
  function album(c,caption){
    const items=galleryMedia(c);if(!items.length)return '';
    return `<div class="chapter-album" data-album="${c.prefix}"><figure class="album-frame"><button class="media-button album-main" data-photo="${escape(items[0].name)}" data-group="${c.prefix}" data-gallery-index="0" aria-label="Открыть фото: ${escape(caption)}">${imgMarkup(items[0],caption)}</button><figcaption><span>${escape(caption)}</span><small class="album-count">1 / ${items.length}</small></figcaption></figure>${items.length>1?`<div class="album-thumbs" aria-label="Выбрать фотографию">${items.map((item,i)=>`<button class="album-thumb" data-album-select="${i}" aria-label="Фото ${i+1}" aria-pressed="${i===0}">${imgMarkup(item,`Фото ${i+1}`)}</button>`).join('')}</div>`:''}</div>`;
  }
  function driveVideo(value){
    if(typeof value!=='string'||!value.trim())return null;
    try{
      const url=new URL(value.trim());
      if(url.protocol!=='https:'||url.hostname!=='drive.google.com')return null;
      const id=url.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/)?.[1]||url.searchParams.get('id');
      if(!id||!/^[A-Za-z0-9_-]{10,200}$/.test(id))return null;
      const resource=url.searchParams.get('resourcekey');
      const query=resource?'?'+new URLSearchParams({resourcekey:resource}).toString():'';
      return {embed:`https://drive.google.com/file/d/${id}/preview${query}`,view:`https://drive.google.com/file/d/${id}/view${query}`};
    }catch{return null;}
  }
  function video(name,caption,compact=false){
    const drive=driveVideo(window.STORY_VIDEOS?.[normal(name)]);
    const item=findMedia(name,'video');
    const body=drive?`<div class="drive-video"><iframe data-drive-player src="${escape(drive.embed)}" title="${escape(caption)}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><a class="video-external" href="${escape(drive.view)}" target="_blank" rel="noopener noreferrer">Открыть видео отдельно ↗</a></div>`:item?`<video controls playsinline preload="metadata" aria-label="${escape(caption)}"><source src="${escape(item.url)}">Твой браузер не поддерживает это видео. <a href="${escape(item.url)}">Открыть видео</a></video>`:emptyMemory(compact?'Наш громкий вечер.':'У этого воспоминания есть звук. И ты.');
    return compact?body:`<div class="video-shell">${body}</div><div class="video-caption"><span>${escape(caption)}</span><span>для двоих ♡</span></div>`;
  }
  function copy(c){return `<div class="copy reveal-part"><p class="chapter-date">${c.date}</p><h2 tabindex="-1">${c.title}</h2><div class="body-copy">${c.paragraphs.map(p=>`<p>${p}</p>`).join('')}</div>${c.note?`<p class="tiny-note">${c.note}</p>`:''}</div>`;}
  function visual(c){
    switch(c.kind){
      case 'meet':return `<div class="couple-photos"><figure class="polaroid"><img src="${window.PHOTOS.oleg}" alt="Олег до перекраски, со светлыми волосами"><figcaption>Олег</figcaption></figure><figure class="polaroid"><img src="${window.PHOTOS.nastya}" alt="Настя на закате у реки"><figcaption>Настя</figcaption></figure><button class="like-button ${state.liked?'liked':''}" data-action="like" aria-label="Ответить взаимным лайком" aria-pressed="${state.liked}">${state.liked?'♥':'♡'}</button><p class="handwritten">${state.liked?'взаимно ♡':'всё началось с сердечка'}</p></div>`;
      case 'photo':return photo(c.media,c.caption);
      case 'pair':return `<div class="photo-pair">${photo(c.media[0],'Немного творчества')}${photo(c.media[1],'И много нас')}</div>`;
      case 'sunrise':return `${allMedia(c.prefix).length?`<div class="dawn-memory ${state.sunrise?'sunrise':''}">${album(c,'Наш первый рассвет.')}</div>`:`<div class="dawn-orb ${state.sunrise?'sunrise':''}" aria-hidden="true"></div>`}<p class="dawn-message">${state.sunrise?'Солнце встаёт.<br>А я всё ещё смотрю на тебя.':'То самое утро на балконе.'}</p>`;
      case 'lock':return `<div class="lock-interaction ${state.locked?'locked':''}"><div class="initial-heart"><span class="heart-icon" aria-hidden="true">♡</span>Н</div><span class="lock-line" aria-hidden="true"></span><div class="initial-heart"><span class="heart-icon" aria-hidden="true">♡</span>О</div><p class="lock-caption">${state.locked?'Теперь точно никуда друг без друга.':'На моём — Н. На твоём — О.'}</p></div>`;
      case 'newyear':return `<div class="time-display">02:00<small>ЛУЧШАЯ ЧАСТЬ НОЧИ НАЧАЛАСЬ</small></div>${state.gift?'<div class="gift-note">Мой самый любимый подарок — время с тобой.</div>':''}`;
      case 'video':return video(c.media,c.caption);
      case 'birthday':return allMedia(c.prefix).length?`<div class="birthday-album"><span class="birthday-stamp" aria-hidden="true">18 ♡</span>${album(c,'Моя любимая именинница.')}</div>`:`<div class="birthday-number">18<span>И столько всего впереди ♡</span></div>`;
      case 'concert':return `<div class="concert-grid">${[1,2,3].map(n=>photo('kpss'+n,'Мы на концерте · '+n,false)).join('')}</div><div class="concert-clips">${video(c.media,'Слава КПСС. Наш вечер.',true)}</div>`;
      case 'wine':return findMedia(c.media)?photo(c.media,'Этот вечер. Ты рядом. Наша музыка.'):`<div class="centered"><span class="large-symbol" aria-hidden="true">♫</span><p class="dawn-message">У каждого «нас»<br>есть своя музыка.</p><div class="gift-note">Этот вечер.<br>Ты рядом.<br>Больше ничего не нужно.</div></div>`;
      case 'altai':return allMedia(c.prefix).length?album(c,'Алтай. Там, где мы всё время вместе.'):`<figure class="altai-photo"><img src="${window.PHOTOS.altai}" alt="Олег у подвесного моста в горах Алтая"><figcaption>Алтай. Там, где мы всё время вместе.</figcaption></figure>`;
      default:return '';
    }
  }
  function galleryMarkup(c){
    const items=galleryMedia(c);
    const photos=items.length?items.map((item,i)=>`<button class="film-photo" data-photo="${escape(item.name)}" data-group="${c.prefix}" data-gallery-index="${i}" aria-label="Открыть воспоминание ${i+1}">${imgMarkup(item,`Наше воспоминание · ${i+1}`)}<span>мы / ${String(i+1).padStart(2,'0')}</span></button>`).join(''):[0,1,2].map((n)=>`<div class="film-photo">${emptyMemory(['Всё, что хочется сохранить.','Мой любимый человек.','И ещё столько всего впереди.'][n])}<span>мы / ♡</span></div>`).join('');
    return `<article class="scene gallery-scene scene-enter" data-scene="${c.id}"><div class="gallery-heading"><div><p class="chapter-date">${c.date}</p><h2 tabindex="-1">${c.title}</h2></div><div class="body-copy"><p>${c.paragraphs.join('</p><p>')}</p></div></div><div class="filmstrip" tabindex="0" aria-label="Лента воспоминаний, можно листать">${photos}</div><div class="gallery-footer"><span>Листай и открывай любимые моменты ↔</span><div class="gallery-tools"><button class="icon-button" data-film="-1" aria-label="Листать фото назад">←</button><button class="icon-button" data-film="1" aria-label="Листать фото вперёд">→</button></div>${c.id==='session'?`<div class="hair-demo"><span class="hair-sprite ${state.dark?'dark':''}" aria-hidden="true"></span><button class="text-action" data-action="hair">${state.dark?'Новый цвет. Всё тот же я ♡':'А теперь — покрасить волосы'} <span>✦</span></button></div>`:''}</div>${c.id==='love'?'<p class="ending-line">История пишется. И мы сами пишем нашу историю.<br>Я люблю тебя, Настя. Твой Олег.</p>':''}</article>`;
  }
  function sceneMarkup(c){
    if(c.kind==='gallery')return galleryMarkup(c);
    if(c.kind==='breath')return `<article class="scene centered scene-enter" data-scene="${c.id}"><div class="breathing-heart" aria-hidden="true">♡</div>${copy(c)}<div class="game-invite"><button class="primary" data-action="quest">Наше маленькое приключение <span aria-hidden="true">→</span></button><small>${matchMedia('(pointer:coarse), (max-width:700px)').matches?'Ты играешь, я прикрываю ♡':'На двоих. Одна клавиатура, одна команда ♡'}</small></div><p class="breath-note">Побудь здесь столько, сколько хочется.</p></article>`;
    if(c.kind==='letter')return `<article class="scene letter-scene scene-enter" data-scene="${c.id}"><div class="letter-layout"><div><p class="chapter-date">${c.date}</p><h2 tabindex="-1">${c.title}</h2><p class="letter-signature">Для тебя. Всегда.</p></div><div class="body-copy">${c.paragraphs.map(p=>`<p>${p}</p>`).join('')}<p class="letter-signature">Твой Олег ♡</p></div></div></article>`;
    return `<article class="scene scene-enter" data-scene="${c.id}"><div class="scene-grid">${copy(c)}<div class="visual reveal-part" style="--delay:130ms">${visual(c)}</div></div></article>`;
  }
  function render(announce=true){
    const c=story[state.chapter];
    $('#stage').innerHTML=sceneMarkup(c);
    const extra={sunrise:['sunrise',state.sunrise?'Ещё один рассвет':'Встретить рассвет','☀'],lock:['lock',state.locked?'Замочек закрыт ♡':'Закрыть наш замочек','♡'],newyear:['gift',state.gift?'Ты — мой подарок ♡':'А что было в подарке?','✦']};
    if(extra[c.kind]){const [action,label,icon]=extra[c.kind];const button=document.createElement('button');button.className='text-action';button.dataset.action=action;button.innerHTML=`${label} <span aria-hidden="true">${icon}</span>`;$('#stage .copy').append(button);}
    $('#previous').disabled=state.chapter===0;
    $('#next').innerHTML=`${c.next||'Дальше'} <span aria-hidden="true">${state.chapter===story.length-1?'↺':'→'}</span>`;
    $('#chapter-count').textContent=`${String(state.chapter+1).padStart(2,'0')} / ${story.length}`;
    $('#chapter-name').textContent=c.name;
    $('#progress-fill').style.width=((state.chapter+1)/story.length*100)+'%';
    document.title=`${c.name} · Олег + Настя ♡`;
    $('#together').textContent=togetherDays();
    const since=$('[data-since-meeting]');if(since)since.textContent=elapsed();
    if(state.chapter<8)setHair(false,false);
    if(state.chapter>8)setHair(true,false);
    updateBackground(c.id);
    attachMediaErrors();
    if(announce){clearTimeout(toastDelay);if(c.achievement)toastDelay=setTimeout(()=>achievement(...c.achievement),reduced?100:1250);if(c.id==='session'){setHair(false,false);toastDelay=setTimeout(()=>{if(state.chapter===8)setHair(true,true);},reduced?100:2400);}}
  }
  function updateBackground(id){
    const base='radial-gradient(ellipse at 78% 38%,#972f59 0,transparent 58%),radial-gradient(ellipse at 8% 90%,#652642 0,transparent 55%),#380d22';
    const backgrounds={sunrise:state.sunrise?'radial-gradient(ellipse at 80% 75%,#b86777,transparent 65%),linear-gradient(130deg,#341333,#8d3d60)':'radial-gradient(ellipse at 80% 55%,#4a3668,transparent 70%),#291127',concert:'radial-gradient(ellipse at 76% 40%,#913362,transparent 65%),#230b24',altai:'radial-gradient(ellipse at 85% 45%,#555064,transparent 65%),#321827',breathe:'radial-gradient(ellipse at 50% 50%,#602541,transparent 60%),#290f20'};
    $('#color-wash').style.background=backgrounds[id]||base;
  }
  async function navigate(n){
    if(state.busy||!state.opened)return;
    if(n<0||n>=story.length)return;
    state.busy=true;clearTimeout(toastDelay);$('#achievement').classList.remove('show');
    document.querySelectorAll('video').forEach(v=>v.pause());
    document.querySelectorAll('[data-drive-player]').forEach(frame=>{frame.src='about:blank';});
    const old=$('#stage .scene');
    if(old&&!reduced){try{await old.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-15px)'}],{duration:220,easing:'ease-in'}).finished;}catch{}}
    state.chapter=n;window.scrollTo({top:0,behavior:'instant'});render();
    $('#stage h2')?.focus({preventScroll:true});chime('next');
    state.busy=false;
  }
  function achievement(title,description,icon='♥',repeat=false){
    if(seen.has(title)&&!repeat)return;seen.add(title);
    clearTimeout(toastTimer);$('#achievement-title').textContent=title;$('#achievement-text').textContent=description;$('#achievement-icon').textContent=icon;$('#achievement').classList.add('show');chime('achievement');
    toastTimer=setTimeout(()=>$('#achievement').classList.remove('show'),4600);
  }
  function chime(type='tap'){
    if(!state.sound)return;
    try{audioContext ||=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const notes=type==='achievement'?[523,659,784,1047]:type==='next'?[440,554]:[659,880];notes.forEach((frequency,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime+i*.09;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.035,t+.01);gain.gain.exponentialRampToValueAtTime(.001,t+.23);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.25);});}catch{state.sound=false;}
  }
  function attachMediaErrors(){
    $('#stage').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const btn=img.closest('.media-button,.film-photo');const holder=document.createElement('div');holder.innerHTML=emptyMemory();img.replaceWith(holder.firstElementChild);if(btn){btn.removeAttribute('data-photo');btn.removeAttribute('aria-label');btn.disabled=true;}},{once:true}));
    $('#stage').querySelectorAll('video').forEach(v=>{const showError=()=>{if(v.parentNode){const msg=document.createElement('p');msg.className='tiny-note';msg.append('Не получилось воспроизвести видео. ');const a=document.createElement('a');a.href=v.querySelector('source')?.src||v.src;a.textContent='Открыть отдельно';msg.append(a);v.replaceWith(msg);}};v.addEventListener('error',showError,{once:true});v.querySelector('source')?.addEventListener('error',showError,{once:true});});
  }
  async function loadMedia(){
    try{const r=await fetch('./media-index.json',{cache:'no-cache'});if(r.ok){const data=await r.json();mediaFiles=Array.isArray(data.files)?data.files.filter(f=>typeof f==='string'):[];}}
    catch{}
    if(state.opened&&!state.busy&&mediaFiles.length)render(false);
    const previousFiles=mediaFiles.join('\n');
    // Also discover recent uploads when Pages is deployed directly from the branch.
    try{const r=await fetch('https://api.github.com/repos/arcyuke/myreallove/git/trees/main?recursive=1',{signal:AbortSignal.timeout(8000)});if(r.ok){const data=await r.json();if(Array.isArray(data.tree)&&!data.truncated)mediaFiles=data.tree.filter(item=>item.type==='blob'&&(imagePattern.test(item.path)||videoPattern.test(item.path))).map(item=>item.path);}}catch{}
    indexReady=true;
    if(state.opened&&!state.busy&&mediaFiles.join('\n')!==previousFiles)render(false);
  }
  function showChapters(){
    $('#chapters-list').innerHTML=story.map((c,i)=>`<button data-chapter="${i}" class="${i===state.chapter?'current':''}" ${i===state.chapter?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span>${escape(c.name)}</button>`).join('');
    $('#chapters-dialog').showModal();
  }
  function showPhoto(name,group,index){
    const chapter=group?story.find(c=>c.prefix===group):null;
    openGallery=chapter?galleryMedia(chapter):[findMedia(name)].filter(Boolean);
    galleryPosition=Number.isInteger(index)&&index>=0&&index<openGallery.length?index:Math.max(0,openGallery.findIndex(item=>item.name===name));
    if(!openGallery.length)return;
    drawLightbox();$('#lightbox').showModal();
  }
  function drawLightbox(){
    const item=openGallery[galleryPosition];
    $('#lightbox-media').innerHTML=imgMarkup(item,`Наше воспоминание ${galleryPosition+1}`);
    $('#lightbox-caption').textContent=`${galleryPosition+1} / ${openGallery.length} · наши моменты`;
    $('#lightbox-prev').disabled=openGallery.length<2;$('#lightbox-next').disabled=openGallery.length<2;
    const img=$('#lightbox img');img.addEventListener('error',()=>{$('#lightbox-media').innerHTML=emptyMemory('Этот кадр не открылся. Давай посмотрим следующий.');},{once:true});
  }
  function movePhoto(delta){galleryPosition=(galleryPosition+delta+openGallery.length)%openGallery.length;drawLightbox();}
  function setHair(dark,celebrate){state.dark=dark;$('#boy').classList.toggle('dark',dark);$('.hair-sprite')?.classList.toggle('dark',dark);if(celebrate){burst(innerWidth*.6,innerHeight*.55,45);achievement('Новый цвет?','Чёрные волосы. Всё тот же любимый я.','✦',true);const b=$('[data-action="hair"]');if(b)b.innerHTML='Новый цвет. Всё тот же я ♡ <span>✦</span>';}}
  $('#stage').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.albumSelect!==undefined){
      const holder=button.closest('[data-album]'),c=story.find(item=>item.prefix===holder.dataset.album),items=galleryMedia(c),i=Number(button.dataset.albumSelect),item=items[i];
      if(!item)return;
      const main=holder.querySelector('.album-main');main.innerHTML=imgMarkup(item,`Наше воспоминание ${i+1}`);main.dataset.photo=item.name;main.dataset.galleryIndex=String(i);
      holder.querySelector('.album-count').textContent=`${i+1} / ${items.length}`;
      holder.querySelectorAll('.album-thumb').forEach((thumb,n)=>thumb.setAttribute('aria-pressed',String(n===i)));
      attachMediaErrors();return;
    }
    if(button.dataset.photo){showPhoto(button.dataset.photo,button.dataset.group,button.dataset.galleryIndex===undefined?undefined:Number(button.dataset.galleryIndex));return;}
    if(button.dataset.film){$('.filmstrip').scrollBy({left:Number(button.dataset.film)*270,behavior:reduced?'instant':'smooth'});return;}
    const rect=button.getBoundingClientRect(),action=button.dataset.action;
    if(!action)return;burst(rect.x+rect.width/2,rect.y+rect.height/2,18);chime();
    if(action==='like'){state.liked=true;button.classList.add('liked');button.textContent='♥';button.setAttribute('aria-pressed','true');$('.handwritten').textContent='взаимно ♡';achievement('Взаимно!','Один лайк изменил всё.','♥');}
    if(action==='sunrise'){state.sunrise=true;$('.dawn-orb')?.classList.add('sunrise');$('.dawn-memory')?.classList.add('sunrise');$('.dawn-message').innerHTML='Солнце встаёт.<br>А я всё ещё смотрю на тебя.';button.innerHTML='Наше утро ♡';updateBackground('sunrise');}
    if(action==='lock'){state.locked=true;$('.lock-interaction').classList.add('locked');$('.lock-caption').textContent='Теперь точно никуда друг без друга.';button.innerHTML='Замочек закрыт ♡';achievement('Под замочком','Ключи — только друг у друга.','⚿',true);}
    if(action==='gift'){state.gift=true;if(!$('.gift-note'))$('.visual').insertAdjacentHTML('beforeend','<div class="gift-note">Мой самый любимый подарок — время с тобой.</div>');button.innerHTML='Ты — мой подарок ♡';}
    if(action==='hair')setHair(true,true);
    if(action==='quest')window.LoveQuest.open({onAchievement:(title,description,icon)=>achievement(title,description,icon),onClose:()=>{last=performance.now();}});
  });
  $('#previous').addEventListener('click',()=>navigate(state.chapter-1));
  $('#next').addEventListener('click',()=>navigate(state.chapter===story.length-1?0:state.chapter+1));
  $('#chapter-menu').addEventListener('click',showChapters);$('#chapter-progress').addEventListener('click',showChapters);
  $('#chapters-list').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b){$('#chapters-dialog').close();navigate(Number(b.dataset.chapter));}});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  $('#lightbox-prev').addEventListener('click',()=>movePhoto(-1));$('#lightbox-next').addEventListener('click',()=>movePhoto(1));
  $('#sound').addEventListener('click',()=>{state.sound=!state.sound;$('#sound').setAttribute('aria-pressed',String(state.sound));$('#sound').setAttribute('aria-label',state.sound?'Выключить звуки':'Включить звуки');$('#sound span').textContent=state.sound?'звук вкл.':'звук выкл.';chime();});
  document.addEventListener('keydown',e=>{
    if(!state.opened||window.LoveQuest?.active||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
    if($('#lightbox').open){if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();movePhoto(e.key==='ArrowLeft'?-1:1);}return;}
    if($('#chapters-dialog').open||e.target.closest('input,textarea,video,.filmstrip'))return;
    if(e.key==='ArrowRight'){e.preventDefault();navigate(Math.min(state.chapter+1,story.length-1));}
    if(e.key==='ArrowLeft'){e.preventDefault();navigate(state.chapter-1);}
  });
  let touchStart=null;
  $('#lightbox-media').addEventListener('touchstart',e=>{touchStart=e.touches.length===1?e.touches[0].clientX:null;},{passive:true});
  $('#lightbox-media').addEventListener('touchend',e=>{if(touchStart!==null&&Math.abs(e.changedTouches[0].clientX-touchStart)>50)movePhoto(e.changedTouches[0].clientX>touchStart?-1:1);touchStart=null;},{passive:true});
  // Один canvas для всех частиц: нет сотен лишних элементов на телефоне.
  const canvas=$('#hearts'),ctx=canvas.getContext('2d');let w=innerWidth,h=innerHeight,particles=[],last=0,lastRain=0,frameId;
  function resizeCanvas(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);}
  resizeCanvas();addEventListener('resize',resizeCanvas);
  function burst(x,y,count=25){if(reduced)return;for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*280;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,size:5+Math.random()*12,life:2+Math.random()*1.5,max:3.5,angle:Math.random()*6,spin:(Math.random()-.5)*3,burst:true});}particles=particles.slice(-180);}
  function paintHeart(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=p.burst?Math.min(1,p.life):.16;ctx.fillStyle=p.burst?'#ffb6d1':'#ee9abe';ctx.beginPath();const s=p.size;ctx.moveTo(0,s*.4);ctx.bezierCurveTo(-s*1.15,-s*.3,-s*.6,-s,0,-s*.45);ctx.bezierCurveTo(s*.6,-s,s*1.15,-s*.3,0,s*.4);ctx.fill();ctx.restore();}
  const between=(min,max)=>min+Math.random()*(max-min);
  const limit=(value,min,max)=>Math.max(min,Math.min(max,value));
  function walkBounds(){
    const size=w<=700?88:108,maxY=Math.max(8,h-104-size);
    return {size,minX:8,maxX:Math.max(8,w-size-8),minY:Math.min(125,maxY),maxY};
  }
  const actors=[
    {el:$('#boy'),x:w*.1,y:h-220,speed:47},
    {el:$('#girl'),x:w*.79,y:h-220,speed:43}
  ];
  const snacks={
    pizza:'<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><path fill="#9d5531" d="M2 3h20v5H2z"/><path fill="#efb76b" d="M3 2h18v4H3z"/><path fill="#ffdf8c" d="M3 7h18v3H19v4h-3v4h-3v4h-2v-4H8v-4H5v-4H3z"/><path fill="#be4155" d="M6 8h4v4H6zm8 1h4v4h-4zm-4 5h4v3h-4z"/></svg>',
    energy:'<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><path fill="#bfc0cf" d="M7 2h10v3H7zm0 17h10v3H7z"/><path fill="#393044" d="M6 5h12v14H6z"/><path fill="#d99ac9" d="M8 5h8v14H8z"/><path fill="#fff0cb" d="M12 6h3l-3 5h3l-5 7 1-5H9z"/></svg>',
    shawarma:'<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><path fill="#80a763" d="M6 3h4V1h4v2h4v6H6z"/><path fill="#cc6653" d="M7 4h4v4H7zm7-2h3v5h-3z"/><path fill="#e7bd82" d="M4 7h16v5h-2v7h-2v4H8v-4H6v-7H4z"/><path fill="#b48257" d="M6 10h3v4H6zm7-2h3v3h-3zm-3 9h5v2h-5z"/><path fill="#fff0dc" d="M6 14h3v2h9v3h-2v4H8v-4H6z"/></svg>',
    coffee:'<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><g class="snack-steam" fill="#fff0db"><path d="M8 1h2v4H8zm6 1h2v3h-2z"/></g><path fill="#f7dbbf" d="M4 7h15v11h-2v3H6v-3H4zm15 2h4v7h-4v-2h2v-3h-2z"/><path fill="#87482f" d="M6 7h11v3H6z"/><path fill="#d7798b" d="M8 12h3v2h2v-2h3v4h-2v2h-4v-2H8z"/><path fill="#cdb4b8" d="M3 22h17v2H3z"/></svg>',
    sushi:'<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><path fill="#b97c63" d="M1 13h22v7H1z"/><path fill="#5f3741" d="M3 20h3v3H3zm15 0h3v3h-3z"/><path fill="#fff0d7" d="M3 8h8v7H3zm10 0h8v7h-8z"/><path fill="#eb9981" d="M2 5h10v5H2zm10 0h10v5H12z"/><path fill="#ffd4b1" d="M4 5h2v5H4zm11 0h2v5h-2z"/><path fill="#3c5244" d="M8 5h2v10H8zm10 0h2v10h-2z"/></svg>',
    tomyam:'<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><g class="snack-steam" fill="#ffe6cc"><path d="M7 1h2v4H7zm8 0h2v5h-2z"/></g><path fill="#b84d34" d="M3 8h18v7H3z"/><path fill="#f4a357" d="M5 8h14v5H5z"/><path fill="#f8d9a4" d="M7 8h3v2H8v2H6V9h1zm8 1h3v3h-4v-2h1z"/><path fill="#6b9a55" d="M11 7h3v3h-3z"/><path fill="#fbe0d4" d="M1 12h22v4h-2v3h-3v2H6v-2H3v-3H1z"/><path fill="#cf8599" d="M7 21h10v2H7z"/></svg>'
  };
  // Перемешанная колода: все десять сценок появляются до повторения.
  const encounters=[
    {kind:'gift',gifts:['pizza','energy'],first:0,lines:['Угощайся, любимая. Пицца для тебя ♡','А тебе энергетик. Для долгих обнимашек!']},
    {kind:'gift',gifts:['','shawarma'],first:1,lines:['Ты знаешь самый вкусный путь к моему сердцу ♡','Несла тебе шаурму. Даже не откусила!']},
    {kind:'gift',gifts:['coffee',''],first:0,lines:['Кофе для тебя. Поцелуй с меня ♡','С тобой даже обычный день — свидание.']},
    {kind:'gift',gifts:['','sushi'],first:1,lines:['Последний ролл тебе. Вот такая любовь ♡','Я принесла суши! Устроим маленькое свидание?']},
    {kind:'gift',gifts:['tomyam',''],first:0,lines:['Том ям для моей любимой. Осторожно, горячий!','Сначала суп. Потом обниму своего повара ♡']},
    {kind:'hug',first:0,lines:['Просто захотел тебя обнять ♡','Вот так и стой. Мне очень хорошо.']},
    {kind:'hug',first:1,lines:['Я тоже соскучился. Иди ко мне ♡','Мы виделись минуту назад. Я уже скучаю!']},
    {kind:'hug',first:0,lines:['Ты моё самое любимое место на свете.','А ты мой дом. Даже посреди этой страницы ♡']},
    {kind:'makeup',offended:1,first:0,pout:'Я чуть-чуть обиделась…',lines:['Люблю тебя. Прости ♡','И я тебя люблю. Обними покрепче.']},
    {kind:'makeup',offended:0,first:1,pout:'Я немножко надулся…',lines:['Всё, больше не дуюсь. Иди в мои объятия ♡','Люблю тебя. Прости. Давай обнимемся?']}
  ];
  let encounterDeck=[],lastEncounter=null,meeting=null,dispersing=false;
  let meetingClock=0,nextMeetingAfter=between(30,42);
  function randomMeetingGap(){
    const chance=Math.random();
    return chance<.3?between(22,30):chance<.75?between(34,44):between(48,62);
  }
  function nextEncounter(){
    if(!encounterDeck.length){
      encounterDeck=[...encounters];
      for(let i=encounterDeck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[encounterDeck[i],encounterDeck[j]]=[encounterDeck[j],encounterDeck[i]];}
      if(encounterDeck.at(-1)===lastEncounter)[encounterDeck[0],encounterDeck[encounterDeck.length-1]]=[encounterDeck.at(-1),encounterDeck[0]];
    }
    return lastEncounter=encounterDeck.pop();
  }
  function walkTarget(actor,side){
    const b=walkBounds(),span=b.maxX-b.minX;
    if(side!==undefined){
      actor.target=b.minX+span*(side===0?between(.02,.15):between(.85,.98));
      actor.targetY=between(b.minY,b.maxY);return;
    }
    const minimum=Math.min(180,Math.hypot(span,b.maxY-b.minY)*.35);
    let best={x:actor.x,y:actor.y,d:-1};
    for(let attempt=0;attempt<12;attempt++){
      const x=between(b.minX,b.maxX),y=Math.random()<.25?b.maxY:between(b.minY,b.maxY),d=Math.hypot(x-actor.x,y-actor.y);
      if(d>best.d)best={x,y,d};
      if(d>=minimum){best={x,y,d};break;}
    }
    actor.target=best.x;actor.targetY=best.y;
  }
  function moveActor(actor,x,y,speed,dt){
    const dx=x-actor.x,dy=y-actor.y,d=Math.hypot(dx,dy),step=Math.min(d,speed*dt);
    actor.el.classList.toggle('walking',d>1);
    if(d>1){actor.x+=dx/d*step;actor.y+=dy/d*step;if(Math.abs(dx)>1)actor.el.classList.toggle('left',dx<0);}
    return {arrived:d<=step+1,distance:step};
  }
  function say(actor,line,duration=3.8){
    actors.forEach(a=>{a.speechTime=0;a.el.classList.remove('talking');});
    actor.bubble.textContent=line;actor.speechTime=duration;actor.el.classList.add('talking');
  }
  function give(actor,snack){actor.gift.innerHTML=snacks[snack]||'';actor.el.classList.toggle('carrying',Boolean(snack));}
  function paintActors(){
    const b=walkBounds(),bubbleWidth=Math.min(w<=700?160:190,w-24);
    actors.forEach(a=>{
      a.el.style.transform=`translate3d(${a.x}px,${a.y}px,0)`;
      const center=a.x+b.size/2;
      a.bubble.style.setProperty('--bubble-shift',`${limit(center,12+bubbleWidth/2,w-12-bubbleWidth/2)-center}px`);
    });
  }
  actors.forEach(actor=>{
    const b=walkBounds();actor.x=limit(actor.x,b.minX,b.maxX);actor.y=limit(actor.y,b.minY,b.maxY);
    Object.assign(actor,{pause:0,walked:0,speechTime:0,departed:false,bubble:actor.el.querySelector('.bubble')});
    actor.gift=document.createElement('span');actor.gift.className='walker-gift';actor.gift.setAttribute('aria-hidden','true');actor.el.append(actor.gift);
    walkTarget(actor);
  });
  function meetingPlace(gap){
    const b=walkBounds(),margin=b.size/2+gap/2+10;
    const center=limit(meeting.xFraction*w,Math.min(w/2,margin),Math.max(w/2,w-margin));
    const y=limit(meeting.yFraction*h,Math.min(b.maxY,205),b.maxY);
    return {center,y,targets:[center-b.size/2-gap/2,center-b.size/2+gap/2]};
  }
  function startMeeting(){
    const scene=nextEncounter(),b=walkBounds();
    meeting={scene,phase:scene.kind==='makeup'?'pout':'approach',time:0,replied:false,xFraction:between(w<=700 ? .46 : .3,w<=700 ? .54 : .7),yFraction:between(.6,.84)};
    actors.forEach((a,i)=>{a.pause=0;a.speechTime=0;a.el.classList.remove('talking','walking');give(a,scene.gifts?.[i]);});
    if(scene.kind==='makeup'){
      const a=actors[scene.offended],other=actors[1-scene.offended];
      meeting.xFraction=(a.x+b.size/2+(scene.offended===0?1:-1)*b.size*.18)/w;
      meeting.yFraction=a.y/h;a.el.classList.add('pouting');a.el.classList.toggle('left',other.x>a.x);
      say(a,scene.pout,2.7);
    }
  }
  function finishMeeting(){
    meeting=null;dispersing=true;meetingClock=0;
    actors.forEach((a,i)=>{
      a.el.classList.remove('running','talking','sharing','hugging','pouting','delighted');give(a,'');
      a.pause=0;a.speechTime=0;a.departed=false;walkTarget(a,i);
    });
  }
  function meetingUpdate(dt){
    const scene=meeting.scene,b=walkBounds(),close=scene.kind!=='gift'||meeting.phase==='cuddle';
    const place=meetingPlace(b.size*(close ? .36 : .72));meeting.time+=dt;
    if(meeting.phase==='pout'){
      if(meeting.time>=2.7){meeting.phase='approach';meeting.time=0;}
      return;
    }
    if(meeting.phase==='approach'){
      const arrived=actors.map((a,i)=>{
        a.el.classList.add('running');return moveActor(a,place.targets[i],place.y,190,dt).arrived;
      }).every(Boolean);
      if(arrived){
        meeting.phase='chat';meeting.time=0;
        actors.forEach((a,i)=>{
          a.el.classList.remove('running','walking','pouting');a.el.classList.toggle('left',i===1);
          a.el.classList.add(close?'hugging':'sharing');
        });
        say(actors[scene.first],scene.lines[scene.first]);burst(place.center,place.y+15,18);chime();
      }
    }else if(meeting.phase==='chat'){
      if(meeting.time>=3.8&&!meeting.replied){
        meeting.replied=true;say(actors[1-scene.first],scene.lines[1-scene.first],4.1);
        if(scene.kind==='gift')actors.forEach((a,i)=>{give(a,scene.gifts[1-i]);a.el.classList.add('delighted');});
        burst(place.center,place.y+25,10);
      }
      if(meeting.time>=7.8){
        if(scene.kind==='gift'){
          meeting.phase='cuddle';meeting.time=0;
          actors.forEach(a=>{give(a,'');a.el.classList.remove('sharing','delighted');a.el.classList.add('hugging');});
          burst(place.center,place.y+15,12);
        }else finishMeeting();
      }
    }else if(meeting.phase==='cuddle'){
      actors.forEach((a,i)=>{moveActor(a,place.targets[i],place.y,65,dt);a.el.classList.remove('walking');a.el.classList.toggle('left',i===1);});
      if(meeting.time>=2.8)finishMeeting();
    }
  }
  function wanderUpdate(actor,dt){
    if(dispersing&&actor.departed){actor.el.classList.remove('walking');return;}
    if(actor.pause>0){actor.pause-=dt;actor.el.classList.remove('walking');return;}
    const moved=moveActor(actor,actor.target,actor.targetY,dispersing?76:actor.speed,dt);
    if(!dispersing)actor.walked+=moved.distance;
    if(moved.arrived){
      if(dispersing)actor.departed=true;
      else{walkTarget(actor);actor.pause=between(.6,2.8);}
    }
  }
  function companionsUpdate(dt){
    const b=walkBounds();
    actors.forEach(a=>{
      a.x=limit(a.x,b.minX,b.maxX);a.y=limit(a.y,b.minY,b.maxY);
      a.target=limit(a.target,b.minX,b.maxX);a.targetY=limit(a.targetY,b.minY,b.maxY);
      a.speechTime=Math.max(0,a.speechTime-dt);if(!a.speechTime)a.el.classList.remove('talking');
    });
    if(meeting)meetingUpdate(dt);
    else if(dispersing){
      actors.forEach(a=>wanderUpdate(a,dt));
      if(actors.every(a=>a.departed)){
        // Полный новый интервал начинается только после расхождения героев.
        dispersing=false;meetingClock=0;nextMeetingAfter=randomMeetingGap();
        actors.forEach(a=>{a.walked=0;walkTarget(a);a.pause=between(.5,1.5);});
      }
    }else{
      actors.forEach(a=>wanderUpdate(a,dt));meetingClock+=dt;
      const minimumWalk=Math.min(180,Math.hypot(b.maxX-b.minX,b.maxY-b.minY)*.3);
      if(meetingClock>=nextMeetingAfter&&actors.every(a=>a.walked>=minimumWalk&&!a.speechTime))startMeeting();
    }
    paintActors();
  }
  actors.forEach((actor,i)=>actor.el.addEventListener('click',()=>{
    if(meeting||dispersing)return;
    actor.pause=3.5;
    const lines=[['Я рядом ♡','Люблю тебя','Твой Олег','Ты сегодня особенно красивая ♡'],['И я рядом ♡','Ещё одно сердечко?','Твоя Настя','Поймай мой воздушный поцелуй ♡']][i];
    say(actor,lines[Math.floor(Math.random()*lines.length)],3.3);
    const r=actor.el.getBoundingClientRect();burst(r.x+r.width/2,r.y+15,15);chime();
  }));
  function animate(t){
    const dt=Math.min((t-last)/1000||.016,.05);last=t;ctx.clearRect(0,0,w,h);
    if(state.opened&&!reduced){
      if(t-lastRain>550&&particles.length<150){particles.push({x:Math.random()*w,y:-20,vx:(Math.random()-.5)*13,vy:23+Math.random()*24,size:4+Math.random()*8,life:45,angle:Math.random()*3,spin:(Math.random()-.5)*.4});lastRain=t;}
      if(!window.LoveQuest?.active&&!document.querySelector('dialog[open]'))companionsUpdate(dt);
    }
    particles=particles.filter(p=>p.life>0&&p.y<h+35);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;if(p.burst){p.vy+=65*dt;p.vx*=.994;}paintHeart(p);});
    frameId=requestAnimationFrame(animate);
  }
  document.addEventListener('visibilitychange',()=>{if(!state.opened||reduced)return;cancelAnimationFrame(frameId);if(document.hidden){document.querySelectorAll('video').forEach(v=>v.pause());}else{last=performance.now();frameId=requestAnimationFrame(animate);}});
  function startExperience(event){
    if(state.opened)return;state.opened=true;clearTimeout(introTimer);$('#open-story').disabled=true;
    const r=event.currentTarget.getBoundingClientRect();document.body.classList.add('opened');document.querySelector('meta[name="theme-color"]').content='#4b1028';burst(r.x+r.width/2,r.y+r.height/2,110);
    $('#experience').hidden=false;render();
    const intro=$('#intro');intro.style.position='fixed';intro.style.inset='0';intro.style.zIndex='20';intro.style.pointerEvents='none';
    if(reduced){intro.hidden=true;$('#stage h2')?.focus({preventScroll:true});}else{intro.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.08)'}],{duration:1050,fill:'forwards',easing:'cubic-bezier(.3,0,.2,1)'}).finished.then(()=>{intro.hidden=true;$('#stage h2')?.focus({preventScroll:true});});}
    paintActors();last=performance.now();if(!reduced)frameId=requestAnimationFrame(animate);
  }
  $('#open-story').addEventListener('click',startExperience);
  const introText='История пишется.\nИ мы сами пишем\nнашу историю.';let char=0;
  function type(){if(state.opened)return;$('#typed').textContent=introText.slice(0,++char);if(char<introText.length)introTimer=setTimeout(type,introText[char-1]==='.'?340:49);else $('.cursor').style.display='none';}
  if(reduced){$('#typed').textContent=introText;$('.cursor').style.display='none';}else introTimer=setTimeout(type,300);
  loadMedia();
})();
