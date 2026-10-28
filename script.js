import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const $=id=>document.getElementById(id);
const canvas=$('view');let renderer,scene,camera,clock,player,monster,monsterLight;let running=false,paused=false,ended=false,hasStarted=false;
let yaw=0,pitch=0,velY=0,onGround=true,moveX=0,moveZ=0,keys={},cells=0,items=[],walls=[],lastMonster=0,toastTimer=0,flashTimer=0;
const playerHeight=1.65,cellPositions=[[-3,-10],[2,-25],[-2,-41]],exitZ=-54;
function show(el){el.classList.remove('hidden')}function hide(el){el.classList.add('hidden')}
function toast(t){$('toast').textContent=t;show($('toast'));clearTimeout(toastTimer);toastTimer=setTimeout(()=>hide($('toast')),1900)}
function message(t){$('message').textContent=t;show($('message'));setTimeout(()=>hide($('message')),2200)}
function init(){
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x050a10);scene.fog=new THREE.FogExp2(0x071019,.035);
 camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.1,100);camera.rotation.order='YXZ';
 clock=new THREE.Clock();
 scene.add(new THREE.HemisphereLight(0x9ab9d4,0x12100e,1.05));
 const overhead=new THREE.PointLight(0xa5d7ff,24,22,2);overhead.position.set(0,3.7,-8);scene.add(overhead);
 for(let z=2;z>-58;z-=8){const l=new THREE.PointLight(z%16===2?0x8acbff:0xffc78b,z%16===2?14:9,14,2);l.position.set(z%16===2?-2:2,3.5,z-2);scene.add(l);const fixture=new THREE.Mesh(new THREE.BoxGeometry(.65,.08,.3),new THREE.MeshStandardMaterial({color:0x526777,emissive:z%16===2?0x2c9bd2:0x8d5425,emissiveIntensity:2}));fixture.position.set(l.position.x,4.05,l.position.z);scene.add(fixture);}
 const mat=(color,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const concrete=mat(0x303a42),floorMat=mat(0x1c252c),dark=mat(0x101820),stripe=mat(0x9a6338);
 const floor=new THREE.Mesh(new THREE.BoxGeometry(9,.5,70),floorMat);floor.position.set(0,-.3,-25);floor.receiveShadow=true;scene.add(floor);
 const ceiling=new THREE.Mesh(new THREE.BoxGeometry(9,.4,70),dark);ceiling.position.set(0,4.4,-25);scene.add(ceiling);
 for(let z=8;z>-60;z-=4){for(const x of [-4.35,4.35]){const wall=new THREE.Mesh(new THREE.BoxGeometry(.5,4.5,4),concrete);wall.position.set(x,2,z);wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);walls.push({x,z,w:0.5,d:4});}if(z%8===0){for(const x of [-2.8,2.8]){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,4,8),mat(0x59656c,.45,.5));pipe.rotation.z=Math.PI/2;pipe.position.set(x,3.85,z);scene.add(pipe);}}}
 for(let z=4;z>-55;z-=7){const mark=new THREE.Mesh(new THREE.BoxGeometry(1.2,.025,.18),stripe);mark.position.set(0,-.035,z);scene.add(mark);}
 // Utility boxes, cables and warning signs
 for(let i=0;i<7;i++){const z= -5-i*7;const box=new THREE.Mesh(new THREE.BoxGeometry(.65,1.2,.55),mat(0x34414a,.75,.2));box.position.set(i%2?3.25:-3.25,.45,z);box.castShadow=true;scene.add(box);const led=new THREE.Mesh(new THREE.SphereGeometry(.06,8,8),new THREE.MeshBasicMaterial({color:i%2?0x39f4b0:0xff3c4c}));led.position.set(box.position.x,.8,z-.3);scene.add(led);}
 // Exit gate
 const gateMat=new THREE.MeshStandardMaterial({color:0x214b42,emissive:0x28ffb1,emissiveIntensity:1.2});
 const gate=new THREE.Mesh(new THREE.BoxGeometry(2.3,2.7,.15),gateMat);gate.position.set(0,1.25,-55);scene.add(gate);
 const gateLight=new THREE.PointLight(0x30ffb1,28,13,2);gateLight.position.set(0,2.7,-53);scene.add(gateLight);
 player=new THREE.Group();player.position.set(0,0,4);scene.add(player);
 camera.position.set(0,playerHeight,0);player.add(camera);
 const flashlight=new THREE.SpotLight(0xd9efff,55,27,Math.PI/7,.45,1.4);flashlight.position.set(0,-.1,-.1);flashlight.target.position.set(0,0,-1);camera.add(flashlight);camera.add(flashlight.target);
 // cells
 for(const [x,z] of cellPositions){const g=new THREE.Group();g.position.set(x,.65,z);const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.38,0),new THREE.MeshStandardMaterial({color:0x75fff0,emissive:0x24e8cf,emissiveIntensity:3,metalness:.25,roughness:.18}));g.add(crystal);const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.035,8,24),new THREE.MeshBasicMaterial({color:0x83ffec}));ring.rotation.x=Math.PI/2;g.add(ring);const light=new THREE.PointLight(0x44ffe2,8,6);g.add(light);scene.add(g);items.push({g,x,z,got:false});}
 // Creature: tall, unmistakable silhouette with glowing eyes
 monster=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,1.25,4,8),mat(0x080b10));body.position.y=1.15;monster.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),mat(0x13171d));head.position.y=2.05;monster.add(head);
 for(const x of [-.14,.14]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),new THREE.MeshBasicMaterial({color:0xff243d}));eye.position.set(x,2.1,-.29);monster.add(eye);}
 for(const x of [-.46,.46]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.1,.8,3,6),mat(0x090b0f));arm.position.set(x,1.25,-.03);arm.rotation.z=x<0?-.13:.13;monster.add(arm);}
 monster.position.set(0,0,-43);scene.add(monster);monsterLight=new THREE.PointLight(0xff263c,4,5);monsterLight.position.set(0,2,-.4);monster.add(monsterLight);
 // atmospheric lamps near walls
 for(let i=0;i<12;i++){const dust=new THREE.Mesh(new THREE.SphereGeometry(.025,5,5),new THREE.MeshBasicMaterial({color:0x9abac7,transparent:true,opacity:.35}));dust.position.set((Math.random()-.5)*6,Math.random()*3.5,-Math.random()*55);scene.add(dust);}
 addEventListener('resize',resize);clock.start();renderer.setAnimationLoop(tick);
}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function startGame(){if(!renderer){try{init()}catch(e){toast('3D graphics could not start. Try a browser with WebGL enabled.');console.error(e);return}}$('start').classList.add('hidden');hide($('tutorial'));hide($('end'));show($('hud'));show($('touchUI'));show($('crosshair'));cells=0;$('cells').textContent='0';$('objective').textContent='Find 3 power cells';items.forEach(it=>{it.got=false;it.g.visible=true});player.position.set(0,0,4);monster.position.set(0,0,-43);yaw=0;pitch=0;velY=0;onGround=true;paused=false;ended=false;running=true;hasStarted=true;clock.getDelta();message('Find the 3 glowing power cells.');}
function finish(win){if(ended)return;ended=true;running=false;hide($('touchUI'));hide($('hud'));hide($('crosshair'));show($('end'));$('endEyebrow').textContent=win?'ESCAPE CONFIRMED':'SIGNAL LOST';$('endTitle').textContent=win?'You made it out.':'It caught up.';$('endText').textContent=win?'The gate locks behind you. For now, you are safe.':'The lights flicker once more. The facility claims another visitor.';if(!win){$('flash').style.opacity='.85';setTimeout(()=>$('flash').style.opacity='0',130)}}
function doJump(){if(running&&!paused&&onGround){velY=5.5;onGround=false;}}
function doPickup(){if(!running||paused)return;let best=null,dist=2.4;for(const it of items){if(it.got)continue;const d=Math.hypot(player.position.x-it.x,player.position.z-it.z);if(d<dist){dist=d;best=it;}}if(best){best.got=true;best.g.visible=false;cells++;$('cells').textContent=cells;$('objective').textContent=cells===3?'Reach the green exit':'Find '+(3-cells)+' more power cell'+(3-cells===1?'':'s');toast('POWER CELL ACQUIRED  +1');message(cells===3?'Exit unlocked. Move to the green gate!':'Power restored. Keep searching.');}else toast('Move closer to a glowing power cell');}
function tick(){if(!renderer)return;const dt=Math.min(clock.getDelta(),.045);if(running&&!paused&&!ended)update(dt);if(running&&!paused&&!ended){items.forEach(it=>{if(!it.got){it.g.rotation.y+=dt*1.1;it.g.position.y=.65+Math.sin(performance.now()*.002+it.z)*.1;}});}renderer.render(scene,camera);}
function update(dt){const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-moveZ;const side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+moveX;const mag=Math.hypot(forward,side);if(mag>.05){const f=forward/mag,s=side/mag;player.position.x+=(Math.sin(yaw)*f+Math.cos(yaw)*s)*3.5*dt;player.position.z+=(-Math.cos(yaw)*f+Math.sin(yaw)*s)*3.5*dt;}
 player.position.x=THREE.MathUtils.clamp(player.position.x,-3.55,3.55);player.position.z=THREE.MathUtils.clamp(player.position.z,-56,7);
 velY-=12*dt;camera.position.y+=velY*dt;if(camera.position.y<=playerHeight){camera.position.y=playerHeight;velY=0;onGround=true;}
 camera.rotation.set(pitch,yaw,0,'YXZ');
 const dx=player.position.x-monster.position.x,dz=player.position.z-monster.position.z,dist=Math.hypot(dx,dz);
 if(dist<19){const speed=dist<5?1.45:1.0;monster.position.x+=dx/(dist||1)*speed*dt;monster.position.z+=dz/(dist||1)*speed*dt;monster.rotation.y=Math.atan2(dx,dz);if(dist<2.05)finish(false);}
 monster.position.x=THREE.MathUtils.clamp(monster.position.x,-3.2,3.2);
 if(cells===3&&player.position.z<-52&&Math.abs(player.position.x)<2.2)finish(true);
 // Proximity cue for cells
 const near=items.some(it=>!it.got&&Math.hypot(player.position.x-it.x,player.position.z-it.z)<2.5);
 $('pickupBtn').style.opacity=near?'1':'.62';
 if(dist<11&&performance.now()-lastMonster>6500){lastMonster=performance.now();toast('You hear something moving nearby…');}
}
$('startBtn').addEventListener('click',startGame);$('tutorialBtn').addEventListener('click',()=>{hide($('start'));show($('tutorial'))});$('backBtn').addEventListener('click',()=>{hide($('tutorial'));show($('start'))});$('restartBtn').addEventListener('click',startGame);$('menuBtn').addEventListener('click',()=>{hide($('end'));show($('start'));running=false});$('jumpBtn').addEventListener('pointerdown',e=>{e.preventDefault();doJump()});$('pickupBtn').addEventListener('pointerdown',e=>{e.preventDefault();doPickup()});
$('pauseBtn').addEventListener('click',()=>{if(!running)return;paused=!paused;$('pauseBtn').textContent=paused?'▶':'Ⅱ';if(paused)message('Paused — tap ▶ to continue');});
const area=$('stickArea'),knob=$('stickKnob');let stickId=null,stickCenter={x:0,y:0};area.addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;area.setPointerCapture(stickId);const r=$('stickRing').getBoundingClientRect();stickCenter={x:r.left+r.width/2,y:r.top+r.height/2};moveStick(e)});area.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});function moveStick(e){const dx=e.clientX-stickCenter.x,dy=e.clientY-stickCenter.y,len=Math.hypot(dx,dy),max=35,k=Math.min(1,max/(len||1));knob.style.left=(30+dx*k)+'px';knob.style.top=(30+dy*k)+'px';moveX=dx*k/max;moveZ=dy*k/max;}function releaseStick(e){if(e.pointerId!==stickId)return;stickId=null;moveX=0;moveZ=0;knob.style.left='30px';knob.style.top='30px';}area.addEventListener('pointerup',releaseStick);area.addEventListener('pointercancel',releaseStick);
let lookId=null,lastX=0,lastY=0;canvas.addEventListener('pointerdown',e=>{if(!running||paused||e.clientX<innerWidth*.34)return;lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(lookId)});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||!running||paused)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.15,1.15)});function releaseLook(e){if(e.pointerId===lookId)lookId=null}canvas.addEventListener('pointerup',releaseLook);canvas.addEventListener('pointercancel',releaseLook);
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'){e.preventDefault();doJump()}if(e.code==='KeyE')doPickup();if(e.code==='Escape'&&running){paused=!paused;$('pauseBtn').textContent=paused?'▶':'Ⅱ'}});addEventListener('keyup',e=>keys[e.code]=false);
