import * as THREE from 'three';
import type {AuthoritativeBallPresentation,PlayerArchetype,PlayerIdentity,PlayerRole,PresentationState,TransformPose} from './types';

export interface ProductionPlayerAsset{root:THREE.Group;applyPose(p:TransformPose,dt:number):void;setState(s:PresentationState):void;dispose():void;}
export interface PlayerAssetAdapter{createPlayer(p:PlayerIdentity):ProductionPlayerAsset;}

export class ProceduralCricketAssetAdapter implements PlayerAssetAdapter{
 createPlayer(p:PlayerIdentity):ProductionPlayerAsset{
  const root=new THREE.Group(); root.name=`player-${p.id}`;
  const kit=new THREE.MeshStandardMaterial({color:p.kitPrimary??0x173b70,roughness:.72});
  const white=new THREE.MeshStandardMaterial({color:p.kitSecondary??0xe8edf2,roughness:.8});
  const skin=new THREE.MeshStandardMaterial({color:0x9b6a4a,roughness:.9});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.32,5,8),kit);body.position.y=.55;root.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),skin);head.position.y=.93;root.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8,0,Math.PI*2,0,Math.PI*.55),kit);helmet.position.y=.97;root.add(helmet);
  for(const x of[-.065,.065]){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.35,4,6),white);m.position.set(x,.25,0);root.add(m)}
  for(const x of[-.17,.17]){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.04,.25,4,6),white);m.position.set(x,.57,0);root.add(m)}
  let state:PresentationState=p.role==='KEEPER'?'CROUCH':p.role==='BOWLER'?'IDLE':'READY';
  return{root,applyPose(q,dt){const k=1-Math.exp(-10*Math.max(0,dt));root.position.x+=(q.x-root.position.x)*k;root.position.y+=(q.y-root.position.y)*k;root.position.z+=(q.z-root.position.z)*k;root.rotation.z+=(q.lean-root.rotation.z)*k;root.userData.state=state;root.userData.batAngle=q.batAngle;root.userData.armSwing=q.armSwing},setState(s){state=s;root.userData.state=s},dispose(){root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();const a=m.material as THREE.Material|THREE.Material[];Array.isArray(a)?a.forEach(x=>x.dispose()):a?.dispose()})}};
 }
}

const releaseMap:Record<AuthoritativeBallPresentation['deliveryKind'],PresentationState>={PACE:'RELEASE_PACE',SWING:'RELEASE_SWING',CUTTER:'RELEASE_CUTTER',SLOWER:'RELEASE_SLOWER',YORKER:'RELEASE_YORKER',BOUNCER:'RELEASE_BOUNCER'};
const release=(k:AuthoritativeBallPresentation['deliveryKind']):PresentationState=>releaseMap[k];
function stateFor(role:PlayerRole,e:AuthoritativeBallPresentation,phase:string,a:PlayerArchetype):PresentationState{
 if(phase==='RESET')return role==='KEEPER'?'CROUCH':role==='BOWLER'?'IDLE':'READY';
 if(phase==='DELIVERY'&&role==='BOWLER')return release(e.deliveryKind);
 if((phase==='PRE_BALL'||phase==='DELIVERY')&&(role==='BATTER'||role==='NON_STRIKER'))return role==='BATTER'?'READ':'READY';
 if(phase==='CONTACT'&&role==='BATTER'){if(e.batterIntent==='LEAVE')return'LEAVE';if(e.outcome==='WICKET')return e.wicketType?.toLowerCase().includes('edge')?'EDGE':'DISMISS';if(e.batterIntent==='DEFENSIVE')return'DEFENSIVE';if(e.batterIntent==='LOFT')return'LOFT';const d=e.direction??0;return d<-.35?'CUT':d>.35?'PULL':'DRIVE'}
 if(phase==='FIELDING'&&role==='FIELDER')return e.outcome==='WICKET'?(a==='ATHLETIC_FIELDER'?'DIVE':'REACT'):(e.outcome==='FOUR'||e.outcome==='SIX'?'SPRINT':'REACT');
 if(phase==='FIELDING'&&role==='KEEPER')return e.outcome==='WICKET'?(e.wicketType?.toLowerCase().includes('catch')?'CATCH':'APPEAL'):'COLLECT';
 if(phase==='RESULT'&&e.outcome==='WICKET')return role==='BATTER'?'DISMISS':(role==='BOWLER'||role==='FIELDER'||role==='KEEPER')?'CELEBRATE':'READY';
 if(phase==='RESULT'&&(e.outcome==='FOUR'||e.outcome==='SIX')&&role==='BATTER')return'CELEBRATE';
 return role==='BOWLER'?'FOLLOW_THROUGH':role==='KEEPER'?'CROUCH':'READY';
}

function pose(s:PresentationState,t:number,a:PlayerArchetype):TransformPose{
 const p:TransformPose={x:0,y:0,z:0,yaw:0,lean:0,stride:0,armSwing:0,batAngle:0,headYaw:0};const power=a==='AGGRESSIVE_BATTER'?1.18:1,fast=a==='FAST_BOWLER'?1.2:1;
 if(s==='RUNUP'){p.z=Math.sin(t*Math.PI)*.8*fast;p.stride=Math.sin(t*Math.PI*2)*.8;p.armSwing=Math.sin(t*Math.PI*2)*.55}else if(s==='GATHER'){p.lean=-.08;p.armSwing=.45}else if(s.startsWith('RELEASE_')){p.lean=.12*fast;p.armSwing=1}else if(s==='FOLLOW_THROUGH'){p.z=.2;p.lean=.18;p.armSwing=.55}else if(s==='READ'||s==='TRIGGER'){p.headYaw=.2}else if(s==='DEFENSIVE'){p.lean=-.16;p.batAngle=-.7;p.stride=.15}else if(s==='DRIVE'){p.lean=.12*power;p.batAngle=.8*power;p.stride=.3;p.armSwing=.85}else if(s==='CUT'){p.lean=.16;p.batAngle=1.05;p.x=.16;p.armSwing=.9}else if(s==='PULL'){p.lean=-.1;p.batAngle=1.2;p.x=.12;p.armSwing=1}else if(s==='FLICK'){p.lean=.08;p.batAngle=.95;p.x=-.08}else if(s==='SWEEP'){p.lean=-.12;p.batAngle=1.35;p.x=.2}else if(s==='LOFT'){p.batAngle=1.5;p.armSwing=1.1*power;p.stride=.35}else if(s==='LEAVE'){p.x=-.08;p.headYaw=.2}else if(s==='MISS'){p.lean=-.08;p.armSwing=.5}else if(s==='EDGE'){p.lean=.12;p.batAngle=.35;p.headYaw=.35}else if(s==='DISMISS'){p.lean=-.22;p.headYaw=-.35}else if(s==='SPRINT'){p.z=Math.sin(t*Math.PI)*.7;p.stride=1;p.armSwing=1}else if(s==='DIVE'){p.y=.1;p.lean=-.5;p.x=Math.sin(t*Math.PI)*.4}else if(s==='PICKUP'){p.y=-.08;p.lean=.45}else if(s==='THROW'){p.armSwing=1;p.lean=-.1}else if(s==='CATCH'){p.y=.12;p.armSwing=.65}else if(s==='CELEBRATE'){p.y=Math.abs(Math.sin(t*7))*.06;p.armSwing=.9+Math.sin(t*6)*.15;p.lean=Math.sin(t*3)*.08}else if(s==='REACT'){p.lean=Math.sin(t*5)*.12;p.headYaw=Math.sin(t*4)*.4}else if(s==='COLLECT'||s==='CROUCH'){p.y=-.08;p.lean=.28}else if(s==='APPEAL'){p.armSwing=.95;p.lean=-.1}else if(s==='SHIFT_LEFT')p.x=-.16;else if(s==='SHIFT_RIGHT')p.x=.16;else p.y=Math.sin(t*2)*.015;return p;
}

export class ProductionCricketPlayerRig{
 readonly group=new THREE.Group();private players=new Map<string,{identity:PlayerIdentity;asset:ProductionPlayerAsset;state:PresentationState;started:number;archetype:PlayerArchetype}>();private adapter:PlayerAssetAdapter;private event:AuthoritativeBallPresentation|null=null;private phase='RESET';private clock=0;
 constructor(adapter:PlayerAssetAdapter=new ProceduralCricketAssetAdapter()){this.adapter=adapter;this.group.name='AuctionXI-V4-ProductionCricketPlayers'}
 addPlayer(identity:PlayerIdentity,position:THREE.Vector3,yaw=0){if(this.players.has(identity.id))return;const asset=this.adapter.createPlayer(identity);asset.root.position.copy(position);asset.root.rotation.y=yaw;this.group.add(asset.root);this.players.set(identity.id,{identity,asset,state:identity.role==='KEEPER'?'CROUCH':identity.role==='BOWLER'?'IDLE':'READY',started:this.clock,archetype:identity.archetype??this.defaultArchetype(identity.role)})}
 removePlayer(id:string){const p=this.players.get(id);if(!p)return;this.group.remove(p.asset.root);p.asset.dispose();this.players.delete(id)}
 clear(){for(const id of [...this.players.keys()])this.removePlayer(id)}
 playBall(e:AuthoritativeBallPresentation){this.event=e;this.phase='PRE_BALL';this.clock=0;this.setAll()}
 setPhase(p:string){this.phase=p;if(this.event)this.setAll()}
 resetForNextBall(){this.phase='RESET';if(this.event)this.setAll();this.event=null}
 update(dt:number){this.clock+=Math.max(0,dt);for(const p of this.players.values())p.asset.applyPose(pose(p.state,Math.max(0,this.clock-p.started),p.archetype),dt)}
 transitionPlayer(id:string,state:PresentationState){const p=this.players.get(id);if(p){p.state=state;p.started=this.clock;p.asset.setState(state)}}
 setPlayerPosition(id:string,pos:THREE.Vector3,yaw?:number){const p=this.players.get(id);if(!p)return;p.asset.root.position.copy(pos);if(yaw!==undefined)p.asset.root.rotation.y=yaw}
 private setAll(){if(!this.event)return;for(const p of this.players.values()){p.state=stateFor(p.identity.role,this.event,this.phase,p.archetype);p.started=this.clock;p.asset.setState(p.state)}}
 private defaultArchetype(r:PlayerRole):PlayerArchetype{return r==='BATTER'||r==='NON_STRIKER'?'TECHNICAL_BATTER':r==='BOWLER'?'FAST_BOWLER':r==='KEEPER'?'KEEPER':'STANDARD_FIELDER'}
 dispose(){this.clear();this.group.clear()}
}
