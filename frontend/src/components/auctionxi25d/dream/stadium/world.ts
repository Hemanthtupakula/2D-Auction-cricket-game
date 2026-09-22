import * as THREE from 'three';
export class DreamStadiumWorld{
 group=new THREE.Group(); lights=new THREE.Group(); crowd=new THREE.Group(); private pulse=0;
 constructor(){this.build();}
 private build(){
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0x174b2a,roughness:1}));grass.rotation.x=-Math.PI/2;this.group.add(grass);
  const pitch=new THREE.Mesh(new THREE.PlaneGeometry(6,24),new THREE.MeshStandardMaterial({color:0xb79a6a,roughness:.92}));pitch.rotation.x=-Math.PI/2;pitch.position.y=.015;this.group.add(pitch);
  for(const z of [-8.7,8.7]){const crease=new THREE.Mesh(new THREE.BoxGeometry(5.2,.018,.04),new THREE.MeshStandardMaterial({color:0xffffff}));crease.position.set(0,.04,z);this.group.add(crease);for(const x of [-.16,0,.16]){const st=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.7,8),new THREE.MeshStandardMaterial({color:0xf2f2f2}));st.position.set(x,.38,z);this.group.add(st);}}
  const boundary=new THREE.Mesh(new THREE.TorusGeometry(28,.08,8,96),new THREE.MeshStandardMaterial({color:0xf1f1f1,emissive:0x123322}));boundary.rotation.x=Math.PI/2;boundary.position.y=.05;this.group.add(boundary);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.2;const x=Math.cos(a)*19,z=Math.sin(a)*19;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.12,10,8),new THREE.MeshStandardMaterial({color:0x34383e,metalness:.8}));pole.position.set(x,5,z);this.lights.add(pole);const lamp=new THREE.PointLight(0xffffff,22,30);lamp.position.set(x,10,z);this.lights.add(lamp);}
  for(let i=0;i<90;i++){const a=Math.random()*Math.PI*2,r=14+Math.random()*13;const s=new THREE.Mesh(new THREE.BoxGeometry(.18,.25,.18),new THREE.MeshStandardMaterial({color:0x4d5560,roughness:1}));s.position.set(Math.cos(a)*r,.15+Math.random()*.2,Math.sin(a)*r);this.crowd.add(s);}
  this.group.add(this.lights,this.crowd);
 }
 update(dt:number){this.pulse+=dt;for(const c of this.lights.children){if(c instanceof THREE.PointLight)c.intensity=20+Math.sin(this.pulse*2+c.position.x)*1.5;}}
}
