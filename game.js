const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width, H = canvas.height;
const path = [
  {x:-20,y:110},{x:170,y:110},{x:170,y:245},{x:390,y:245},
  {x:390,y:105},{x:650,y:105},{x:650,y:400},{x:880,y:400},{x:980,y:400}
];
const towerDefs = {
  sunflower:{name:"🌻 Sunflower",cost:40,range:115,damage:8,fireRate:34,color:"#f5cf49",bullet:"#fff2a0"},
  mushroom:{name:"🍄 Mushroom",cost:65,range:105,damage:14,fireRate:58,splash:45,color:"#c873cf",bullet:"#e9a7ed"},
  oak:{name:"🌳 Oak Guardian",cost:100,range:145,damage:28,fireRate:78,color:"#79552f",bullet:"#b5e36a"}
};

let mana, lives, wave, score, towers, enemies, bullets, particles, waveActive, spawnLeft, spawnTimer, selectedType, selectedTower, gameOver, gameSpeed;
const rocks = [
  {x:95,y:355,r:27}, {x:285,y:515,r:30}, {x:535,y:500,r:26}, {x:790,y:180,r:29}
];

function reset(){
  mana=120; lives=20; wave=1; score=0; towers=[]; enemies=[]; bullets=[]; particles=[];
  waveActive=false; spawnLeft=0; spawnTimer=0; selectedType="sunflower"; selectedTower=null; gameOver=false; gameSpeed=1;
  document.getElementById("speedButton").textContent="▶ 1x"; document.getElementById("speedButton").classList.remove("active");
  showBuildMenu(); selectButtons(); updateHud();
}
function selectButtons(){
  document.querySelectorAll(".tower").forEach(b=>b.classList.toggle("selected",b.dataset.type===selectedType));
}
document.querySelectorAll(".tower").forEach(b=>b.onclick=()=>{selectedType=b.dataset.type;selectedTower=null;selectButtons();showBuildMenu();});
document.getElementById("restart").onclick=reset;
document.getElementById("startWave").onclick=startWave;
document.getElementById("closeTower").onclick=()=>{selectedTower=null;showBuildMenu();};
document.getElementById("upgradeTower").onclick=upgradeSelected;
document.getElementById("sellTower").onclick=sellSelected;
const speedButton = document.getElementById("speedButton");
function toggleGameSpeed(){
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  speedButton.textContent = gameSpeed === 2 ? "▶▶ 2x" : "▶ 1x";
  speedButton.classList.toggle("active", gameSpeed === 2);
  speedButton.setAttribute("aria-pressed", gameSpeed === 2 ? "true" : "false");
  msg(`Game speed: ${gameSpeed}x`);
}
speedButton.addEventListener("click", (event)=>{ event.preventDefault(); event.stopPropagation(); toggleGameSpeed(); });
speedButton.addEventListener("pointerdown", (event)=>{ event.stopPropagation(); });

function startWave(){
  if(gameOver || waveActive) return;
  selectedTower=null; showBuildMenu();
  waveActive=true; spawnLeft=7+wave*3; spawnTimer=0;
  msg(`Wave ${wave} incoming!`);
}
function msg(s){document.getElementById("status").textContent=s;}
function updateHud(){
  mana=Math.floor(mana);
  document.getElementById("mana").textContent=mana;
  document.getElementById("lives").textContent=lives;
  document.getElementById("wave").textContent=wave;
  document.getElementById("score").textContent=score;
  if(selectedTower) updateTowerMenu();
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function pointOnPath(x,y){
  for(let i=0;i<path.length-1;i++){
    const a=path[i],b=path[i+1];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(len*len)));
    if(Math.hypot(x-(a.x+t*dx),y-(a.y+t*dy))<30)return true;
  }
  return false;
}
function towerAt(x,y){return towers.find(t=>Math.hypot(x-t.x,y-t.y)<28);}
function rockAt(x,y){return rocks.some(r=>Math.hypot(x-r.x,y-r.y)<r.r+24);}

canvas.addEventListener("click",e=>{
  if(gameOver)return;
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)*W/r.width, y=(e.clientY-r.top)*H/r.height;
  const clicked=towerAt(x,y);
  if(clicked){
    selectedTower=clicked;
    showTowerMenu();
    msg(`${clicked.def.name} selected.`);
    return;
  }
  if(selectedTower){ selectedTower=null; showBuildMenu(); }
  const d=towerDefs[selectedType];
  if(mana<d.cost){msg("Not enough mana!");return;}
  if(pointOnPath(x,y)||rockAt(x,y)||towers.some(t=>Math.hypot(x-t.x,y-t.y)<34)){msg(rockAt(x,y)?"You cannot build on a rock!":"That spot is occupied or on the path!");return;}
  towers.push({x,y,type:selectedType,def:{...d},cool:0,level:1,invested:d.cost});
  mana-=d.cost; updateHud();
});

function showBuildMenu(){
  document.getElementById("buildMenu").classList.remove("hidden");
  document.getElementById("towerMenu").classList.add("hidden");
}
function showTowerMenu(){
  document.getElementById("buildMenu").classList.add("hidden");
  document.getElementById("towerMenu").classList.remove("hidden");
  updateTowerMenu();
}
function upgradeCost(t){return Math.round(t.def.cost*(0.8+t.level*0.65));}
function upgradeSelected(){
  if(!selectedTower || selectedTower.level>=3)return;
  const cost=upgradeCost(selectedTower);
  if(mana<cost){msg("Not enough mana for that upgrade!");return;}
  mana-=cost; selectedTower.invested+=cost; selectedTower.level++;
  selectedTower.def.damage=Math.round(selectedTower.def.damage*1.35);
  selectedTower.def.range=Math.round(selectedTower.def.range*1.08);
  selectedTower.def.fireRate=Math.max(10,Math.round(selectedTower.def.fireRate*0.86));
  if(selectedTower.def.splash) selectedTower.def.splash+=10;
  msg(`${selectedTower.def.name} upgraded to Level ${selectedTower.level}!`);
  updateHud();
}
function sellSelected(){
  if(!selectedTower)return;
  const refund=Math.floor(selectedTower.invested*0.7);
  const name=selectedTower.def.name;
  towers=towers.filter(t=>t!==selectedTower);
  selectedTower=null; mana+=refund; showBuildMenu();
  msg(`${name} removed. +${refund} mana refunded.`); updateHud();
}
function updateTowerMenu(){
  if(!selectedTower)return;
  const t=selectedTower;
  document.getElementById("towerName").textContent=t.def.name;
  document.getElementById("towerLevel").textContent=`LEVEL ${t.level} / 3`;
  document.getElementById("towerStats").innerHTML =
    `⚔ Damage: <b>${t.def.damage}</b><br>`+
    `🎯 Range: <b>${t.def.range}</b><br>`+
    `⚡ Attack speed: <b>${Math.max(1,Math.round(60/t.def.fireRate*10)/10)}/sec</b>`+
    (t.def.splash?`<br>💥 Splash: <b>${t.def.splash}</b>`:"");
  const up=document.getElementById("upgradeTower");
  if(t.level>=3){up.textContent="MAX LEVEL";up.disabled=true;}
  else {const cost=upgradeCost(t);up.textContent=`Upgrade — ${cost} 💧`;up.disabled=mana<cost;}
}

function spawnEnemy(){
  const fast=Math.random()<Math.min(0.20+wave*0.02,0.35);
  const hp=fast?Math.max(16,Math.round((28+wave*12)*0.52)):28+wave*12;
  const speed=fast?1.45+wave*0.055:0.75+wave*0.045;
  enemies.push({x:path[0].x,y:path[0].y,seg:0,t:0,hp,maxHp:hp,speed,r:fast?9:11,reward:(fast?11:8)+wave,fast});
}
function moveEnemy(e){
  let remaining=e.speed;
  while(remaining>0 && e.seg<path.length-1){
    const a=path[e.seg],b=path[e.seg+1],dx=b.x-a.x,dy=b.y-a.y;
    const len=Math.hypot(dx,dy),step=remaining/len;
    e.t+=step;
    if(e.t>=1){e.t-=1;e.seg++;} else remaining=0;
    if(e.seg>=path.length-1){lives--;e.hp=-999;msg("A pest got through!");updateHud();return;}
  }
  if(e.seg<path.length-1){const a=path[e.seg],b=path[e.seg+1];e.x=a.x+(b.x-a.x)*e.t;e.y=a.y+(b.y-a.y)*e.t;}
}
function nearestEnemy(t){
  let best=null,bd=t.def.range;
  for(const e of enemies){const d=dist(t,e);if(e.hp>0&&d<bd){best=e;bd=d;}}
  return best;
}
function shoot(t,e){bullets.push({x:t.x,y:t.y,target:e,speed:5.5,damage:t.def.damage,splash:t.def.splash||0,color:t.def.bullet||"#fff"});}
function explode(x,y,rad,damage){
  for(const e of enemies)if(e.hp>0&&dist({x,y},e)<rad)e.hp-=damage;
  for(let i=0;i<8;i++)particles.push({x,y,dx:(Math.random()-.5)*2,dy:(Math.random()-.5)*2,life:18});
}
function update(){
  if(gameOver)return;
  if(waveActive){
    if(spawnLeft>0){if(spawnTimer--<=0){spawnEnemy();spawnLeft--;spawnTimer=Math.max(16,55-wave*2);}}
    else if(enemies.length===0){waveActive=false;mana+=35+wave*8;if(wave>=8){gameOver=true;msg("You protected the forest! 🌳");}else{wave++;msg("Wave cleared! Build more defenses.");}updateHud();}
  }
  for(const t of towers){if(t.cool>0)t.cool--;if(t.cool<=0){const e=nearestEnemy(t);if(e){shoot(t,e);t.cool=t.def.fireRate;}}}
  for(const b of bullets){
    if(!b.target||b.target.hp<=0){b.dead=true;continue;}
    const dx=b.target.x-b.x,dy=b.target.y-b.y,d=Math.hypot(dx,dy);
    if(d<b.speed+3){b.dead=true;if(b.splash)explode(b.target.x,b.target.y,b.splash,b.damage);else b.target.hp-=b.damage;particles.push({x:b.target.x,y:b.target.y,dx:0,dy:0,life:12});}
    else{b.x+=dx/d*b.speed;b.y+=dy/d*b.speed;}
  }
  bullets=bullets.filter(b=>!b.dead);
  for(const e of enemies)if(e.hp>0)moveEnemy(e);
  for(const e of enemies){if(e.hp<=0&&!e.counted){e.counted=true;if(e.hp>-900){score+=10;mana+=e.reward;particles.push({x:e.x,y:e.y,dx:0,dy:-1,life:25});}}}
  enemies=enemies.filter(e=>e.hp>0);
  for(const p of particles){p.x+=p.dx;p.y+=p.dy;p.life--;}
  particles=particles.filter(p=>p.life>0);
  if(lives<=0){gameOver=true;msg("The forest has fallen! Press Restart.");}
  updateHud();
}
function draw(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle="#78a850";ctx.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=32)for(let x=0;x<W;x+=32){ctx.fillStyle=((x/32+y/32)%2?"#7eae56":"#74a34d");ctx.fillRect(x,y,32,32);ctx.fillStyle="#638e45";ctx.fillRect(x+6,y+25,3,3);ctx.fillRect(x+22,y+7,2,2);}
  ctx.lineCap="square";ctx.lineJoin="round";ctx.strokeStyle="#6a4c32";ctx.lineWidth=58;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();
  ctx.strokeStyle="#a77b4b";ctx.lineWidth=48;ctx.stroke();
  for(let i=0;i<12;i++){const x=(i*83+35)%W,y=(i*137+70)%H;if(!pointOnPath(x,y)){ctx.fillStyle="#dce78a";ctx.fillRect(x,y,4,4);ctx.fillRect(x+4,y+4,4,4);}}
  for(const t of towers){
    ctx.globalAlpha=.10;ctx.fillStyle=t.def.color;ctx.beginPath();ctx.arc(t.x,t.y,t.def.range,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    if(t===selectedTower){ctx.strokeStyle="#f5db69";ctx.lineWidth=4;ctx.beginPath();ctx.arc(t.x,t.y,22,0,Math.PI*2);ctx.stroke();}
    if(t.type==="sunflower")drawSunflower(t.x,t.y);
    if(t.type==="mushroom")drawMushroom(t.x,t.y);
    if(t.type==="oak")drawOak(t.x,t.y);
    if(t.level>1){ctx.fillStyle="#f5db69";ctx.font="bold 12px Courier New";ctx.textAlign="center";ctx.fillText("★".repeat(t.level-1),t.x,t.y-28);}
  }
  for(const r of rocks) drawRock(r);
  for(const e of enemies)drawEnemy(e);
  for(const b of bullets){ctx.fillStyle=b.color;ctx.fillRect(b.x-4,b.y-4,8,8);}
  for(const p of particles){ctx.fillStyle="#eaf7b0";ctx.globalAlpha=p.life/25;ctx.fillRect(p.x-3,p.y-3,6,6);ctx.globalAlpha=1;}
  if(gameOver){ctx.fillStyle="rgba(5,12,7,.72)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#eff8d7";ctx.font="bold 34px Courier New";ctx.textAlign="center";ctx.fillText(lives<=0?"FOREST FALLEN":"FOREST SAVED!",W/2,H/2-15);ctx.font="18px Courier New";ctx.fillText("Press Restart to play again",W/2,H/2+25);}
}
function drawSunflower(x,y){ctx.fillStyle="#3e7d36";ctx.fillRect(x-3,y+7,6,20);ctx.fillStyle="#4f943d";ctx.fillRect(x-13,y+12,10,6);ctx.fillRect(x+3,y+17,10,6);ctx.fillStyle="#f4c941";for(let a=0;a<8;a++){const dx=Math.round(Math.cos(a*Math.PI/4)*10),dy=Math.round(Math.sin(a*Math.PI/4)*10);ctx.fillRect(x+dx-5,y+dy-5,10,10);}ctx.fillStyle="#6d4c28";ctx.fillRect(x-5,y-5,10,10);}
function drawMushroom(x,y){ctx.fillStyle="#efe4d0";ctx.fillRect(x-6,y+3,12,18);ctx.fillStyle="#bb5cc4";ctx.fillRect(x-17,y-4,34,9);ctx.fillRect(x-12,y-10,24,7);ctx.fillStyle="#f4c6ed";ctx.fillRect(x-8,y-7,5,4);ctx.fillRect(x+5,y-4,5,4);}
function drawOak(x,y){ctx.fillStyle="#674326";ctx.fillRect(x-6,y+3,12,27);ctx.fillStyle="#3d7137";ctx.fillRect(x-21,y-10,42,25);ctx.fillRect(x-14,y-20,28,15);ctx.fillStyle="#548b40";ctx.fillRect(x-28,y-2,14,14);ctx.fillRect(x+14,y-4,14,14);}
function drawRock(r){ctx.fillStyle="#4f5a45";ctx.fillRect(r.x-r.r+4,r.y-r.r+8,r.r*2-8,r.r*2-8);ctx.fillStyle="#68735a";ctx.fillRect(r.x-r.r+10,r.y-r.r+3,r.r+10,r.r-4);ctx.fillStyle="#879174";ctx.fillRect(r.x-r.r+14,r.y-r.r+7,9,5);ctx.fillStyle="#3b4435";ctx.fillRect(r.x-r.r+9,r.y+r.r-4,18,5);}
function drawEnemy(e){
  if(e.fast){
    ctx.fillStyle="#b36b35";ctx.fillRect(e.x-8,e.y-6,16,12);ctx.fillStyle="#e39a4e";ctx.fillRect(e.x-5,e.y-10,10,5);ctx.fillStyle="#f3e7ad";ctx.fillRect(e.x-5,e.y-3,3,3);ctx.fillRect(e.x+2,e.y-3,3,3);ctx.fillStyle="#59301d";ctx.fillRect(e.x-7,e.y+6,4,6);ctx.fillRect(e.x+3,e.y+6,4,6);ctx.fillStyle="#d95b4f";ctx.fillRect(e.x-11,e.y-16,22,3);ctx.fillStyle="#ef7b57";ctx.fillRect(e.x-11,e.y-16,22*Math.max(0,e.hp/e.maxHp),3);
  } else {
    ctx.fillStyle="#563f2b";ctx.fillRect(e.x-9,e.y-7,18,14);ctx.fillStyle="#8d693e";ctx.fillRect(e.x-6,e.y-10,12,6);ctx.fillStyle="#e7f0bd";ctx.fillRect(e.x-6,e.y-3,4,4);ctx.fillRect(e.x+2,e.y-3,4,4);ctx.fillStyle="#3c241b";ctx.fillRect(e.x-8,e.y+7,5,5);ctx.fillRect(e.x+3,e.y+7,5,5);ctx.fillStyle="#2d2118";ctx.fillRect(e.x-12,e.y-17,24,3);ctx.fillStyle="#e36d5d";ctx.fillRect(e.x-12,e.y-17,24*Math.max(0,e.hp/e.maxHp),3);
  }
}
let lastFrameTime = performance.now();
function loop(now){
  const elapsed = Math.min(100, now - lastFrameTime);
  lastFrameTime = now;
  // Run the simulation using a fixed number of steps. At 2x, two game ticks
  // happen for every rendered frame, making movement, attacks, and spawning faster.
  const steps = gameSpeed === 2 ? 2 : 1;
  for(let i=0;i<steps;i++) update();
  draw();
  requestAnimationFrame(loop);
}
speedButton.setAttribute("aria-pressed", "false");
reset();
requestAnimationFrame(loop);
