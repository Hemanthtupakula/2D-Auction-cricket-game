import * as THREE from 'three';
import {lerp,clamp} from '../core/easing';
import {ActorHandle,Role,PresentationState} from '../core/types';

const roleScale:Record<Role,number>={BATTER:1.04,BOWLER:1.06,FIELDER:.94,KEEPER:.9};
export class DreamPlayerActor implements ActorHandle{
  id:string; role:Role; root=new THREE.Group(); state:PresentationState='IDLE'; private phase=Math.random()*10;
  private torso:THREE.Mesh; private head:THREE.Mesh; private bat?:THREE.Group;
  constructor(id:string,role:Role){this.id=id;this.role=role;const s=roleScale[role];
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.42,5,10),new THREE.MeshStandardMaterial({color:0xd7dbe0,roughness:.78}));body.position.y=.46*s;this.root.add(body);this.torso=body;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshStandardMaterial({color:0xc98968,roughness:.7}));head.position.y=.82*s;this.root.add(head);this.head=head;
    if(role==='BATTER'){const bat=new THREE.Group();const h=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.48,8),new THREE.MeshStandardMaterial({color:0xd7a86e}));h.rotation.z=Math.PI/2.7;bat.add(h);bat.position.set(.17,.53,.03);this.root.add(bat);this.bat=bat;}
    this.root.scale.setScalar(s);
  }
  setState(state:PresentationState){this.state=state;}
  update(dt:number,time:number){this.phase+=dt*1.7;const bob=Math.sin(this.phase)*.008;
    let lean=0,arm=0,batRot=0;
    const st=this.state;
    if(st.includes('READY')||st==='IDLE')lean=Math.sin(this.phase*.7)*.025;
    if(st.includes('RUN')){this.root.position.x+=Math.sin(time*9)*dt*.015;lean=Math.sin(time*12)*.08;}
    if(st.includes('TRIGGER')){lean=.08*Math.sin(clamp((time%1)/.45)*Math.PI);}
    if(st.includes('DEFENSIVE')){lean=-.16;batRot=-.35;}
    if(st.includes('DRIVE')){lean=.14*Math.sin(clamp((time%1)/.7)*Math.PI);batRot=.75;}
    if(st.includes('CUT')){lean=-.25;batRot=1.05;}
    if(st.includes('PULL')){lean=.3;batRot=1.2;}
    if(st.includes('FLICK')){lean=.16;batRot=.9;}
    if(st.includes('SWEEP')){lean=-.35;batRot=1.35;}
    if(st.includes('LOFT')){lean=.2;batRot=.95;}
    if(st==='MISS'||st==='LEAVE')lean=-.08;
    if(st.includes('CELEBRATE')){lean=.04*Math.sin(time*10);arm=.2+Math.abs(Math.sin(time*5))*.4;}
    if(st.includes('DISMISS'))lean=-.2;
    this.torso.rotation.z=lerp(this.torso.rotation.z,lean,.18);this.head.rotation.z=lerp(this.head.rotation.z,lean*.4,.18);this.torso.position.y=.46+bob+arm*.04;
    if(this.bat)this.bat.rotation.y=lerp(this.bat.rotation.y,batRot,.22);
  }
}

export class PlayerDirector{
  actors=new Map<string,DreamPlayerActor>(); group=new THREE.Group();
  ensure(id:string,role:Role){let a=this.actors.get(id);if(!a){a=new DreamPlayerActor(id,role);this.actors.set(id,a);this.group.add(a.root);}return a;}
  state(id:string,role:Role,state:PresentationState){this.ensure(id,role).setState(state);}
  position(id:string,role:Role,x:number,z:number){const a=this.ensure(id,role);a.root.position.set(x,0,z);}
  update(dt:number,time:number){for(const a of this.actors.values())a.update(dt,time);}
  reset(){for(const a of this.actors.values())a.setState(a.role==='BOWLER'?'IDLE':a.role==='KEEPER'?'CROUCH':'READY');}
}
