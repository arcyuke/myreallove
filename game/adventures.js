/* Новые приключения: общая карта, взаимодействия и напарник, который умеет искать путь. */
(function(root,factory){const core=typeof module==='object'&&module.exports?require('./core.js'):root.LoveQuestCore;const api=factory(core);if(typeof module==='object'&&module.exports)module.exports=api;else root.LoveAdventures=api;})(typeof window==='undefined'?this:window,function(Core){
  'use strict';
  const {W,H}=Core,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const EXTRA=[
    {name:'Найти друг друга',short:'Лабиринт',kind:'maze',world:0,group:'Вместе веселее',goal:'Найдите свои половинки сердца и встретьтесь у арки.',intro:'Мы видим друг друга. Осталось разобраться с этими поворотами ♡',outro:'Из всех дорожек я всё равно выберу ту, которая ведёт к тебе.',achievement:'Я тебя нашёл',hint:'У каждого своя половинка: золотая у Олега, розовая у Насти. Потом встречайтесь у арки снизу.'},
    {name:'Лаки, ты где?',short:'Найти Лаки',kind:'rescue',world:1,group:'Вместе веселее',goal:'Найдите три следа, позовите Лаки и вернитесь к пледу.',intro:'Кто-то маленький и лохматый решил устроить вам квест.',outro:'Лаки найден. Теперь на свидании нас трое.',achievement:'Хвостатое счастье',hint:'Соберите три светящихся следа. Позовите Лаки кнопкой действия рядом с кустом и возвращайтесь к пледу вдвоём.'},
    {name:'Два сердца на старте',short:'Гонки',kind:'race',world:2,group:'Вместе веселее',goal:'Пройдите по два круга через все ворота. Финишируйте оба.',intro:'Стрелки и WASD управляют машинками. Рывок даёт ускорение!',outro:'Можем спорить, кто быстрее. Главное, что домой — вместе.',achievement:'Любовь на скорости',hint:'Едьте через светящиеся ворота по часовой стрелке. G или правый Shift — ускорение. На телефоне — кнопка «Турбо».'},
    {name:'Любовь выходит на ринг',short:'Бойцовский ринг',kind:'ring',world:3,group:'Вместе веселее',goal:'Победите Мишку-чемпиона. Красный круг — отходите!',intro:'Мишка вызвал вас на дружеский спарринг. Работайте в паре.',outro:'Чемпионский пояс — один. А чемпионов сегодня двое.',achievement:'Чемпионы обнимашек',hint:'Подбегайте и бейте вместе. Перед красным ударом используйте рывок.',total:1,type:'bear'},
    {name:'С последней пары — вдвоём',short:'Побег с урока',kind:'school',world:4,group:'Вместе веселее',goal:'Решите пример, включите звонок и выйдите из класса вдвоём.',intro:'На доске: 2 + 3 × 2 = ? Действие выбирает ответ рядом с карточкой.',outro:'Урок окончен. Пора на наше маленькое свидание.',achievement:'Звонок для нас',hint:'Сначала умножение: 2 + 6 = 8. Подойдите к карточке «8», нажмите действие, затем включите звонок справа.'},
    {name:'Пицца с любовью',short:'Кухня · пицца',kind:'kitchen',world:5,group:'Любовь на кухне',recipe:['dough','tomato','cheese'],dish:'pizza',cookTime:4,goal:'Приготовьте и подайте 3 пиццы.',intro:'Возьмите продукты, нарежьте томат, соберите пиццу в печи и подайте. Можно передавать продукты друг другу!',outro:'Две пары рук. Три пиццы. Очень много любви.',achievement:'Пицца на двоих',hint:'Тесто и сыр сразу в печь. Томат сначала на доску, потом заберите нарезанный. Готовую пиццу несите на выдачу.'},
    {name:'Суши под дождём',short:'Кухня · суши',kind:'kitchen',world:6,group:'Любовь на кухне',recipe:['rice','fish'],dish:'sushi',cookTime:2.5,goal:'Скрутите и подайте 3 порции роллов.',intro:'За окном дождь. На кухне — вы вдвоём и очередь за роллами.',outro:'Последний ролл, конечно, для тебя.',achievement:'Ролл моей мечты',hint:'Рис готов сразу. Рыбу нарежьте на одной из двух досок. Затем рис и рыбу на стол для роллов; готовое — на выдачу.'},
    {name:'Том ям на орбите',short:'Кухня · том ям',kind:'kitchen',world:7,group:'Любовь на кухне',recipe:['shrimp','tomato','coconut'],dish:'tomyam',cookTime:4.5,goal:'Сварите и подайте 3 супа на космической кухне.',intro:'Продукты слева, кастрюля справа. Передавайте друг другу продукты на мостике.',outro:'Этот суп согреет даже на другой стороне Вселенной.',achievement:'Горячее космоса',hint:'Нарежьте креветки и томат; кокосовое молоко готово сразу. Через мостик несите всё в кастрюлю. Подайте 3 супа.'},
    {name:'Мастерская двух сердец',short:'Заводной мост',kind:'workshop',world:8,group:'Только вместе',goal:'Удержите плиту, закрепите мост и запустите часы вдвоём.',intro:'Один держит плиту слева. Второй пересекает мост и включает рычаг справа.',outro:'Когда мы помогаем друг другу, всё встаёт на свои места.',achievement:'Ты можешь на меня положиться',hint:'Один стоит на левой плите. Второй идёт по мостику и нажимает рычаг. Потом соберите две шестерёнки и встаньте на обе золотые плиты.'},
    {name:'До Луны и обратно',short:'Лунная встреча',kind:'moon',world:9,group:'Только вместе',goal:'Соберите свои звёзды, включите оба маяка и встретьтесь с Лаки.',intro:'Вы на разных берегах. Но видите друг друга и можете построить общий мост.',outro:'Даже на Луне моё любимое место — рядом с вами.',achievement:'Наш маленький космос',hint:'У каждого две звезды на своём берегу. Соберите их и нажмите действие у своего маяка. По общему мосту приходите к Лаки.'}
  ];
  const LEVELS=[...Core.LEVELS.map((l,i)=>({...l,kind:'battle',group:'Первое приключение',...(i===4?{world:11}:{})})),...EXTRA];
  const FOOD={dough:{name:'Тесто',color:'#edd49b',ready:true},tomato:{name:'Томат',color:'#ed746d'},cheese:{name:'Сыр',color:'#f9d66d',ready:true},rice:{name:'Рис',color:'#fff0d5',ready:true},fish:{name:'Рыба',color:'#f1a18d'},shrimp:{name:'Креветки',color:'#efada1'},coconut:{name:'Молоко',color:'#d7e7e3',ready:true},pizza:{name:'Пицца',color:'#edb364'},sushi:{name:'Роллы',color:'#bdd5a3'},tomyam:{name:'Том ям',color:'#f39968'}};
  class Adventure{
    constructor(stage,{solo=false,hero=1,random=Math.random}={}){Object.assign(this,{solo,hero,random,mode:'adventure'});this.begin(stage);}
    begin(stage){
      this.stage=stage;this.level=LEVELS[stage];this.kind=this.level.kind;this.status='playing';this.time=0;this.health=12;this.maxHealth=12;this.invincible=0;this.kills=0;this.keyTaken=false;this.events=[];this.effects=[];this.enemies=[];this.walls=[];this.items=[];this.navStamp=0;this.hintTimer=0;
      this.bounds={minX:42,maxX:918,minY:110,maxY:490};
      this.players=[0,1].map(id=>({id,x:110+id*65,y:425,face:1,attack:0,cooldown:0,dash:0,dashTime:0,invuln:0,moving:false,held:null,pressed:false,secondary:false,angle:0}));
      this.exit={x:845,y:445};
      if(this.kind==='maze')this.makeMaze();
      if(this.kind==='rescue'){
        this.walls=[{x:260,y:120,w:135,h:65},{x:550,y:190,w:65,h:170},{x:245,y:310,w:145,h:65}];
        this.clues=[{x:170,y:175},{x:780,y:160},{x:440,y:435}].map(p=>({...p,taken:false}));
        this.dog={x:795,y:422,found:false,leader:0,moving:false,face:-1};this.exit={x:130,y:425};
      }
      if(this.kind==='race'){
        this.bounds={minX:88,maxX:875,minY:140,maxY:472};this.walls=[{x:285,y:245,w:390,h:105}];
        this.checkpoints=[{x:790,y:175},{x:800,y:425},{x:160,y:425},{x:150,y:175},{x:480,y:175}];
        this.players.forEach((p,i)=>Object.assign(p,{x:425+i*55,y:172+i*25,lap:0,next:0,finished:false}));
        this.rival={x:390,y:210,next:0,lap:0,angle:0,finished:false};this.countdown=3;
      }
      if(this.kind==='school'){
        this.walls=[{x:250,y:245,w:130,h:50},{x:450,y:245,w:130,h:50},{x:260,y:370,w:130,h:50},{x:470,y:370,w:130,h:50}];
        this.answers=[6,8,10].map((value,i)=>({x:275+i*160,y:165,value}));this.bell={x:815,y:165};this.pass=false;this.bellOn=false;this.teacher={x:695,y:285,angle:0};
      }
      if(this.kind==='kitchen')this.makeKitchen();
      if(this.kind==='workshop'){
        this.plate={x:240,y:330};this.lever={x:610,y:340};this.bridgeOpen=false;this.bridgeLatched=false;this.doorOpen=false;this.charge=0;
        this.gears=[{x:680,y:165,owner:0,taken:false},{x:830,y:410,owner:1,taken:false}];this.pads=[{x:655,y:330},{x:810,y:330}];this.updateBridgeWalls();
      }
      if(this.kind==='moon'){
        this.players[0].x=140;this.players[1].x=810;
        this.stars=[{x:140,y:165,owner:0},{x:285,y:410,owner:0},{x:810,y:165,owner:1},{x:675,y:410,owner:1}].map(s=>({...s,taken:false}));
        this.beacons=[{x:285,y:235,on:false},{x:675,y:235,on:false}];this.bridgeOpen=false;this.exit={x:480,y:422};this.updateBridgeWalls();
      }
    }
    makeMaze(){
      this.map=['###############','#.....#.......#','#.###.#.###.#.#','#...#...#...#.#','###.#####.###.#','#.............#','###############'];
      this.grid={x:60,y:96,size:56};const point=(c,r)=>({x:60+c*56+28,y:96+r*56+28});
      this.map.forEach((row,r)=>[...row].forEach((v,c)=>{if(v==='#')this.walls.push({x:60+c*56,y:96+r*56,w:56,h:56});}));
      Object.assign(this.players[0],point(1,1));Object.assign(this.players[1],point(13,5));
      this.shards=[{...point(5,1),owner:0,taken:false},{...point(9,3),owner:1,taken:false}];this.exit=point(7,5);
    }
    makeKitchen(){
      const soup=this.stage===12,sushi=this.stage===11;
      const sourceX=soup?[110,220,330]:sushi?[175,760]:[150,360,570];
      this.stations=this.level.recipe.map((food,i)=>({id:'source-'+food,type:'source',food,x:sourceX[i],y:155,label:FOOD[food].name}));
      this.stations.push({id:'prep-1',type:'prep',x:soup?170:sushi?255:255,y:soup?340:300,label:'Нарезка',item:null,remaining:0});
      if(sushi)this.stations.push({id:'prep-2',type:'prep',x:700,y:300,label:'Нарезка',item:null,remaining:0});
      this.stations.push({id:'cook',type:'cook',x:soup?745:sushi?480:745,y:sushi?420:300,label:soup?'Кастрюля':sushi?'Роллы':'Печь',added:[],remaining:0,ready:false});
      this.stations.push({id:'serve',type:'serve',x:835,y:440,label:'Выдача'});
      this.walls=this.stations.map(s=>({x:s.x-30,y:s.y-20,w:60,h:40}));
      if(soup)this.walls.push({x:440,y:100,w:75,h:180},{x:440,y:395,w:75,h:105});
      else this.walls.push({x:425,y:sushi?220:340,w:sushi?110:150,h:55});
      this.served=0;this.orders=3;this.spills=soup?[{x:605,y:365,r:28},{x:345,y:290,r:25}]:[];
    }
    updateBridgeWalls(){
      const open=this.bridgeOpen||this.bridgeLatched;
      this.walls=this.kind==='moon'?[{x:365,y:95,w:230,h:220},...(!open?[{x:365,y:315,w:230,h:185}]:[{x:365,y:475,w:230,h:25}])]:[{x:440,y:100,w:80,h:190},{x:440,y:385,w:80,h:115},...(!open?[{x:440,y:290,w:80,h:95}]:[])];
      this.navStamp++;
    }
    event(type,value){this.events.push({type,value});}
    takeEvents(){return this.events.splice(0);}
    message(line){this.event('message',line);}
    blocked(x,y,r=12){
      const b=this.bounds;if(x<b.minX||x>b.maxX||y<b.minY||y>b.maxY)return true;
      return this.walls.some(a=>Math.hypot(x-clamp(x,a.x,a.x+a.w),y-clamp(y,a.y,a.y+a.h))<r);
    }
    move(p,dx,dy){
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/7));
      for(let i=0;i<steps;i++){if(!this.blocked(p.x+dx/steps,p.y))p.x+=dx/steps;if(!this.blocked(p.x,p.y+dy/steps))p.y+=dy/steps;}
    }
    clearLine(a,b){const n=Math.max(1,Math.ceil(dist(a,b)/12));for(let i=1;i<=n;i++)if(this.blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;return true;}
    pathTo(p,target){
      if(this.clearLine(p,target))return [target];
      const S=24,cols=W/S,rows=Math.ceil(H/S),key=(x,y)=>y*cols+x,point=k=>({x:(k%cols)*S+S/2,y:Math.floor(k/cols)*S+S/2});
      const open=k=>{const t=point(k);return k>=0&&k<cols*rows&&!this.blocked(t.x,t.y,15);};
      function nearest(t){let best=-1,bestD=Infinity;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const k=key(x,y);if(open(k)){const d=dist(point(k),t);if(d<bestD){best=k;bestD=d;}}}return best;}
      const start=nearest(p),end=nearest(target);if(start<0||end<0)return [];
      const previous=new Int32Array(cols*rows).fill(-2),queue=[start];previous[start]=-1;
      for(let j=0;j<queue.length&&previous[end]===-2;j++){
        const k=queue[j],x=k%cols,y=Math.floor(k/cols);
        for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const next=key(nx,ny);if(previous[next]===-2&&open(next)&&this.clearLine(point(k),point(next))){previous[next]=k;queue.push(next);}}
      }
      if(previous[end]===-2)return [];
      const path=[];for(let k=end;k!==-1;k=previous[k])path.push(point(k));path.reverse();
      if(path.length&&this.clearLine(path.at(-1),target))path.push(target);return path;
    }
    steer(p,target){
      if(!target)return {x:0,y:0};if(dist(p,target)<12)return {x:0,y:0};
      const key=Math.round(target.x/12)+','+Math.round(target.y/12)+':'+this.navStamp;
      if(!p.route||p.route.key!==key||p.route.until<this.time)p.route={key,path:this.pathTo(p,target),until:this.time+.8};
      while(p.route.path.length>1&&this.clearLine(p,p.route.path[1]))p.route.path.shift();
      const t=p.route.path[0];if(!t)return {x:0,y:0};const d=dist(p,t)||1;return {x:(t.x-p.x)/d,y:(t.y-p.y)/d};
    }
    approach(p,s){
      return [{x:s.x,y:s.y+54},{x:s.x-55,y:s.y},{x:s.x+55,y:s.y},{x:s.x,y:s.y-54}].filter(t=>!this.blocked(t.x,t.y)&&(!this.stations||this.stations.every(other=>other===s||dist(t,other)>dist(t,s)+3))).sort((a,b)=>dist(a,p)-dist(b,p))[0]||s;
    }
    kitchenIntent(p){
      const cook=this.stations.find(s=>s.type==='cook'),prep=this.stations.filter(s=>s.type==='prep'),serve=this.stations.find(s=>s.type==='serve');let station;
      if(p.held){
        if(p.held.meal)station=serve;
        else if(p.held.ready)station=cook;
        else station=prep.find(s=>!s.item)||prep.find(s=>s.remaining<=0)||prep[0];
        if(p.held.ready&&cook.added.includes(p.held.food))station=this.stations.find(s=>s.type==='source'&&s.food===p.held.food);
        if(!p.held.ready&&(cook.added.includes(p.held.food)||prep.some(s=>s.item?.food===p.held.food)||this.players.some(a=>a.id<p.id&&a.held?.food===p.held.food)))station=this.stations.find(s=>s.type==='source'&&s.food===p.held.food);
        if(!p.held.meal&&(cook.ready||cook.remaining>0))station=this.stations.find(s=>s.type==='source'&&s.food===p.held.food);
      }else if(cook.ready)station=cook;
      else if(prep.some(s=>s.item&&s.remaining<=0))station=prep.find(s=>s.item&&s.remaining<=0);
      else{
        const busy=[...cook.added,...this.players.filter(a=>a.held&&!a.held.meal).map(a=>a.held.food),...prep.filter(s=>s.item).map(s=>s.item.food)];
        const food=this.level.recipe.find(f=>!busy.includes(f));if(food)station=this.stations.find(s=>s.type==='source'&&s.food===food);
      }
      return station?{target:this.approach(p,station),station}: {target:{x:p.id?640:340,y:450}};
    }
    intent(p){
      if(this.kind==='maze')return {target:this.shards.find(s=>s.owner===p.id&&!s.taken)||this.exit};
      if(this.kind==='rescue'){
        const clues=this.clues.filter(c=>!c.taken).sort((a,b)=>dist(p,a)-dist(p,b));
        if(clues.length)return {target:clues[0]};return this.dog.found?{target:this.exit}:{target:this.dog,action:true};
      }
      if(this.kind==='race')return {target:this.checkpoints[p.next]};
      if(this.kind==='school'){
        if(this.bellOn)return {target:this.exit};const solver=this.solo?this.hero:0;
        if(!this.pass&&p.id===solver)return {target:this.answers[1],action:true};return {target:this.bell,action:this.pass};
      }
      if(this.kind==='kitchen')return this.kitchenIntent(p);
      if(this.kind==='workshop'){
        const keeper=this.solo?1-this.hero:0;
        if(!this.bridgeLatched)return {target:p.id===keeper?this.plate:this.lever,action:p.id!==keeper};
        const gear=this.gears.find(g=>g.owner===p.id&&!g.taken);if(gear)return {target:gear};
        return {target:this.doorOpen?this.exit:this.pads[p.id]};
      }
      if(this.kind==='moon'){
        const star=this.stars.find(s=>s.owner===p.id&&!s.taken);if(star)return {target:star};
        if(!this.beacons[p.id].on)return {target:this.beacons[p.id],action:true};return {target:this.bridgeOpen?this.exit:{x:p.id?680:280,y:420}};
      }
      return {target:this.exit};
    }
    autoInput(p){
      const intent=this.intent(p),input=this.steer(p,intent.target),actionPoint=intent.station||intent.target;
      input.attack=Boolean((intent.action||intent.station)&&dist(p,actionPoint)<70&&(!intent.station||dist(p,intent.target)<18)&&this.time%.65<.13);
      if(this.kind==='race'){input.dash=this.time%5<.2;}
      return input;
    }
    interact(p){
      if(p.cooldown>0)return;p.cooldown=.22;
      if(this.kind==='rescue'&&this.clues.every(c=>c.taken)&&!this.dog.found&&dist(p,this.dog)<75){this.dog.found=true;this.dog.leader=p.id;this.message('Лаки: «Гав!» Теперь к пледу — все вместе ♡');this.event('heal');}
      if(this.kind==='school'){
        const answer=this.answers.find(a=>dist(p,a)<60);
        if(answer&&!this.pass){if(answer.value===8){this.pass=true;this.message('Верно! Теперь включите звонок справа и идите к двери.');this.event('key');}else this.message('Почти! Сначала умножение, потом сложение.');}
        if(this.pass&&dist(p,this.bell)<65){this.bellOn=true;this.message('Дзинь! Учитель отвлёкся. К выходу справа внизу!');this.event('level');}
      }
      if(this.kind==='kitchen')this.kitchenAction(p);
      if(this.kind==='workshop'&&this.bridgeOpen&&!this.bridgeLatched&&dist(p,this.lever)<65){this.bridgeLatched=true;this.updateBridgeWalls();this.message('Мост закреплён! Теперь каждый забирает свою шестерёнку.');this.event('key');}
      if(this.kind==='moon'&&!this.beacons[p.id].on&&dist(p,this.beacons[p.id])<65){
        if(this.stars.filter(s=>s.owner===p.id).every(s=>s.taken)){this.beacons[p.id].on=true;this.event('key');this.message('Один маяк горит. Для моста нужны оба ♡');}
        else this.message('Сначала собери обе звезды своего цвета.');
      }
    }
    kitchenAction(p){
      const floor=this.items.find(i=>dist(i,p)<45);const near=this.stations.filter(s=>dist(s,p)<72).sort((a,b)=>dist(a,p)-dist(b,p))[0];
      if(!p.held&&floor&&(!near||dist(floor,p)<dist(near,p))){p.held=floor.item;this.items=this.items.filter(i=>i!==floor);this.event('key');return;}
      if(near){
        if(near.type==='source'){
          if(!p.held)p.held={food:near.food,ready:Boolean(FOOD[near.food].ready)};
          else if(p.held.food===near.food&&!p.held.meal)p.held=null;
          else this.message('Руки заняты. Передай продукт напарнику или положи его второй кнопкой.');
        }
        if(near.type==='prep'){
          if(!p.held&&near.item&&near.remaining<=0){p.held={...near.item,ready:true};near.item=null;}
          else if(p.held&&!p.held.ready&&!p.held.meal&&near.item&&near.remaining<=0){const done={...near.item,ready:true};near.item=p.held;near.remaining=1.4;p.held=done;}
          else if(p.held&&!p.held.ready&&!p.held.meal&&!near.item){near.item=p.held;p.held=null;near.remaining=1.4;}
          else this.message(near.item?'Доска занята. Заберите нарезанный продукт, когда полоска заполнится.':'Этот продукт уже готов. Его можно нести дальше.');
        }
        if(near.type==='cook'){
          if(!p.held&&near.ready){p.held={food:this.level.dish,meal:true,ready:true};near.ready=false;near.added=[];}
          else if(p.held?.ready&&!p.held.meal&&this.level.recipe.includes(p.held.food)&&!near.added.includes(p.held.food)&&!near.remaining&&!near.ready){near.added.push(p.held.food);p.held=null;if(near.added.length===this.level.recipe.length){near.remaining=this.level.cookTime;this.message('Готовится! Скоро можно забирать.');}}
          else this.message(p.held&&!p.held.ready?'Сначала нарежьте этот продукт на доске.':near.ready?'Освободите руки и заберите готовое блюдо.':'Рецепт показан сверху. Каждый ингредиент нужен один раз.');
        }
        if(near.type==='serve'){
          if(p.held?.meal){this.served++;p.held=null;this.event('heal');this.message(`Заказ подан! ${this.served} из ${this.orders} ♡`);if(this.served>=this.orders)this.finish();}
          else this.message('Сюда нужно принести готовое блюдо.');
        }
        return;
      }
      const other=this.players[1-p.id];if(p.held&&!other.held&&dist(p,other)<85){other.held=p.held;p.held=null;this.message('Держи, любимый напарник ♡');}
    }
    update(dt,inputs=[]){
      if(this.status!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;this.hintTimer=Math.max(0,this.hintTimer-dt);this.invincible=Math.max(0,this.invincible-dt);
      if(this.kind==='race'&&this.time<3)return;
      for(const p of this.players){
        const input=this.solo&&p.id!==this.hero?this.autoInput(p):(inputs[p.id]||{});
        let dx=clamp(Number(input.x)||0,-1,1),dy=clamp(Number(input.y)||0,-1,1),n=Math.hypot(dx,dy);if(n>1){dx/=n;dy/=n;}
        p.cooldown=Math.max(0,p.cooldown-dt);p.attack=Math.max(0,p.attack-dt);p.dash=Math.max(0,p.dash-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.invuln=Math.max(0,p.invuln-dt);
        const secondary=input.dash&&!p.secondary;p.secondary=Boolean(input.dash);
        if(secondary&&this.kind==='kitchen'&&p.held){this.items.push({x:p.x,y:p.y,item:p.held});p.held=null;this.event('key');}
        else if(secondary&&this.kind!=='kitchen'&&p.dash<=0){p.dashTime=this.kind==='race'?.65:.18;p.dash=this.kind==='race'?3.5:1.8;this.event('dash');}
        let speed=this.kind==='race'?225:150;if(this.kind==='maze')speed=130;if(this.kind==='moon')speed=145;if(p.dashTime>0)speed*=this.kind==='race'?1.7:2.25;
        if(this.spills?.some(s=>dist(p,s)<s.r))speed*=.6;
        const before={x:p.x,y:p.y};if(!p.finished)this.move(p,dx*speed*dt,dy*speed*dt);p.moving=dist(before,p)>.1;if(dx)p.face=dx>0?1:-1;if(p.moving)p.angle=Math.atan2(dy,dx);
        if(input.attack&&!p.pressed)this.interact(p);p.pressed=Boolean(input.attack);
      }
      if(this.kind==='maze'){
        for(const shard of this.shards)if(!shard.taken&&dist(this.players[shard.owner],shard)<32){shard.taken=true;this.event('key');this.message('Половинка найдена. Встретимся у арки снизу ♡');}
        if(this.shards.every(s=>s.taken)&&this.players.every(p=>dist(p,this.exit)<52))this.finish();
      }
      if(this.kind==='rescue'){
        for(const clue of this.clues)if(!clue.taken&&this.players.some(p=>dist(p,clue)<35)){clue.taken=true;this.event('key');this.message(this.clues.every(c=>c.taken)?'Слышите «гав»? Лаки у куста справа внизу. Позовите его!':'Нашли след! Продолжаем искать Лаки.');}
        if(this.dog.found){const d=this.dog,target=this.players[d.leader],input=this.steer(d,target),before={x:d.x,y:d.y};if(dist(d,target)>43)this.move(d,input.x*170*dt,input.y*170*dt);d.moving=dist(before,d)>.1;if(input.x)d.face=input.x>0?1:-1;if(this.players.every(p=>dist(p,this.exit)<80)&&dist(d,this.exit)<100)this.finish();}
      }
      if(this.kind==='race')this.updateRace(dt);
      if(this.kind==='school'){
        this.teacher.x=690+Math.sin(this.time*.7)*90;this.teacher.angle=Math.PI+Math.sin(this.time*.55)*.7;
        if(!this.bellOn)for(const p of this.players){const a=Math.atan2(p.y-this.teacher.y,p.x-this.teacher.x),delta=Math.atan2(Math.sin(a-this.teacher.angle),Math.cos(a-this.teacher.angle));if(p.invuln<=0&&dist(p,this.teacher)<132&&Math.abs(delta)<.5&&this.clearLine(this.teacher,p)){p.x=110+p.id*45;p.y=440;p.invuln=3;this.message('Кажется, нас заметили. Спрячемся за партами и попробуем ещё раз.');}}
        if(this.bellOn&&this.players.every(p=>dist(p,this.exit)<58))this.finish();
      }
      if(this.kind==='kitchen')for(const station of this.stations){if(station.remaining>0){station.remaining=Math.max(0,station.remaining-dt);if(!station.remaining){if(station.type==='cook')station.ready=true;this.event('heal');}}}
      if(this.kind==='workshop'){
        if(!this.bridgeLatched){const open=this.players.some(p=>dist(p,this.plate)<32);if(open!==this.bridgeOpen){this.bridgeOpen=open;this.updateBridgeWalls();}}
        if(this.bridgeLatched){for(const gear of this.gears)if(!gear.taken&&dist(this.players[gear.owner],gear)<34){gear.taken=true;this.event('key');}
          if(this.gears.every(g=>g.taken)&&this.pads.every((pad,i)=>dist(this.players[i],pad)<32)){this.charge+=dt;if(this.charge>=1.5&&!this.doorOpen){this.doorOpen=true;this.message('Часы идут! Вдвоём к двери справа внизу.');this.event('level');}}else this.charge=Math.max(0,this.charge-dt*.5);
          if(this.doorOpen&&this.players.every(p=>dist(p,this.exit)<55))this.finish();}
      }
      if(this.kind==='moon'){
        for(const star of this.stars)if(!star.taken&&dist(this.players[star.owner],star)<33){star.taken=true;this.event('key');}
        if(!this.bridgeOpen&&this.beacons.every(b=>b.on)){this.bridgeOpen=true;this.updateBridgeWalls();this.message('Мост готов. Лаки ждёт вас посередине ♡');this.event('level');}
        if(this.bridgeOpen&&this.players.every(p=>dist(p,this.exit)<62))this.finish();
      }
      this.effects.forEach(e=>e.t-=dt);this.effects=this.effects.filter(e=>e.t>0);
    }
    updateRace(dt){
      for(const p of [...this.players,this.rival]){
        if(p.finished)continue;
        if(p===this.rival){const t=this.checkpoints[p.next],d=dist(p,t)||1;p.x+=(t.x-p.x)/d*143*dt;p.y+=(t.y-p.y)/d*143*dt;p.angle=Math.atan2(t.y-p.y,t.x-p.x);}
        if(dist(p,this.checkpoints[p.next])<52){p.next++;if(p.next===this.checkpoints.length){p.next=0;p.lap++;if(p!==this.rival)this.event('key');if(p.lap>=2){p.finished=true;p.finishTime=this.time;if(p!==this.rival)this.message((p.id===0?'Олег':'Настя')+' на финише! Ждём напарника ♡');}}}
      }
      if(this.players.every(p=>p.finished))this.finish();
    }
    finish(){if(this.status!=='playing')return;this.status=this.stage===14?'win':'clear';this.event(this.status,this.stage);}
    hint(){this.hintTimer=9;this.message(this.level.hint);}
    objective(){
      if(this.kind==='maze')return `Половинки ${this.shards.filter(s=>s.taken).length}/2 · ${this.shards.every(s=>s.taken)?'к арке вдвоём':'найдите друг друга'}`;
      if(this.kind==='rescue')return this.dog.found?'Лаки с нами · все к пледу':`Следы ${this.clues.filter(c=>c.taken).length}/3 · ${this.clues.every(c=>c.taken)?'позовите Лаки':'осмотрите парк'}`;
      if(this.kind==='race')return this.time<3?`Старт через ${Math.ceil(3-this.time)}`:`Круги · Олег ${this.players[0].lap}/2 · Настя ${this.players[1].lap}/2`;
      if(this.kind==='school')return this.bellOn?'Звонок! Вдвоём к выходу':this.pass?'Верно! Теперь включите звонок':'2 + 3 × 2 = ? Выберите карточку';
      if(this.kind==='kitchen')return `Заказы ${this.served}/${this.orders} · готовьте и передавайте продукты`;
      if(this.kind==='workshop')return this.doorOpen?'Часы идут! Вместе к выходу':this.bridgeLatched?`Шестерёнки ${this.gears.filter(g=>g.taken).length}/2 · две золотые плиты`:'Плита слева → мост → рычаг справа';
      return this.bridgeOpen?'Мост готов · к Лаки вдвоём':`Звёзды ${this.stars.filter(s=>s.taken).length}/4 · маяки ${this.beacons.filter(b=>b.on).length}/2`;
    }
  }
  function create(stage,options={}){
    stage=clamp(Number(stage)||0,0,LEVELS.length-1);
    if(stage<5||stage===8){const q=new Core.Quest(options);q.begin(stage===8?1:stage);q.stage=stage;q.level=LEVELS[stage];q.mode='battle';return q;}
    return new Adventure(stage,options);
  }
  return {Adventure,create,LEVELS,FOOD,W,H};
});
