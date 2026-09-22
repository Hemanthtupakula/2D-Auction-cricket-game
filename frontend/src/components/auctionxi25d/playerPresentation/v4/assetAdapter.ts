import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {AnimationClipMap,PlayerAssetManifestEntry,PlayerIdentity,PresentationState,TransformPose} from './types';
import {damp,dampAngle} from './math';

export interface ProductionPlayerAsset {root:THREE.Group;applyPose(p:TransformPose,dt:number):void;setState(s:PresentationState):void;dispose():void;}
export interface PlayerAssetAdapter {createPlayer(p:PlayerIdentity):ProductionPlayerAsset;}

const cloneMaterials=(root:THREE.Object3D,primary:number,secondary:number,skin:number,hair:number)=>{
 root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(mat=>{const name=(mat.name||'').toLowerCase();if(name.includes('skin')&&'color' in mat)(mat as THREE.MeshStandardMaterial).color.setHex(skin);else if(name.includes('hair')&&'color' in mat)(mat as THREE.MeshStandardMaterial).color.setHex(hair);else if(name.includes('secondary')&&'color' in mat)(mat as THREE.MeshStandardMaterial).color.setHex(secondary);else if('color' in mat)(mat as THREE.MeshStandardMaterial).color.setHex(primary);});});
};

export class GLTFCricketAssetCache {
 private loader=new GLTFLoader(); private cache=new Map<string,THREE.Group>(); private clips=new Map<string,THREE.AnimationClip[]>();
 async preload(entries:PlayerAssetManifestEntry[]){await Promise.all(entries.map(e=>this.load(e.url)));}
 async load(url:string){if(this.cache.has(url))return this.cache.get(url)!;const gltf=await this.loader.loadAsync(url);const root=gltf.scene;this.cache.set(url,root);this.clips.set(url,gltf.animations||[]);return root;}
 get(url:string){return this.cache.get(url)}
 getAnimations(url:string){return this.clips.get(url)||[]}
}

class GLTFPlayerAsset implements ProductionPlayerAsset {
 readonly root:THREE.Group; private mixer:THREE.AnimationMixer; private actions=new Map<string,THREE.AnimationAction>(); private current=''; private baseY=0;
 constructor(scene:THREE.Object3D,clips:THREE.AnimationClip[],identity:PlayerIdentity,clipMap:AnimationClipMap={}){
  this.root=new THREE.Group();const model=scene.clone(true);model.scale.multiplyScalar(identity.heightScale??1);cloneMaterials(model,identity.kitPrimary??0x173b70,identity.kitSecondary??0xe8edf2,identity.skinTone??0x9b6a4a,identity.hairColor??0x17120e);this.root.add(model);
  this.mixer=new THREE.AnimationMixer(model);clips.forEach(c=>this.actions.set(c.name,crossFadeReady(this.mixer,c)));
  this.baseY=this.root.position.y;this.root.userData.playerId=identity.id;this.root.userData.realAsset=true;this.root.userData.clipMap=clipMap;
 }
 applyPose(p:TransformPose,dt:number){this.root.position.x=damp(this.root.position.x,p.x,12,dt);this.root.position.y=damp(this.root.position.y,this.baseY+p.y,12,dt);this.root.position.z=damp(this.root.position.z,p.z,12,dt);this.root.rotation.y=dampAngle(this.root.rotation.y,p.yaw,12,dt);this.root.rotation.z=damp(this.root.rotation.z,p.lean,12,dt);this.root.userData.batAngle=p.batAngle;this.root.userData.armSwing=p.armSwing;this.mixer.update(Math.max(0,dt));}
 setState(state:PresentationState){const aliases=(this.root.userData.clipMap as AnimationClipMap|undefined)?.[state]||[state];const key=aliases.find(x=>this.actions.has(x));if(!key||key===this.current)return;const next=this.actions.get(key)!;const prev=this.current?this.actions.get(this.current):undefined;prev?.fadeOut(.12);next.reset().fadeIn(.12).play();this.current=key;this.root.userData.animationState=state;}
 dispose(){this.mixer.stopAllAction();this.root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();});}
}
function crossFadeReady(m:THREE.AnimationMixer,c:THREE.AnimationClip){const a=m.clipAction(c);a.clampWhenFinished=false;return a;}

export class HybridCricketAssetAdapter implements PlayerAssetAdapter {
 constructor(private cache:GLTFCricketAssetCache,private fallback:PlayerAssetAdapter){ }
 createPlayer(p:PlayerIdentity){if(p.assetUrl){const scene=this.cache.get(p.assetUrl);if(scene)return new GLTFPlayerAsset(scene,this.cache.getAnimations(p.assetUrl),p);}return this.fallback.createPlayer(p)}
}

export class ProceduralCricketAssetAdapter implements PlayerAssetAdapter {
 createPlayer(p:PlayerIdentity):ProductionPlayerAsset{
  const root=new THREE.Group();root.name=`player-${p.id}`;root.userData.realAsset=false;
  const primary=new THREE.MeshStandardMaterial({color:p.kitPrimary??0x173b70,roughness:.62,metalness:.02});
  const secondary=new THREE.MeshStandardMaterial({color:p.kitSecondary??0xe8edf2,roughness:.78});
  const skin=new THREE.MeshStandardMaterial({color:p.skinTone??0x9b6a4a,roughness:.9});
  const dark=new THREE.MeshStandardMaterial({color:p.hairColor??0x17120e,roughness:.92});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.34,8,12),primary);body.position.y=.62;root.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.115,16,12),skin);head.position.y=1.02;root.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.132,16,10,0,Math.PI*2,0,Math.PI*.56),primary);helmet.position.y=1.055;root.add(helmet);
  const grille=new THREE.Mesh(new THREE.TorusGeometry(.08,.008,6,16,Math.PI),secondary);grille.rotation.x=Math.PI/2;grille.position.set(0,1.02,.07);root.add(grille);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8,0,Math.PI*2,0,Math.PI*.35),dark);hair.position.y=1.08;root.add(hair);
  for(const x of[-.075,.075]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.058,.38,6,8),secondary);leg.position.set(x,.27,0);root.add(leg);const shoe=new THREE.Mesh(new THREE.BoxGeometry(.12,.055,.24),dark);shoe.position.set(x,.045,.035);root.add(shoe)}
  for(const x of[-.19,.19]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.29,6,8),primary);arm.position.set(x,.67,0);arm.rotation.z=x<0?.25:-.25;root.add(arm);const glove=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),secondary);glove.position.set(x,.48,.01);root.add(glove)}
  const bat=new THREE.Mesh(new THREE.BoxGeometry(.045,.52,.075),new THREE.MeshStandardMaterial({color:0xc99555,roughness:.7}));bat.position.set(.2,.56,.08);bat.rotation.z=.18;root.add(bat);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.2,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;root.add(shadow);
  let state:PresentationState=p.role==='KEEPER'?'CROUCH':p.role==='BOWLER'?'IDLE':'READY';
  return {root,applyPose(q,dt){root.position.x=damp(root.position.x,q.x,12,dt);root.position.y=damp(root.position.y,q.y,12,dt);root.position.z=damp(root.position.z,q.z,12,dt);root.rotation.y=dampAngle(root.rotation.y,q.yaw,12,dt);root.rotation.z=damp(root.rotation.z,q.lean,12,dt);root.userData.batAngle=q.batAngle;root.userData.armSwing=q.armSwing;root.userData.animationState=state;},setState(s){state=s;root.userData.animationState=s},dispose(){root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();const a=m.material as THREE.Material|THREE.Material[];Array.isArray(a)?a.forEach(x=>x.dispose()):a.dispose()})}};
 }
}

export const defaultManifestFor=(base:string):PlayerAssetManifestEntry[]=>[
 {id:'generic-batter',url:`${base}/batter.glb`,role:'BATTER'},
 {id:'generic-bowler',url:`${base}/bowler.glb`,role:'BOWLER'},
 {id:'generic-fielder',url:`${base}/fielder.glb`,role:'FIELDER'},
 {id:'generic-keeper',url:`${base}/keeper.glb`,role:'KEEPER'}
];
