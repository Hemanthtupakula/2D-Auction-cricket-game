import * as THREE from 'three';
import type {AuthoritativeBallPresentation,PlayerArchetype,PlayerIdentity,PlayerRole,PresentationState,TransformPose} from './types';
import {HybridCricketAssetAdapter,ProceduralCricketAssetAdapter,GLTFCricketAssetCache,ProductionPlayerAsset,PlayerAssetAdapter} from './assetAdapter';
import {stateFor} from './stateMachine';

interface RuntimePlayer{identity:PlayerIdentity;asset:ProductionPlayerAsset;state:PresentationState;started:number;archetype:PlayerArchetype;home:THREE.Vector3;yaw:number;}

function poseFor(state:PresentationState,t:number,a:PlayerArchetype):TransformPose{
 const p:TransformPose={x:0,y:0,z:0,yaw:0,lean:0,stride:0,armSwing:0,batAngle:0,headYaw:0};
 const power=a==='AGGRESSIVE_BATTER'?1.18:1,fast=a==='FAST_BOWLER'?1.2:1;
 const s=Math.sin(t*Math.PI),c=Math.cos(t*Math.PI*2);
 if(state==='RUNUP'){p.z=s*.72*fast;p.stride=c*.9;p.armSwing=c*.6}
 else if(state==='GATHER'){p.lean=-.08;p.armSwing=.5}
 else if(state.startsWith('RELEASE_')){p.lean=.12*fast;p.armSwing=1;p.stride=.2}
 else if(state==='FOLLOW_THROUGH'){p.z=.18;p.lean=.18;p.armSwing=.55}
 else if(state==='READ'||state==='TRIGGER'){p.headYaw=.2;p.lean=-.02}
 else if(state==='DEFENSIVE'){p.lean=-.16;p.batAngle=-.72;p.stride=.12}
 else if(state==='DRIVE'){p.lean=.12*power;p.batAngle=.8*power;p.stride=.3;p.armSwing=.85}
 else if(state==='CUT'){p.lean=.16;p.batAngle=1.05;p.x=.16;p.armSwing=.9}
 else if(state==='PULL'){p.lean=-.1;p.batAngle=1.2;p.x=.12;p.armSwing=1}
 else if(state==='FLICK'){p.lean=.08;p.batAngle=.95;p.x=-.08;p.armSwing=.8}
 else if(state==='SWEEP'){p.lean=-.12;p.batAngle=1.35;p.x=.2;p.armSwing=.9}
 else if(state==='LOFT'){p.batAngle=1.5;p.armSwing=1.1*power;p.stride=.35}
 else if(state==='LEAVE'){p.x=-.08;p.headYaw=.2;p.lean=.05}
 else if(state==='MISS'){p.lean=-.08;p.armSwing=.5}
 else if(state==='EDGE'){p.lean=.12;p.batAngle=.35;p.headYaw=.35}
 else if(state==='DISMISS'){p.lean=-.22;p.headYaw=-.35}
 else if(state==='SPRINT'){p.z=s*.7;p.stride=1;p.armSwing=1}
 else if(state==='DIVE'){p.y=.1;p.lean=-.5;p.x=s*.42}
 else if(state==='PICKUP'){p.y=-.08;p.lean=.45}
 else if(state==='THROW'){p.armSwing=1;p.lean=-.1}
 else if(state==='CATCH'){p.y=.12;p.armSwing=.65}
 else if(state==='CELEBRATE'){p.y=Math.abs(Math.sin(t*7))*.06;p.armSwing=.9+Math.sin(t*6)*.15;p.lean=Math.sin(t*3)*.08}
 else if(state==='REACT'){p.lean=Math.sin(t*5)*.12;p.headYaw=Math.sin(t*4)*.4}
 else if(state==='COLLECT'||state==='CROUCH'){p.y=-.08;p.lean=.28}
 else if(state==='APPEAL'){p.armSwing=.95;p.lean=-.1}
 else if(state==='SHIFT_LEFT')p.x=-.16;
 else if(state==='SHIFT_RIGHT')p.x=.16;
 else p.y=Math.sin(t*2)*.015;
 return p;
}

export class ProductionCricketPlayerRig {
 readonly group=new THREE.Group();
 private players=new Map<string,RuntimePlayer>();
 private adapter:PlayerAssetAdapter;
 private event:AuthoritativeBallPresentation|null=null;
 private phase='RESET'; private clock=0;
 constructor(adapter?:PlayerAssetAdapter){this.adapter=adapter??new ProceduralCricketAssetAdapter();this.group.name='AuctionXI-V4.1-RealCricketPlayers';}
 static withAssetCache(cache:GLTFCricketAssetCache){return new ProductionCricketPlayerRig(new HybridCricketAssetAdapter(cache,new ProceduralCricketAssetAdapter()));}
 addPlayer(identity:PlayerIdentity,position:THREE.Vector3,yaw=0){
  if(this.players.has(identity.id))return;
  const asset=this.adapter.createPlayer(identity);asset.root.position.copy(position);asset.root.rotation.y=yaw;asset.root.userData.playerName=identity.name;asset.root.userData.jerseyNumber=identity.jerseyNumber;asset.root.userData.teamCode=identity.teamCode;
  this.group.add(asset.root);const archetype=identity.archetype??this.defaultArchetype(identity.role);
  this.players.set(identity.id,{identity,asset,state:identity.role==='KEEPER'?'CROUCH':identity.role==='BOWLER'?'IDLE':'READY',started:this.clock,archetype,home:position.clone(),yaw});
 }
 removePlayer(id:string){const p=this.players.get(id);if(!p)return;this.group.remove(p.asset.root);p.asset.dispose();this.players.delete(id)}
 clear(){for(const id of [...this.players.keys()])this.removePlayer(id)}
 playBall(e:AuthoritativeBallPresentation){this.event=e;this.phase='PRE_BALL';this.clock=0;this.setAll()}
 setPhase(phase:string){this.phase=phase;if(this.event)this.setAll()}
 resetForNextBall(){this.phase='RESET';if(this.event)this.setAll();this.event=null}
 update(dt:number){const d=Math.max(0,dt);this.clock+=d;for(const p of this.players.values()){const local=Math.max(0,this.clock-p.started);p.asset.applyPose(poseFor(p.state,local,p.archetype),d)}}
 transitionPlayer(id:string,state:PresentationState){const p=this.players.get(id);if(!p)return;p.state=state;p.started=this.clock;p.asset.setState(state)}
 setPlayerPosition(id:string,pos:THREE.Vector3,yaw?:number){const p=this.players.get(id);if(!p)return;p.home.copy(pos);p.asset.root.position.copy(pos);if(yaw!==undefined){p.yaw=yaw;p.asset.root.rotation.y=yaw}}
 getPlayer(id:string){return this.players.get(id)?.asset.root??null}
 getState(id:string){return this.players.get(id)?.state}
 private setAll(){if(!this.event)return;for(const p of this.players.values()){p.state=stateFor(p.identity.role,this.event,this.phase,p.archetype);p.started=this.clock;p.asset.setState(p.state)}}
 private defaultArchetype(r:PlayerRole):PlayerArchetype{return r==='BATTER'||r==='NON_STRIKER'?'TECHNICAL_BATTER':r==='BOWLER'?'FAST_BOWLER':r==='KEEPER'?'KEEPER':'STANDARD_FIELDER'}
 dispose(){this.clear();this.group.clear()}
}

// Backward-compatible exports for the existing V4 integration surface.
export {ProceduralCricketAssetAdapter,HybridCricketAssetAdapter,GLTFCricketAssetCache} from './assetAdapter';
export type {ProductionPlayerAsset,PlayerAssetAdapter} from './assetAdapter';
