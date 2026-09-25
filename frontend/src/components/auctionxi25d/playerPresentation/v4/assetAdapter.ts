import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {PlayerAssetManifestEntry,PlayerIdentity,PresentationState,TransformPose} from './types';
import {applyFaceTexture} from './faceLikeness';
import {damp,dampAngle} from './math';
import {AnimationStateController} from './animationController';
import {SkeletalAnimationController} from './skeletalAnimation';

export interface ProductionPlayerAsset{root:THREE.Group;applyPose(p:TransformPose,dt:number):void;setState(s:PresentationState):void;dispose():void;}
export interface PlayerAssetAdapter{createPlayer(p:PlayerIdentity):ProductionPlayerAsset;}

const cloneMaterials=(root:THREE.Object3D,primary:number,secondary:number,skin:number,hair:number)=>{root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const mats=Array.isArray(m.material)?m.material:[m.material];m.material=mats.map(mat=>mat.clone());const cloned=Array.isArray(m.material)?m.material:[m.material];cloned.forEach(mat=>{const name=(mat.name||'').toLowerCase();if(name.includes('skin')&&'color'in mat)(mat as THREE.MeshStandardMaterial).color.setHex(skin);else if(name.includes('hair')&&'color'in mat)(mat as THREE.MeshStandardMaterial).color.setHex(hair);else if(name.includes('secondary')&&'color'in mat)(mat as THREE.MeshStandardMaterial).color.setHex(secondary);else if('color'in mat)(mat as THREE.MeshStandardMaterial).color.setHex(primary);});});};

export class GLTFCricketAssetCache{
 private loader=new GLTFLoader();private textures=new THREE.TextureLoader();private cache=new Map<string,THREE.Group>();private clips=new Map<string,THREE.AnimationClip[]>();private faceTextures=new Map<string,THREE.Texture>();
 async preload(entries:PlayerAssetManifestEntry[]){await Promise.all(entries.map(e=>this.load(e.url).catch(()=>undefined)));}
 async preloadProfiles(profiles:PlayerIdentity[]){await Promise.all(profiles.flatMap(p=>[p.assetUrl?this.load(p.assetUrl).catch(()=>undefined):Promise.resolve(undefined),p.faceTextureUrl?this.loadFaceTexture(p.faceTextureUrl).catch(()=>undefined):Promise.resolve(undefined)]));}
 async load(url:string){if(this.cache.has(url))return this.cache.get(url)!;const gltf=await this.loader.loadAsync(url);const root=gltf.scene;this.cache.set(url,root);this.clips.set(url,gltf.animations||[]);return root;}
 async loadFaceTexture(url:string){if(this.faceTextures.has(url))return this.faceTextures.get(url)!;const t=await this.textures.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;this.faceTextures.set(url,t);return t;}
 get(url:string){return this.cache.get(url)}
 getAnimations(url:string){return this.clips.get(url)||[]}
 getFaceTexture(url:string){return this.faceTextures.get(url)}
 dispose(){this.cache.clear();this.clips.clear();this.faceTextures.forEach(t=>t.dispose());this.faceTextures.clear();}
}

class GLTFPlayerAsset implements ProductionPlayerAsset{
 readonly root:THREE.Group;
 private mixer:THREE.AnimationMixer;
 private animController:AnimationStateController;
 private skeletal:SkeletalAnimationController;
 private identity:PlayerIdentity;
 private currentState:PresentationState;
 private hasActiveClip=false;
 private time=0;

 constructor(scene:THREE.Object3D,clips:THREE.AnimationClip[],identity:PlayerIdentity,face?:THREE.Texture){
  this.identity=identity;
  this.currentState=identity.role==='KEEPER'?'CROUCH':identity.role==='BOWLER'?'IDLE':'READY';
  this.root=new THREE.Group();
  const model=SkeletonUtils.clone(scene);
  model.scale.multiplyScalar(identity.heightScale??1);
  cloneMaterials(model,identity.kitPrimary??0x071321,identity.kitSecondary??0x10b9d6,identity.skinTone??0x9b6a4a,identity.hairColor??0x17120e);
  if(face)applyFaceTexture(model,face);
  this.root.add(model);

  this.mixer=new THREE.AnimationMixer(model);
  this.animController=new AnimationStateController(this.mixer,clips,identity.clipMap,identity.animationSet);
  this.skeletal=new SkeletalAnimationController(model);

  const coverage=this.skeletal.getCoverage();
  this.root.userData.playerId=identity.id;
  this.root.userData.realAsset=true;
  this.root.userData.visualProfileId=identity.visualProfileId;
  this.root.userData.likenessId=identity.likenessId;
  this.root.userData.displayName=identity.name;
  this.root.userData.jerseyNumber=identity.jerseyNumber;
  this.root.userData.clipMap=identity.clipMap;
  this.root.userData.hasClips=this.animController.hasClips;
  this.root.userData.clipCount=this.animController.clipCount;
  this.root.userData.boneCoverage=coverage;
 }

 applyPose(p:TransformPose,dt:number){
  const d=Math.max(0,dt);
  this.time+=d;
  this.root.position.x=damp(this.root.position.x,p.x,12,d);
  this.root.position.y=damp(this.root.position.y,p.y,12,d);
  this.root.position.z=damp(this.root.position.z,p.z,12,d);
  this.root.rotation.y=dampAngle(this.root.rotation.y,p.yaw,12,d);
  this.root.rotation.z=dampAngle(this.root.rotation.z,p.lean,12,d);
  this.root.userData.batAngle=p.batAngle;
  this.root.userData.armSwing=p.armSwing;

  this.animController.update(d);
  if(!this.hasActiveClip)this.skeletal.update(this.currentState,p,this.identity.archetype,this.time,d);
 }

 setState(state:PresentationState){
  this.currentState=state;
  this.hasActiveClip=this.animController.setState(state);
  this.skeletal.setState(state);
  this.root.userData.animationState=state;
  this.root.userData.hasActiveClip=this.hasActiveClip;
  this.root.userData.currentClip=this.animController.currentClip;
 }

 dispose(){
  this.animController.stop();
  this.mixer.stopAllAction();
  this.root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();const a=m.material as THREE.Material|THREE.Material[];if(Array.isArray(a))a.forEach(x=>x.dispose());else a?.dispose();});
 }
}

export class HybridCricketAssetAdapter implements PlayerAssetAdapter{
 constructor(private cache:GLTFCricketAssetCache,private fallback:PlayerAssetAdapter){}
 createPlayer(p:PlayerIdentity){
  if(p.assetUrl){
   const scene=this.cache.get(p.assetUrl);
   if(scene)return new GLTFPlayerAsset(scene,this.cache.getAnimations(p.assetUrl),p,p.faceTextureUrl?this.cache.getFaceTexture(p.faceTextureUrl):undefined);
  }
  return this.fallback.createPlayer(p);
 }
 async ensureLoaded(p:PlayerIdentity):Promise<ProductionPlayerAsset|null>{
  if(!p.assetUrl)return null;
  try{
   await this.cache.load(p.assetUrl);
   if(p.faceTextureUrl){try{await this.cache.loadFaceTexture(p.faceTextureUrl);}catch{}}
   const scene=this.cache.get(p.assetUrl);
   return scene?new GLTFPlayerAsset(scene,this.cache.getAnimations(p.assetUrl),p,p.faceTextureUrl?this.cache.getFaceTexture(p.faceTextureUrl):undefined):null;
  }catch{return null;}
 }
 async preloadProfiles(profiles:PlayerIdentity[]):Promise<void>{await this.cache.preloadProfiles(profiles);}
}

export class ProceduralCricketAssetAdapter implements PlayerAssetAdapter{
 createPlayer(p:PlayerIdentity):ProductionPlayerAsset{
  const root=new THREE.Group();
  root.name=`player-${p.id}`;
  root.userData.realAsset=false;
  root.userData.likenessId=p.likenessId;
  root.userData.displayName=p.name;
  root.userData.jerseyNumber=p.jerseyNumber;
  const primary=new THREE.MeshStandardMaterial({color:p.kitPrimary??0x071321,roughness:.62,metalness:.02});
  const secondary=new THREE.MeshStandardMaterial({color:p.kitSecondary??0x10b9d6,roughness:.78});
  const skin=new THREE.MeshStandardMaterial({color:p.skinTone??0x9b6a4a,roughness:.9});
  const dark=new THREE.MeshStandardMaterial({color:p.hairColor??0x17120e,roughness:.92});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.34,8,12),primary);
  body.position.y=.62;root.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.115,16,12),skin);
  head.position.y=1.02;head.name='FaceFallback';root.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.132,16,10,0,Math.PI*2,0,Math.PI*.56),primary);
  helmet.position.y=1.055;root.add(helmet);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8,0,Math.PI*2,0,Math.PI*.35),dark);
  hair.position.y=1.08;root.add(hair);
  for(const x of[-.075,.075]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.058,.38,6,8),secondary);leg.position.set(x,.27,0);root.add(leg);const shoe=new THREE.Mesh(new THREE.BoxGeometry(.12,.055,.24),dark);shoe.position.set(x,.045,.035);root.add(shoe);}
  for(const x of[-.19,.19]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.29,6,8),primary);arm.position.set(x,.67,0);root.add(arm);const glove=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),secondary);glove.position.set(x,.48,.01);root.add(glove);}
  const bat=new THREE.Mesh(new THREE.BoxGeometry(.045,.52,.075),new THREE.MeshStandardMaterial({color:0xc99555,roughness:.7}));
  bat.position.set(.2,.56,.08);bat.rotation.z=.18;root.add(bat);
  let state:PresentationState=p.role==='KEEPER'?'CROUCH':p.role==='BOWLER'?'IDLE':'READY';
  return{root,applyPose(q,dt){root.position.x=damp(root.position.x,q.x,12,dt);root.position.y=damp(root.position.y,q.y,12,dt);root.position.z=damp(root.position.z,q.z,12,dt);root.rotation.y=dampAngle(root.rotation.y,q.yaw,12,dt);root.rotation.z=dampAngle(root.rotation.z,q.lean,12,dt);root.userData.batAngle=q.batAngle;root.userData.armSwing=q.armSwing;root.userData.animationState=state;},setState(s){state=s;root.userData.animationState=s;},dispose(){root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();const a=m.material as THREE.Material|THREE.Material[];Array.isArray(a)?a.forEach(x=>x.dispose()):a?.dispose();});}};
 }
}

export const defaultManifestFor=(base:string):PlayerAssetManifestEntry[]=>[
 {id:'generic-batter',url:`${base}/batter.glb`,role:'BATTER'},
 {id:'generic-bowler',url:`${base}/bowler.glb`,role:'BOWLER'},
 {id:'generic-fielder',url:`${base}/fielder.glb`,role:'FIELDER'},
 {id:'generic-keeper',url:`${base}/keeper.glb`,role:'KEEPER'}
];
