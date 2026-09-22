import * as THREE from 'three';
import {AuthoritativeBallEvent} from '../core/types';
import {PresentationTimeline} from '../core/timeline';
import {PlayerDirector} from '../players/rig';
import {BallDirector} from '../ball/director';
import {DreamCameraDirector} from '../camera/director';
import {DreamStadiumWorld} from '../stadium/world';
import {BroadcastFX} from '../fx/broadcastFx';

export class DreamMatchPresentation{
 readonly root=new THREE.Group(); readonly world=new DreamStadiumWorld(); readonly players=new PlayerDirector(); readonly ball=new BallDirector(); readonly camera=new DreamCameraDirector(); readonly fx=new BroadcastFX(); readonly timeline=new PresentationTimeline();
 private current?:AuthoritativeBallEvent; private elapsed=0;
 constructor(){this.root.add(this.world.group,this.players.group,this.ball.group,this.fx.group);}
 getCurrentBall(){return this.current;}
 playBall(e:AuthoritativeBallEvent){this.current=e;this.elapsed=0;this.timeline.reset();this.ball.begin(e);this.players.reset();
  if(e.bowlerId)this.players.state(e.bowlerId,'BOWLER',e.deliveryKind==='BOUNCER'?'RUN_UP':e.deliveryKind==='YORKER'?'RELEASE':'READY');
  if(e.strikerId)this.players.state(e.strikerId,'BATTER','TRIGGER');
  if(e.nonStrikerId)this.players.state(e.nonStrikerId,'BATTER','READY');
  if(e.fielders)for(const f of e.fielders)this.players.position(f.id,f.role==='KEEPER'?'KEEPER':'FIELDER',f.x,f.z);
  this.camera.set('BOWLER_VIEW');
  this.timeline.add('runup',0,.38,t=>{if(e.bowlerId&&t>.45)this.players.state(e.bowlerId,'BOWLER','RUN_UP');})
   .add('release',.38,.62,t=>{if(e.bowlerId&&t>.35)this.players.state(e.bowlerId,'BOWLER',`RELEASE_${e.deliveryKind}`);})
   .add('flight',.55,1.5,t=>{this.camera.set(t<.35?'DELIVERY_TRACK':'CONTACT_VIEW');})
   .add('response',1.05,1.65,()=>{if(e.strikerId)this.players.state(e.strikerId,'BATTER',this.batterState(e));})
   .add('result',1.55,2.6,t=>{this.applyOutcome(e,t);});
  this.timeline.start();
 }
 private batterState(e:AuthoritativeBallEvent){if(e.batterIntent==='LEAVE')return 'LEAVE';if(e.timingBand==='VERY_EARLY'||e.timingBand==='VERY_LATE')return 'MISS';if(e.outcome==='WICKET')return 'DISMISS';switch(e.batterIntent){case'DEFENSIVE':return 'DEFENSIVE';case'LOFT':return 'LOFT';default:return 'DRIVE';}}
 private applyOutcome(e:AuthoritativeBallEvent,t:number){if(t<.2)return;const big=e.outcome==='FOUR'||e.outcome==='SIX';const wicket=e.outcome==='WICKET'||e.outcome==='RUN_OUT';if(wicket){this.camera.set('WICKET_VIEW');this.fx.burst('WICKET');if(e.strikerId)this.players.state(e.strikerId,'BATTER','DISMISS');}else if(big){this.camera.set('BOUNDARY_VIEW');this.fx.burst(e.outcome);}else{this.camera.set('BALL_FOLLOW');}
  if(e.fielders)for(const f of e.fielders){if(wicket)this.players.state(f.id,f.role==='KEEPER'?'KEEPER':'FIELDER','REACT');else if(big)this.players.state(f.id,f.role==='KEEPER'?'KEEPER':'FIELDER','RUN');}
 }
 update(dt:number,cam:THREE.PerspectiveCamera){this.elapsed+=dt;this.timeline.tick();this.ball.update(Math.min(1,this.elapsed/1.7));this.players.update(dt,this.elapsed);this.world.update(dt);this.fx.update(dt);this.camera.update(cam,dt);}
 resetForNextBall(){this.current=undefined;this.elapsed=0;this.timeline.reset();this.ball.reset();this.players.reset();this.camera.set('BATTER_VIEW',true);}
}
