import * as THREE from 'three';
import {AuthoritativeBallEvent} from '../core/types';
import {clamp,easeInOut,lerp} from '../core/easing';
export class BallDirector{
  group=new THREE.Group(); ball:THREE.Mesh; trail:THREE.Line; start=new THREE.Vector3(); bounce=new THREE.Vector3(); end=new THREE.Vector3(); arc=1.2; active=false;
  constructor(){this.ball=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshStandardMaterial({color:0x8b1111,roughness:.35}));this.group.add(this.ball);
    const g=new THREE.BufferGeometry().setFromPoints(Array.from({length:20},()=>new THREE.Vector3()));this.trail=new THREE.Line(g,new THREE.LineBasicMaterial({transparent:true,opacity:.35}));this.group.add(this.trail);}
  begin(e:AuthoritativeBallEvent){this.start.set(0,.13,6.6);this.bounce.set(e.trajectory?.bounceX??(e.target?.x??0),.12,e.trajectory?.bounceZ??1.4);this.end.set(e.trajectory?.endX??0,.55,e.trajectory?.endZ??-3);this.arc=e.trajectory?.arc??(e.deliveryKind==='BOUNCER'?2.2:e.deliveryKind==='YORKER'?.55:1.2);this.active=true;}
  sample(t:number){const p=clamp(t);if(p<.55){const q=easeInOut(p/.55);const x=lerp(this.start.x,this.bounce.x,q),z=lerp(this.start.z,this.bounce.z,q);const y=lerp(this.start.y,this.bounce.y,q)+Math.sin(q*Math.PI)*this.arc;return new THREE.Vector3(x,y,z);}const q=easeInOut((p-.55)/.45);return this.bounce.clone().lerp(this.end,q).add(new THREE.Vector3(0,Math.sin(q*Math.PI)*this.arc*.35,0));}
  update(t:number){if(!this.active)return;this.ball.position.copy(this.sample(t));const pts=[];for(let i=0;i<20;i++)pts.push(this.sample(Math.max(0,t-i*.018)));this.trail.geometry.setFromPoints(pts);if(t>=1)this.active=false;}
  reset(){this.active=false;this.ball.position.set(0,.13,6.6);}
}
