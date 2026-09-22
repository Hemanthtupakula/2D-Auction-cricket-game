import * as THREE from 'three';
export class BroadcastFX{group=new THREE.Group();private particles:THREE.Mesh[]=[];private active=0;
 constructor(){for(let i=0;i<36;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0}));this.group.add(m);this.particles.push(m);}}
 burst(kind:string){this.active=1;for(let i=0;i<this.particles.length;i++){const p=this.particles[i];p.position.set((Math.random()-.5)*2,.3+Math.random()*2,(Math.random()-.5)*2);p.userData.v=new THREE.Vector3((Math.random()-.5)*2,1+Math.random()*2,(Math.random()-.5)*2);(p.material as THREE.MeshBasicMaterial).opacity=kind==='WICKET'?.8:.5;}}
 update(dt:number){if(this.active<=0)return;this.active=Math.max(0,this.active-dt*1.8);for(const p of this.particles){const v=p.userData.v as THREE.Vector3;p.position.addScaledVector(v,dt);v.y-=3*dt;(p.material as THREE.MeshBasicMaterial).opacity=this.active*.65;}}
}
