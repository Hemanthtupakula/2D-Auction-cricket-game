import * as THREE from 'three';
import type { AnimationClipMap, PresentationState } from './types';

const canonical=(s:string)=>s.toLowerCase().replace(/[\s\-]+/g,'_');

const aliasesFor=(state:PresentationState, map?:AnimationClipMap, animationSet?:string)=>{
  const explicit=map?.[state]||[];
  const generic=[state,state.toLowerCase(),canonical(state),state.replace('_',' ')];
  const set=animationSet ? [`${animationSet}_${state}`,`${animationSet}:${state}`] : [];
  return [...explicit,...set,...generic];
};

export class AnimationStateController {
  private actions=new Map<string,THREE.AnimationAction>();
  private current='';
  private target='';
  private crossFade=.14;

  constructor(private readonly mixer:THREE.AnimationMixer, clips:THREE.AnimationClip[], private readonly clipMap?:AnimationClipMap, private readonly animationSet?:string){
    clips.forEach(c=>this.actions.set(c.name,this.mixer.clipAction(c)));
  }

  get clipCount(){return this.actions.size;}
  get hasClips(){return this.actions.size>0;}
  get currentClip(){return this.current;}
  get targetClip(){return this.target;}

  setState(state:PresentationState){
    const key=aliasesFor(state,this.clipMap,this.animationSet).find(x=>this.actions.has(x));
    if(!key){this.target='';return false;}
    if(key===this.current)return true;
    const next=this.actions.get(key)!;
    const previous=this.current?this.actions.get(this.current):undefined;
    previous?.fadeOut(this.crossFade);
    next.reset().setEffectiveWeight(1).fadeIn(this.crossFade).play();
    this.current=key;this.target=key;
    return true;
  }

  update(dt:number){this.mixer.update(Math.max(0,dt));}
  stop(){this.mixer.stopAllAction();this.current='';this.target='';}
}
