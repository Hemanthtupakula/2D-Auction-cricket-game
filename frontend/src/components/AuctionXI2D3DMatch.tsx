import React, {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {MiniMatch, MatchBall} from '../types';
import * as api from '../services/api';

type Props={match:MiniMatch;balls:MatchBall[];roomCode:string;memberId:string;myFranchiseCodes:string[];onMatchUpdate:(m:MiniMatch)=>void;setError:(s:string|null)=>void};

const BAT_INTENTS=['DEFEND','NORMAL','LOFT','LEAVE'] as const;
const speeds=[{id:'LOW',label:'SLOW'},{id:'MEDIUM',label:'MEDIUM'},{id:'HIGH',label:'FAST'}] as const;

function makePlayerTexture(label:string, accent:string, role:'bat'|'bowl'|'field'){
  const c=document.createElement('canvas');c.width=128;c.height=192;const x=c.getContext('2d')!;
  x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(0,0,0,.22)';x.beginPath();x.ellipse(64,184,34,7,0,0,Math.PI*2);x.fill();
  x.fillStyle='#f1c7a4';x.beginPath();x.arc(64,38,20,0,Math.PI*2);x.fill();
  x.fillStyle=accent;x.fillRect(38,60,52,65);x.fillStyle='#172033';x.fillRect(42,125,18,50);x.fillRect(68,125,18,50);
  x.strokeStyle='#e8edf7';x.lineWidth=5;x.beginPath();
  if(role==='bat'){x.moveTo(89,74);x.lineTo(112,126);}else{x.moveTo(38,74);x.lineTo(15,122);}
  x.stroke();x.fillStyle='white';x.font='bold 12px Arial';x.textAlign='center';x.fillText(label.slice(0,8),64,106);
  return new THREE.CanvasTexture(c);
}

export const AuctionXI2D3DMatch:React.FC<Props>=({match,balls,roomCode,memberId,myFranchiseCodes,onMatchUpdate,setError})=>{
 const mount=useRef<HTMLDivElement>(null); const world=useRef<{scene:THREE.Scene;camera:THREE.PerspectiveCamera;renderer:THREE.WebGLRenderer;aim:THREE.Mesh;ball:THREE.Mesh;bat:THREE.Mesh;clock:THREE.Clock;players:THREE.Group[]}|null>(null);
 const [aim,setAim]=useState({x:0,y:.58}); const [drag,setDrag]=useState(false); const [speed,setSpeed]=useState(1); const [release,setRelease]=useState(50); const [intent,setIntent]=useState<typeof BAT_INTENTS[number]>('NORMAL'); const [busy,setBusy]=useState(false); const [event,setEvent]=useState(''); const [lastBall,setLastBall]=useState<MatchBall|null>(null);
 const battingCode=match.battingFranchise|| (match.innings===2?match.awayFranchise:match.homeFranchise); const bowlingCode=match.bowlingFranchise|| (match.innings===2?match.homeFranchise:match.awayFranchise); const iBat=myFranchiseCodes.includes(battingCode); const iBowl=myFranchiseCodes.includes(bowlingCode); const active=match.status==='BALL_READY'||match.status==='BALL_EXECUTION'||match.status==='IN_PROGRESS';  const batters=match.innings===1?match.homeXi:match.awayXi; const bowlers=match.innings===1?match.awayXi:match.homeXi; const striker=batters.find(p=>p.id===match.currentStrikerId); const bowler=bowlers.find(p=>p.id===match.currentBowlerId);
 const runs=match.innings===1?match.homeRuns:match.awayRuns; const wickets=match.innings===1?match.homeWickets:match.awayWickets; const ballsUsed=match.innings===1?match.homeBalls:match.awayBalls;
 const overs=`${Math.floor(ballsUsed/6)}.${ballsUsed%6}`; const need=match.target?Math.max(0,match.target-runs):null;
 const deliveryZone=useMemo(()=>{ if(aim.y>.72)return 'SHORT'; if(aim.y<.34)return 'FULL'; return Math.abs(aim.x)>.32?'WIDE_LINE':'GOOD_LENGTH';},[aim]);
 useEffect(()=>{if(!mount.current)return;const scene=new THREE.Scene();scene.background=new THREE.Color('#071018');const camera=new THREE.PerspectiveCamera(45,1,.1,200);camera.position.set(0,11,18);camera.lookAt(0,0,0);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;mount.current.appendChild(renderer.domElement);const clock=new THREE.Clock();
 const hemi=new THREE.HemisphereLight(0xcfeaff,0x172018,2.1);scene.add(hemi);const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-10,18,8);key.castShadow=true;scene.add(key);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0x174b31,roughness:.9}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const pitch=new THREE.Mesh(new THREE.PlaneGeometry(5.2,23),new THREE.MeshStandardMaterial({color:0x8a714d,roughness:.82}));pitch.rotation.x=-Math.PI/2;pitch.position.y=.015;scene.add(pitch);
 const creaseMat=new THREE.MeshBasicMaterial({color:0xffffff});[-7.6,7.6].forEach(z=>{const l=new THREE.Mesh(new THREE.PlaneGeometry(5.2,.08),creaseMat);l.rotation.x=-Math.PI/2;l.position.set(0,.03,z);scene.add(l);});
 const stumpMat=new THREE.MeshStandardMaterial({color:0xe9e1c8});[-.28,0,.28].forEach(x=>{const s=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1.2,10),stumpMat);s.position.set(x,.62,7.25);s.castShadow=true;scene.add(s);});
 const back=new THREE.Mesh(new THREE.CylinderGeometry(28,28,12,64,1,true,0,Math.PI),new THREE.MeshBasicMaterial({color:0x0d1825,side:THREE.BackSide}));back.position.set(0,5,-12);scene.add(back);
 for(let i=0;i<5;i++){const light=new THREE.Mesh(new THREE.BoxGeometry(.25,8,.25),new THREE.MeshStandardMaterial({color:0x8793a1,emissive:0x24364a}));light.position.set(i%2?20:-20,4,(i-2)*9);scene.add(light);}
 const aimMesh=new THREE.Mesh(new THREE.RingGeometry(.28,.34,32),new THREE.MeshBasicMaterial({color:0x00e5c7,transparent:true,opacity:.95,side:THREE.DoubleSide}));aimMesh.rotation.x=-Math.PI/2;aimMesh.position.set(0,.08,0);scene.add(aimMesh);
 const ball=new THREE.Mesh(new THREE.SphereGeometry(.11,20,20),new THREE.MeshStandardMaterial({color:0xc93434,roughness:.3}));ball.castShadow=true;ball.visible=false;scene.add(ball);
 const bat=new THREE.Mesh(new THREE.BoxGeometry(.16,1.25,.09),new THREE.MeshStandardMaterial({color:0xe8d0a0}));bat.position.set(.55,.9,6.65);bat.rotation.z=-.25;bat.castShadow=true;scene.add(bat);
 const players:THREE.Group[]=[];const addP=(name:string,color:string,pos:[number,number,number],role:'bat'|'bowl'|'field')=>{const g=new THREE.Group();const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:makePlayerTexture(name,color,role),transparent:true}));spr.scale.set(1.35,2.05,1);g.add(spr);g.position.set(...pos);scene.add(g);players.push(g);};
 addP(striker?.shortName||'BAT', '#1e9f84',[0,0,6.6],'bat');addP(bowler?.shortName||'BOWL','#f0a43a',[0,0,-8.3],'bowl');const fpos:[[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[-8,0,1],[-5,0,-2],[7,0,1],[10,0,-3],[-11,0,-8],[9,0,-9]];fpos.forEach((p,i)=>addP(`F${i+1}`,'#6d7eea',p,'field'));
 world.current={scene,camera,renderer,aim:aimMesh,ball,bat,clock,players}; const resize=()=>{if(!mount.current||!world.current)return;const w=mount.current.clientWidth,h=mount.current.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};resize();window.addEventListener('resize',resize);let raf=0;const loop=()=>{raf=requestAnimationFrame(loop);renderer.render(scene,camera);};loop();return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);renderer.dispose();renderer.domElement.remove();world.current=null;};},[striker?.shortName, bowler?.shortName]);
 useEffect(()=>{if(world.current){world.current.aim.position.x=aim.x*2.0;world.current.aim.position.z=aim.y*16-8;world.current.bat.rotation.z=-.25-(speed-1)*.05;}},[aim,speed]);
 useEffect(()=>{const b=balls[balls.length-1];if(!b||(lastBall&&b.innings===lastBall.innings&&b.ballNumber===lastBall.ballNumber))return;setLastBall(b);setEvent(b.outcome==='SIX'?'SIX!':b.outcome==='FOUR'?'FOUR!':b.wicket?'WICKET!':b.runs===0?'DOT BALL':`${b.runs} RUN${b.runs===1?'':'S'}`);const w=world.current;if(!w)return;w.ball.visible=true;const start=new THREE.Vector3(0,1.3,-7.8),end=new THREE.Vector3(0,.95,6.5);const dest=b.outcome==='SIX'?new THREE.Vector3((Math.random()-.5)*13,5,20):b.outcome==='FOUR'?new THREE.Vector3((Math.random()-.5)*12,1,16):new THREE.Vector3((Math.random()-.5)*6,.7,11);const t=performance.now();const frame=(n:number)=>{const p=Math.min(1,(n-t)/1100);if(p<.55)w.ball.position.lerpVectors(start,end,p/.55);else{const q=(p-.55)/.45;w.ball.position.lerpVectors(end,dest,q);w.ball.position.y=end.y+Math.sin(q*Math.PI)*(b.outcome==='SIX'?4:1.2);}if(p<1)requestAnimationFrame(frame);else w.ball.visible=false;};requestAnimationFrame(frame);},[balls,lastBall]);
 const pointerToAim=(e:React.PointerEvent)=>{if(!mount.current)return;const r=mount.current.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width*2-1;const ny=(e.clientY-r.top)/r.height*2-1;setAim({x:Math.max(-.85,Math.min(.85,nx)),y:Math.max(.08,Math.min(.92,(ny+1)/2))});};
 const submitBowl=async()=>{if(!match.matchId||busy||!iBowl||!active)return;setBusy(true);try{const u=await api.submitBowlControl(roomCode,match.matchId,memberId,aim.x,aim.y,speed,release);onMatchUpdate(u);}catch(e){setError(e instanceof Error?e.message:'Bowling failed');}finally{setBusy(false);}};
 const submitBat=async()=>{if(!match.matchId||busy||!iBat||!active)return;setBusy(true);try{const u=await api.submitBatControl(roomCode,match.matchId,memberId,intent,release);onMatchUpdate(u);}catch(e){setError(e instanceof Error?e.message:'Batting failed');}finally{setBusy(false);}};
 return <div className="ax-game" onContextMenu={e=>e.preventDefault()}>
   <div className="ax-stage">
    <div ref={mount} className="ax-canvas" onPointerDown={e=>{if(iBowl&&active){setDrag(true);(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);pointerToAim(e);}}} onPointerMove={e=>{if(drag&&iBowl&&active)pointerToAim(e);}} onPointerUp={()=>setDrag(false)} />
    <div className="ax-hud"><div><div className="ax-kicker">AUCTION XI • LIVE MINI MATCH</div><div className="ax-teams">{battingCode} <span>vs</span> {bowlingCode}</div></div><div className="ax-score"><b>{runs}/{wickets}</b><small>{overs} OV{need!==null?` • NEED ${need}`:''}</small></div></div>
    {event&&<div className={`ax-event ${event==='SIX!'?'six':event==='WICKET!'?'wicket':''}`}>{event}</div>}
    <div className="ax-lower"><span>{iBat?'🟢 YOUR TURN — BAT':iBowl?'🟠 YOUR TURN — BOWL':'🔵 OPPONENT TURN'}</span><span>{striker?.shortName||'Striker'} • {bowler?.shortName||'Bowler'}</span></div>
    {iBowl&&active&&<div className="ax-aim-hint">DRAG ON PITCH TO AIM • {deliveryZone}</div>}
   </div>
   <div className="ax-controls">
    {iBowl&&active?<><div className="ax-control-title">BOWLING <em>{busy?'LOCKED':'AIM → SPEED → PERFECT RELEASE'}</em></div><div className="ax-speed">{speeds.map((s,i)=><button key={s.id} disabled={busy} onClick={()=>setSpeed(i)} className={speed===i?'on':''}>{s.label}</button>)}</div><div className="ax-meter"><span>EARLY</span><div><i style={{left:`${release}%`}}/><b/></div><span>PERFECT</span><input aria-label="release timing" type="range" min="0" max="100" value={release} disabled={busy} onChange={e=>setRelease(+e.target.value)}/><button className="ax-primary bowl" disabled={busy} onClick={submitBowl}>RELEASE</button></div></>:iBat&&active?<><div className="ax-control-title">BATTING <em>{busy?'LOCKED':'READ → INTENT → TIMING'}</em></div><div className="ax-intents">{BAT_INTENTS.map(x=><button key={x} disabled={busy} className={intent===x?'on':''} onClick={()=>setIntent(x)}>{x}</button>)}</div><div className="ax-meter"><span>EARLY</span><div><i style={{left:`${release}%`}}/><b/></div><span>PERFECT</span><input aria-label="shot timing" type="range" min="0" max="100" value={release} disabled={busy} onChange={e=>setRelease(+e.target.value)}/><button className="ax-primary bat" disabled={busy} onClick={submitBat}>TIME SHOT</button></div></>:<div className="ax-wait">{active?'WAITING FOR OPPONENT • WATCH THE BALL':'MATCH TRANSITION'}</div>}
    <div className="ax-bottom"><span>Ball {Math.max(1,(ballsUsed%6)+1)}</span><span>{lastBall?.commentary||'Read the game and make your decision.'}</span><span>FIELD MAP • LIVE POSITIONS</span></div>
   </div>
 </div>;
};
