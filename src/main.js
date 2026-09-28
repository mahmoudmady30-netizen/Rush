import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import {PoseLandmarker, FilesetResolver} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";

const $=id=>document.getElementById(id);
const state={running:false,paused:false,score:0,coins:0,distance:0,speed:18,lane:1,target:1,y:0,vy:0,slide:0,skin:"cyan",best:+localStorage.getItem("mr_best")||0,missions:JSON.parse(localStorage.getItem("mr_missions")||"{}")};
let scene,camera,renderer,player,clock=new THREE.Clock(),objects=[],coinObjs=[],pose,stream,poseBusy=false,lastSpawn=0,lastCoin=0,audio;
const laneX=[-3,0,3];

function init3D(){
 scene=new THREE.Scene();scene.fog=new THREE.Fog(0x07101b,25,115);
 camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,200);camera.position.set(0,5.5,9);camera.lookAt(0,2,-18);
 renderer=new THREE.WebGLRenderer({canvas:$("world"),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;
 scene.add(new THREE.HemisphereLight(0xbfe7ff,0x10131a,1.5));const dl=new THREE.DirectionalLight(0xffffff,2);dl.position.set(5,12,8);dl.castShadow=true;scene.add(dl);
 const road=new THREE.Mesh(new THREE.PlaneGeometry(14,220),new THREE.MeshStandardMaterial({color:0x101722,roughness:1}));road.rotation.x=-Math.PI/2;road.position.z=-45;scene.add(road);
 for(let x of [-1.5,1.5]){const line=new THREE.Mesh(new THREE.BoxGeometry(.08,.02,220),new THREE.MeshBasicMaterial({color:0x536274}));line.position.set(x,0.02,-45);scene.add(line)}
 for(let i=0;i<22;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(THREE.MathUtils.randFloat(3,7),THREE.MathUtils.randFloat(5,16),THREE.MathUtils.randFloat(3,8)),new THREE.MeshStandardMaterial({color:0x182333}));b.position.set((Math.random()<.5?-1:1)*THREE.MathUtils.randFloat(9,16),b.geometry.parameters.height/2,-i*7-15);scene.add(b)}
 player=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.5,5,10),new THREE.MeshStandardMaterial({color:0x63e7ff,roughness:.35,metalness:.2}));body.position.y=1.25;body.castShadow=true;player.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12),new THREE.MeshStandardMaterial({color:0xffd2b0}));head.position.y=2.35;player.add(head);player.position.set(0,0,4);scene.add(player);
 addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
}
function obstacle(){
 const types=["block","barrier","train"];const type=types[Math.floor(Math.random()*types.length)],o=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({color:type==="train"?0xff4d6d:type==="barrier"?0xffb84d:0x7e6cff,roughness:.35});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(type==="train"?2.4:2.2,type==="barrier"?1.2:3.2,type==="train"?5:2.1),mat);mesh.position.y=type==="barrier"?0.6:1.6;mesh.castShadow=true;o.add(mesh);o.position.set(laneX[Math.floor(Math.random()*3)],0,-95);o.userData={type};scene.add(o);objects.push(o);
}
function coin(){
 const c=new THREE.Mesh(new THREE.TorusGeometry(.35,.11,10,20),new THREE.MeshStandardMaterial({color:0xffd75a,emissive:0x5a3d00,metalness:.7}));c.position.set(laneX[Math.floor(Math.random()*3)],1.7,-95);c.rotation.y=Math.PI/2;c.userData.taken=false;scene.add(c);coinObjs.push(c)
}
function beep(freq=600,dur=.07){try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.value=.04;o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch{}}
function haptic(ms=20){navigator.vibrate?.(ms)}
async function setupPose(){
 if(pose)return;
 const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
 pose=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"GPU"},runningMode:"VIDEO",numPoses:1});
}
async function startCamera(){
 stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
 $("camera").srcObject=stream;await $("camera").play();$("camera").style.display="block";$("pose").style.display="block";poseLoop();
}
function poseLoop(){
 if(!state.running)return;
 if(!poseBusy&&$("camera").readyState>=2){poseBusy=true;const r=pose.detectForVideo($("camera"),performance.now());interpret(r);poseBusy=false}
 requestAnimationFrame(poseLoop)
}
function interpret(r){
 if(!r.landmarks?.length)return;const p=r.landmarks[0],ls=p[11],rs=p[12],lh=p[23],rh=p[24],lw=p[15],rw=p[16],nose=p[0];
 const lean=((ls.x+rs.x)/2-.5);state.target=lean<-.10?0:lean>.10?2:1;
 const up=lw.y<ls.y-.1&&rw.y<rs.y-.1,crouch=nose.y>((lh.y+rh.y)/2-.02);
 if(up&&state.y<=.02){state.vy=9;state.y=.03;beep(900);haptic(15);$("motion").textContent="JUMP"}
 else if(crouch&&!up){state.slide=.45;$("motion").textContent="SLIDE"}else $("motion").textContent=state.target===1?"MOTION READY":state.target===0?"LEAN LEFT":"LEAN RIGHT";
}
function collision(){
 for(const o of objects){
   const dz=Math.abs(o.position.z-player.position.z),dx=Math.abs(o.position.x-player.position.x);
   if(dz<2.2&&dx<1.25){
    const t=o.userData.type,safeJump=state.y>1.7,safeSlide=state.slide>0&&t==="barrier";
    if(!safeJump&&!safeSlide){gameOver();return}
   }
 }
 for(const c of coinObjs)if(!c.userData.taken&&Math.abs(c.position.z-player.position.z)<2&&Math.abs(c.position.x-player.position.x)<1.2){c.userData.taken=true;state.coins++;state.score+=50;beep(1100,.04);haptic(8);c.visible=false}
}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(!state.running||state.paused){renderer.render(scene,camera);return}
 state.lane+=(state.target-state.lane)*Math.min(1,dt*9);player.position.x=laneX[Math.round(state.lane)];
 state.y+=state.vy*dt;state.vy-=24*dt;if(state.y<=0){state.y=0;state.vy=0}player.position.y=state.y;state.slide=Math.max(0,state.slide-dt);player.scale.y=state.slide?0.62:1;
 const dz=state.speed*dt;objects.forEach(o=>o.position.z+=dz);coinObjs.forEach(c=>c.position.z+=dz);coinObjs.forEach(c=>c.rotation.z+=dt*5);
 objects=objects.filter(o=>{if(o.position.z>12){scene.remove(o);return false}return true});coinObjs=coinObjs.filter(c=>{if(c.position.z>12){scene.remove(c);return false}return true});
 lastSpawn+=dt;lastCoin+=dt;if(lastSpawn>Math.max(.55,1.1-state.speed/80)){obstacle();lastSpawn=0}if(lastCoin>.55){coin();lastCoin=0}
 state.distance+=state.speed*dt;state.score+=state.speed*dt*.7;state.speed=Math.min(38,state.speed+dt*.7);collision();
 $("score").textContent=Math.floor(state.score);$("coins").textContent=state.coins;$("distance").textContent=Math.floor(state.distance);
 renderer.render(scene,camera)
}
function resetWorld(){objects.forEach(o=>scene.remove(o));coinObjs.forEach(c=>scene.remove(c));objects=[];coinObjs=[]}
async function play(){
 resetWorld();state.running=true;state.paused=false;state.score=0;state.coins=0;state.distance=0;state.speed=18;state.lane=state.target=1;state.y=0;state.vy=0;state.slide=0;$("home").classList.add("hidden");$("over").classList.add("hidden");$("topbar").classList.remove("hidden");
 try{await setupPose();await startCamera()}catch(e){$("motion").textContent="Camera unavailable — keyboard mode";console.warn(e)}
}
function gameOver(){
 if(!state.running)return;state.running=false;if(stream)stream.getTracks().forEach(t=>t.stop());$("camera").style.display="none";$("pose").style.display="none";
 const s=Math.floor(state.score);if(s>state.best){state.best=s;localStorage.setItem("mr_best",s)}state.missions.runs=(state.missions.runs||0)+1;localStorage.setItem("mr_missions",JSON.stringify(state.missions));
 $("topbar").classList.add("hidden");$("over").classList.remove("hidden");$("final").textContent=s.toLocaleString();$("runStats").textContent=`${Math.floor(state.distance)} m • ${state.coins} coins • Best ${state.best.toLocaleString()}`;beep(180,.25);haptic(80)
}
function modal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden")}
$("play").onclick=play;$("again").onclick=play;$("home").onclick=()=>{$("over").classList.add("hidden");$("home").classList.remove("hidden")};$("close").onclick=()=>$("modal").classList.add("hidden");
$("pause").onclick=()=>{state.paused=!state.paused;$("pause").textContent=state.paused?"▶":"Ⅱ"};
$("cal").onclick=()=>modal("Calibration",`<p>Stand centered with your full upper body visible.</p><div class="row"><span>Neutral</span><b>Center</b></div><div class="row"><span>Lane left</span><b>Lean left</b></div><div class="row"><span>Lane right</span><b>Lean right</b></div><div class="row"><span>Jump</span><b>Both hands up</b></div><div class="row"><span>Slide</span><b>Crouch</b></div>`);
$("missions").onclick=()=>modal("Missions",`<div class="row"><span>First Run</span><b>${state.missions.runs>=1?"DONE":"RUN"}</b></div><div class="row"><span>1000 m total</span><b>RUN</b></div><div class="row"><span>Collect 100 coins</span><b>COLLECT</b></div><div class="row"><span>Perfect Motion</span><b>NO HIT</b></div>`);
$("wardrobe").onclick=()=>modal("Skins",`<div class="skin">CYAN<br>⚡<button onclick="selectSkin('cyan')">EQUIP</button></div><div class="skin">GOLD<br>★<button onclick="selectSkin('gold')">EQUIP</button></div><div class="skin">VIOLET<br>◆<button onclick="selectSkin('violet')">EQUIP</button></div>`);
$("settings").onclick=()=>modal("Settings",`<div class="row"><span>Language</span><button onclick="modal('Language','English / العربية ready')">EN / AR</button></div><div class="row"><span>Haptics</span><b>ON</b></div><div class="row"><span>Camera processing</span><b>ON-DEVICE</b></div><p style="color:#8794a8;font-size:12px">No video upload is implemented by this prototype.</p>`);
window.selectSkin=(s)=>{state.skin=s;localStorage.setItem("mr_skin",s);modal("Skin equipped",s.toUpperCase())};
addEventListener("keydown",e=>{if(!state.running)return;if(e.key==="ArrowLeft"||e.key==="a")state.target=Math.max(0,state.target-1);if(e.key==="ArrowRight"||e.key==="d")state.target=Math.min(2,state.target+1);if((e.key===" "||e.key==="ArrowUp"||e.key==="w")&&state.y===0){state.vy=9;state.y=.03}if(e.key==="ArrowDown"||e.key==="s")state.slide=.45;if(e.key==="p")state.paused=!state.paused});
init3D();animate();
