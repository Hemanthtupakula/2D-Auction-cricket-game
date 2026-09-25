import * as THREE from 'three';
import type { AuthoritativeBallEvent } from '../core/types';

type UmpireSignal='NONE'|'FOUR'|'SIX'|'WICKET'|'WIDE'|'NO_BALL'|'RUN_OUT';

const hash=(value:string)=>{let h=2166136261>>>0;for(let i=0;i<value.length;i+=1){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

function labelTexture(title:string,subtitle:string,accent='#39e7c5'):THREE.CanvasTexture{
  const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=256;
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas context unavailable');
  const bg=ctx.createLinearGradient(0,0,1024,256);bg.addColorStop(0,'#061019');bg.addColorStop(1,'#0b1c24');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);
  ctx.fillStyle=accent;ctx.fillRect(0,0,18,256);ctx.fillRect(1006,0,18,256);
  ctx.fillStyle='#ffffff';ctx.font='900 58px Arial';ctx.fillText(title,48,106);
  ctx.fillStyle='#a9b7c7';ctx.font='700 28px Arial';ctx.fillText(subtitle,50,156);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}

function addShadowMesh(root:THREE.Object3D,mesh:THREE.Mesh,receive=true){mesh.castShadow=true;mesh.receiveShadow=receive;root.add(mesh);return mesh;}

export class DreamStadiumWorld{
  group=new THREE.Group();
  lights=new THREE.Group();
  crowd=new THREE.Group();
  private screens=new THREE.Group();
  private umpires=new THREE.Group();
  private umpireArms:THREE.Object3D[]=[];
  private pulse=0;
  private crowdEnergy=0.25;
  private signal:'NONE'|UmpireSignal='NONE';
  private signalTimer=0;
  private ledPhase=0;

  constructor(){this.group.name='AuctionXI-V4.10-BroadcastStadium';this.build();}

  private build(){
    const grassMat=new THREE.MeshStandardMaterial({color:0x124a2d,roughness:0.96,metalness:0});
    const grass=addShadowMesh(this.group,new THREE.Mesh(new THREE.PlaneGeometry(84,84),grassMat));grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;

    const outfield=new THREE.Mesh(new THREE.CircleGeometry(29,96),new THREE.MeshStandardMaterial({color:0x1e633a,roughness:1}));outfield.rotation.x=-Math.PI/2;outfield.position.y=.006;this.group.add(outfield);

    const pitchBase=addShadowMesh(this.group,new THREE.Mesh(new THREE.BoxGeometry(6.1,.18,24.3),new THREE.MeshStandardMaterial({color:0x9f8659,roughness:.82})));pitchBase.position.set(0,.08,0);
    const pitch=new THREE.Mesh(new THREE.PlaneGeometry(5.85,24),new THREE.MeshStandardMaterial({color:0xcab07e,roughness:.88}));pitch.rotation.x=-Math.PI/2;pitch.position.y=.19;this.group.add(pitch);
    for(const z of[-8.7,8.7]){
      const crease=addShadowMesh(this.group,new THREE.Mesh(new THREE.BoxGeometry(5.45,.025,.045),new THREE.MeshStandardMaterial({color:0xf4f4f0,roughness:.5})));crease.position.set(0,.215,z);
      const inner=addShadowMesh(this.group,new THREE.Mesh(new THREE.BoxGeometry(2.0,.02,.025),new THREE.MeshStandardMaterial({color:0xecebe2})));inner.position.set(0,.218,z-.42*(z>0?1:-1));
      for(const x of[-.18,0,.18]){const st=addShadowMesh(this.group,new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.72,8),new THREE.MeshStandardMaterial({color:0xf0f0f0,roughness:.4})));st.position.set(x,.56,z);}
      const bail=addShadowMesh(this.group,new THREE.Mesh(new THREE.BoxGeometry(.18,.04,.04),new THREE.MeshStandardMaterial({color:0xf0d47a,emissive:0x664400,emissiveIntensity:.4})));bail.position.set(0,.95,z); 
    }

    const boundary=addShadowMesh(this.group,new THREE.Mesh(new THREE.TorusGeometry(28.2,.11,10,128),new THREE.MeshStandardMaterial({color:0xf5f6ef,roughness:.42,metalness:.15})),false);boundary.rotation.x=Math.PI/2;boundary.position.y=.08;
    const led=addShadowMesh(this.group,new THREE.Mesh(new THREE.TorusGeometry(28.55,.16,8,128),new THREE.MeshStandardMaterial({color:0x36e7c3,emissive:0x0b7d6c,emissiveIntensity:2.4,roughness:.25,metalness:.55})),false);led.rotation.x=Math.PI/2;led.position.y=.075;led.userData.ledRing=true;

    this.buildStands();this.buildRoof();this.buildScreens();this.buildLights();this.buildUmpires();this.group.add(this.lights,this.crowd,this.screens,this.umpires);
  }

  private buildStands(){
    const standMat=new THREE.MeshStandardMaterial({color:0x111923,roughness:.78,metalness:.16});
    const tierMat=new THREE.MeshStandardMaterial({color:0x182735,roughness:.72,metalness:.12});
    const railMat=new THREE.MeshStandardMaterial({color:0x283846,roughness:.45,metalness:.5});
    const crowdMats=[0x273947,0x31526a,0x3d7b82,0x2d5e52].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.9}));
    for(let seg=0;seg<32;seg+=1){
      const angle=(seg/32)*Math.PI*2;
      const seed=hash(`stand-${seg}`);
      for(let tier=0;tier<3;tier+=1){
        const radius=31.0+tier*2.6;
        const width=5.8;
        const block=new THREE.Mesh(new THREE.BoxGeometry(width,1.55,4.3),tierMat);
        block.position.set(Math.cos(angle)*radius,1.25+tier*1.9,Math.sin(angle)*radius);block.rotation.y=-angle;block.castShadow=true;block.receiveShadow=true;this.group.add(block);
        const rail=new THREE.Mesh(new THREE.BoxGeometry(width-.22,.08,4.5),railMat);rail.position.set(block.position.x,block.position.y+1.0,block.position.z);rail.rotation.y=-angle;this.group.add(rail);
        for(let row=0;row<7;row+=1){
          const r=radius-.82+(row*.25);const y=2.0+tier*1.9+(row%2)*.05;
          const c=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.16,5,6),crowdMats[(seed+row*13)%crowdMats.length]);
          c.position.set(Math.cos(angle)*r,y,Math.sin(angle)*r);c.rotation.y=-angle+Math.PI/2;this.crowd.add(c);
        }
      }
    }
    const fascia=new THREE.Mesh(new THREE.TorusGeometry(35.4,.48,12,160),standMat);fascia.rotation.x=Math.PI/2;fascia.position.y=1.0;this.group.add(fascia);
  }

  private buildRoof(){
    const roofMat=new THREE.MeshStandardMaterial({color:0x0b1017,roughness:.56,metalness:.35,transparent:true,opacity:.94});
    const roof=new THREE.Mesh(new THREE.TorusGeometry(39,.75,12,160),roofMat);roof.position.y=14.4;roof.rotation.x=Math.PI/2;this.group.add(roof);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(34.7,.08,8,128),new THREE.MeshStandardMaterial({color:0x36e7c3,emissive:0x0c7f6b,emissiveIntensity:1.7,metalness:.65,roughness:.28}));ring.position.y=12.6;ring.rotation.x=Math.PI/2;this.group.add(ring);
    for(let i=0;i<16;i+=1){const a=i*Math.PI/8;const brace=new THREE.Mesh(new THREE.BoxGeometry(.22,13,.22),new THREE.MeshStandardMaterial({color:0x28343f,metalness:.8,roughness:.4}));brace.position.set(Math.cos(a)*34.5,6.6,Math.sin(a)*34.5);brace.rotation.z=Math.PI/2.0;brace.rotation.y=-a;this.group.add(brace);}
  }

  private buildScreens(){
    const entries=[
      {pos:new THREE.Vector3(0,8,-35),rot:0,title:'AUCTION XI',subtitle:'WANKHEDE • LIVE MATCH'},
      {pos:new THREE.Vector3(35,8,0),rot:-Math.PI/2,title:'AUCTION XI',subtitle:'PLAY • COMPETE • WIN'},
      {pos:new THREE.Vector3(0,8,35),rot:Math.PI,title:'LIVE CRICKET',subtitle:'2D + 3D BROADCAST'},
      {pos:new THREE.Vector3(-35,8,0),rot:Math.PI/2,title:'AUCTION XI',subtitle:'MATCH CENTER'},
    ];
    entries.forEach((e,index)=>{const tex=labelTexture(e.title,e.subtitle,index%2===0?'#39e7c5':'#4d9cff');const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,opacity:.96});const screen=new THREE.Mesh(new THREE.PlaneGeometry(10.5,3.0),mat);screen.position.copy(e.pos);screen.rotation.y=e.rot;this.screens.add(screen);});
  }

  private buildLights(){
    for(let i=0;i<6;i+=1){
      const a=(i/6)*Math.PI*2+.2;const x=Math.cos(a)*25.5;const z=Math.sin(a)*25.5;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.14,.22,12,10),new THREE.MeshStandardMaterial({color:0x27323c,roughness:.43,metalness:.75}));pole.position.set(x,6,z);pole.castShadow=true;this.lights.add(pole);
      const head=new THREE.Mesh(new THREE.BoxGeometry(1.6,.34,.65),new THREE.MeshStandardMaterial({color:0xd6dbe1,emissive:0xeaf5ff,emissiveIntensity:2.5,roughness:.22,metalness:.45}));head.position.set(x,12,z);head.rotation.y=-a+Math.PI/2;this.lights.add(head);
      for(let lamp=0;lamp<4;lamp+=1){const dx=((lamp%2)-.5)*.7;const dz=(Math.floor(lamp/2)-.5)*.25;const bulb=new THREE.Mesh(new THREE.SphereGeometry(.06,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));bulb.position.set(x+dx*Math.cos(a)-dz*Math.sin(a),12.0,z+dx*Math.sin(a)+dz*Math.cos(a));this.lights.add(bulb);}
      const light=new THREE.PointLight(0xd7efff,38,38,2);light.position.set(x,11.4,z);light.castShadow=false;this.lights.add(light);
    }
  }

  private buildUmpires(){
    const create=(name:string,pos:THREE.Vector3)=>{
      const root=new THREE.Group();root.name=`umpire-${name}`;root.position.copy(pos);
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.72,7,10),new THREE.MeshStandardMaterial({color:0x111820,roughness:.74}));body.position.y=.68;root.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),new THREE.MeshStandardMaterial({color:0x8d5d40,roughness:.84}));head.position.y=1.28;root.add(head);
      const hat=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.08,16),new THREE.MeshStandardMaterial({color:0x171d25,roughness:.55,metalness:.15}));hat.position.y=1.47;root.add(hat);
      const armMat=new THREE.MeshStandardMaterial({color:0x17222b,roughness:.74});
      const left=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.34,5,7),armMat);left.position.set(-.24,.78,0);root.add(left);
      const right=left.clone();right.position.x=.24;root.add(right);
      this.umpireArms.push(left,right);(left.userData as any).base=-1;(right.userData as any).base=1;
      this.umpires.add(root);
    };
    create('bowler-end',new THREE.Vector3(1.9,0,0));
    create('square-leg',new THREE.Vector3(-7.4,0,2.4));
  }

  reactToBall(event:AuthoritativeBallEvent){
    const outcome=event.outcome;
    const next:UmpireSignal = outcome==='FOUR'?'FOUR':outcome==='SIX'?'SIX':outcome==='WIDE'?'WIDE':outcome==='NO_BALL'?'NO_BALL':outcome==='RUN_OUT'?'RUN_OUT':outcome==='WICKET'?'WICKET':'NONE';
    this.signal=next;this.signalTimer=next==='NONE'?0:1.6;this.crowdEnergy=next==='SIX'||next==='WICKET'?1:next==='FOUR'?.78:.5;
  }

  update(dt:number){
    this.pulse+=dt;this.ledPhase+=dt*5;this.crowdEnergy=Math.max(.2,this.crowdEnergy-dt*.38);
    this.crowd.children.forEach((c,index)=>{const seed=(index+1)*.73;c.position.y=Math.max(.4,c.position.y+(Math.sin(this.pulse*(1.2+seed*.2)+index)*.006*this.crowdEnergy));c.rotation.z=Math.sin(this.pulse*1.7+index)*.06*this.crowdEnergy;});
    this.lights.children.forEach((obj,index)=>{if(obj instanceof THREE.PointLight)obj.intensity=35+Math.sin(this.pulse*2.2+index)*2+this.crowdEnergy*7;});
    const led=this.group.children.find(o=>o instanceof THREE.Mesh && o.geometry instanceof THREE.TorusGeometry && o.userData.ledRing) as THREE.Mesh|undefined;if(led&&led.material instanceof THREE.MeshStandardMaterial)led.material.emissiveIntensity=1.7+Math.sin(this.ledPhase)*.45+this.crowdEnergy*2.5;
    if(this.signalTimer>0){this.signalTimer=Math.max(0,this.signalTimer-dt);this.applySignal();}else{this.signal='NONE';this.neutralArms();}
  }

  private neutralArms(){
    for(const arm of this.umpireArms){const base=Number((arm.userData as any).base||1);arm.rotation.z=0;arm.rotation.x=0;arm.position.y=.78;arm.position.x=.24*base;}
  }

  private applySignal(){
    this.umpireArms.forEach((arm,index)=>{const base=Number((arm.userData as any).base||1);arm.position.x=.24*base;arm.rotation.z=0;arm.rotation.x=0;switch(this.signal){case'SIX':case'WIDE':arm.rotation.z=base*Math.PI/2;break;case'FOUR':arm.rotation.z=-base*.95;break;case'WICKET':case'RUN_OUT':if(index%2===1)arm.rotation.x=-1.55;else arm.rotation.x=-.18;break;case'NO_BALL':if(index%2===0)arm.rotation.z=-base*.9;break;default:break;}});
  }
}
