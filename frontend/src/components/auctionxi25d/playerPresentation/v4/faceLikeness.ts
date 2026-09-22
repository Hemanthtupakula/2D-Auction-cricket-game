import * as THREE from 'three';
import type {FaceTextureOptions,FriendLikenessProfile,PlayerIdentity} from './types';

const DEFAULT_HINTS=['head','face','skin','facial'];
const cloneTexture=(texture:THREE.Texture)=>{const t=texture.clone();t.needsUpdate=true;t.colorSpace=THREE.SRGBColorSpace;return t;};

/** Applies an already UV-authored face texture to a rigged GLB. A normal portrait photo is NOT treated as a UV texture. */
export function applyFaceTexture(root:THREE.Object3D,texture:THREE.Texture,options:FaceTextureOptions={}):number{
 const hints=(options.headMeshNameHints?.length?options.headMeshNameHints:DEFAULT_HINTS).map(x=>x.toLowerCase());
 const materialHints=(options.skinMaterialNameHints?.length?options.skinMaterialNameHints:['skin','face','head']).map(x=>x.toLowerCase());
 const face=cloneTexture(texture);let applied=0;
 root.traverse(o=>{
  const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
  const meshName=mesh.name.toLowerCase();
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  mats.forEach(mat=>{
   const name=(mat.name||'').toLowerCase();
   if(hints.some(h=>meshName.includes(h))||materialHints.some(h=>name.includes(h))){
    const m=mat as THREE.MeshStandardMaterial;
    m.map=face;m.roughness=options.roughness??.82;m.metalness=options.metalness??0;m.needsUpdate=true;applied++;
   }
  });
 });
 return applied;
}

export function profileToIdentity(p:FriendLikenessProfile,teamCode:string):PlayerIdentity{
 return {id:`friend-${p.likenessId}`,name:p.displayName,role:p.role,archetype:p.archetype,jerseyNumber:p.jerseyNumber,teamCode,kitPrimary:p.kitPrimary,kitSecondary:p.kitSecondary,skinTone:p.skinTone,hairColor:p.hairColor,heightScale:p.heightScale,assetUrl:p.glbUrl,faceTextureUrl:p.faceTextureUrl,animationSet:p.animationSet,likenessId:p.likenessId};
}
