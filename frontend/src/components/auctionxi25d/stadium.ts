import * as THREE from "three";

function material(color:number, roughness=.72, metalness=0) {
  return new THREE.MeshStandardMaterial({color, roughness, metalness});
}

export interface StadiumBundle { group: THREE.Group; pitch: THREE.Mesh; ball: THREE.Mesh; }

export function buildBroadcastStadium(scene: THREE.Scene): StadiumBundle {
  const root = new THREE.Group();
  root.name = "AuctionXI_Broadcast_Stadium"; scene.add(root);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(42,32), material(0x10251d,.96));
  ground.rotation.x = -Math.PI/2; root.add(ground);

  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(4.25,24), material(0x7b6848,.92));
  pitch.rotation.x = -Math.PI/2; pitch.position.y=.035; root.add(pitch);

  const outfield = new THREE.Mesh(new THREE.RingGeometry(10.8,17.5,96), material(0x193b29,.95));
  outfield.rotation.x=-Math.PI/2; outfield.position.y=.045; root.add(outfield);

  const boundary = new THREE.Mesh(
    new THREE.TorusGeometry(13.9,.045,6,128),
    new THREE.MeshStandardMaterial({color:0xd6d0bd,roughness:.55})
  );
  boundary.rotation.x=Math.PI/2; boundary.position.y=.11; root.add(boundary);

  const creaseMat=material(0xf4eee0,.58);
  for (const z of [-9.7,-8.6,8.6,9.7]) {
    const line=new THREE.Mesh(new THREE.PlaneGeometry(4,.055),creaseMat);
    line.rotation.x=-Math.PI/2; line.position.set(0,.09,z); root.add(line);
  }

  const stumpsMat=material(0xf0e8d4,.42);
  for (const z of [-9.05,9.05]) for (const x of [-.32,0,.32]) {
    const stump=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.82,10),stumpsMat);
    stump.position.set(x,.5,z); root.add(stump);
  }

  const ring=new THREE.Mesh(
    new THREE.RingGeometry(15.3,18.4,96),
    new THREE.MeshStandardMaterial({color:0x141922,roughness:.72,side:THREE.DoubleSide})
  );
  ring.rotation.x=-Math.PI/2; ring.position.y=.02; root.add(ring);

  const standMat=material(0x242a35,.84);
  for (let i=0;i<24;i++) {
    const angle=(i/24)*Math.PI*2, r=16.8;
    const stand=new THREE.Mesh(new THREE.BoxGeometry(2.1,1.9+(i%3)*.5,1.2),standMat);
    stand.position.set(Math.cos(angle)*r,1,Math.sin(angle)*r);
    stand.rotation.y=-angle; root.add(stand);
  }

  const floodMat=new THREE.MeshBasicMaterial({color:0xfff5d6});
  for (const x of [-15,15]) {
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,8.5,10),material(0x555d68,.5,.4));
    pole.position.set(x,4.25,-8); root.add(pole);
    const light=new THREE.Mesh(new THREE.BoxGeometry(1.6,.08,.45),floodMat);
    light.position.set(x,8.3,-8); root.add(light);
  }

  const ball=new THREE.Mesh(
    new THREE.SphereGeometry(.12,20,20),
    new THREE.MeshStandardMaterial({color:0xb52b32,roughness:.28,metalness:.08})
  );
  ball.position.set(0,1,-9.05); root.add(ball);

  return {group:root,pitch,ball};
}
