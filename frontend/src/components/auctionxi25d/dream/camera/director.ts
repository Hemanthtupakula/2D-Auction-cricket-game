import * as THREE from 'three';
import {easeInOut} from '../core/easing';
export type DreamCamera='BATTER_VIEW'|'BOWLER_VIEW'|'DELIVERY_TRACK'|'CONTACT_VIEW'|'BALL_FOLLOW'|'FIELDING_VIEW'|'BOUNDARY_VIEW'|'WICKET_VIEW'|'RESET_VIEW';
export class DreamCameraDirector{
  state:DreamCamera='BATTER_VIEW'; private from=new THREE.Vector3(0,4.2,10.5);private to=new THREE.Vector3(0,4.2,10.5);private progress=1;private look=new THREE.Vector3(0,.3,0);
  set(state:DreamCamera,instant=false){this.state=state;const p=this.presets(state);this.from.copy(this.to);this.to.copy(p.pos);this.look.copy(p.look);this.progress=instant?1:0;}
  presets(s:DreamCamera){switch(s){case'BOWLER_VIEW':return{pos:new THREE.Vector3(0,3.5,-10),look:new THREE.Vector3(0,.35,0)};case'BALL_FOLLOW':return{pos:new THREE.Vector3(4.4,3.2,4.8),look:new THREE.Vector3(0,.4,-1)};case'WICKET_VIEW':return{pos:new THREE.Vector3(-3.6,2.5,3.2),look:new THREE.Vector3(0,.6,0)};case'BOUNDARY_VIEW':return{pos:new THREE.Vector3(6,3.6,1),look:new THREE.Vector3(0,.5,-2)};case'FIELDING_VIEW':return{pos:new THREE.Vector3(5.4,6.4,6),look:new THREE.Vector3(0,0,0)};default:return{pos:new THREE.Vector3(0,4.2,10.5),look:new THREE.Vector3(0,.3,0)}}}
  update(cam:THREE.PerspectiveCamera,dt:number){this.progress=Math.min(1,this.progress+dt*2.6);const t=easeInOut(this.progress);cam.position.lerpVectors(this.from,this.to,t);cam.lookAt(this.look);}
}
