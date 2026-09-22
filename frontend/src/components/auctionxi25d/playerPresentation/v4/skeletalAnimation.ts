import * as THREE from 'three';
import type { PlayerArchetype, PresentationState, TransformPose } from './types';

type BoneMap = {
  pelvis?: THREE.Object3D; spine?: THREE.Object3D; chest?: THREE.Object3D; neck?: THREE.Object3D; head?: THREE.Object3D;
  lUpperArm?: THREE.Object3D; lForeArm?: THREE.Object3D; lHand?: THREE.Object3D;
  rUpperArm?: THREE.Object3D; rForeArm?: THREE.Object3D; rHand?: THREE.Object3D;
  lThigh?: THREE.Object3D; lShin?: THREE.Object3D; lFoot?: THREE.Object3D;
  rThigh?: THREE.Object3D; rShin?: THREE.Object3D; rFoot?: THREE.Object3D;
};

const norm = (s: string) => s.toLowerCase().replace(/[\s._\-:]+/g, '');
const findBone = (root: THREE.Object3D, aliases: string[]) => {
  const a = aliases.map(norm);
  let found: THREE.Object3D | undefined;
  root.traverse(o => {
    if (found) return;
    const n = norm(o.name);
    if (a.some(x => n === x || n.includes(x))) found = o;
  });
  return found;
};

export function discoverBones(root: THREE.Object3D): BoneMap {
  return {
    pelvis: findBone(root, ['pelvis','hips','hip']),
    spine: findBone(root, ['spine','spine1','spine01']),
    chest: findBone(root, ['chest','spine2','spine02','upperchest']),
    neck: findBone(root, ['neck']),
    head: findBone(root, ['head']),
    lUpperArm: findBone(root, ['leftupperarm','upperarml','leftarm','arml','shoulderl']),
    lForeArm: findBone(root, ['leftforearm','forearml','lowerarml','leftlowerarm']),
    lHand: findBone(root, ['lefthand','handl']),
    rUpperArm: findBone(root, ['rightupperarm','upperarmr','rightarm','armr','shoulderr']),
    rForeArm: findBone(root, ['rightforearm','forearmr','lowerarmr','rightlowerarm']),
    rHand: findBone(root, ['righthand','handr']),
    lThigh: findBone(root, ['leftupleg','leftthigh','thighl','uplegl']),
    lShin: findBone(root, ['leftleg','leftshin','shinl','calfl']),
    lFoot: findBone(root, ['leftfoot','footl']),
    rThigh: findBone(root, ['rightupleg','rightthigh','thighr','uplegr']),
    rShin: findBone(root, ['rightleg','rightshin','shinr','calfr']),
    rFoot: findBone(root, ['rightfoot','footr'])
  };
}

const damp = (a:number,b:number,k:number,dt:number) => a + (b-a) * (1-Math.exp(-k*Math.max(0,dt)));
const rot = (o:THREE.Object3D|undefined,x:number,y:number,z:number,k:number,dt:number) => {
  if (!o) return;
  o.rotation.x=damp(o.rotation.x,x,k,dt);
  o.rotation.y=damp(o.rotation.y,y,k,dt);
  o.rotation.z=damp(o.rotation.z,z,k,dt);
};

export class SkeletalAnimationController {
  readonly bones: BoneMap;
  private rest = new Map<THREE.Object3D, THREE.Euler>();
  private state: PresentationState | '' = '';
  private stateTime = 0;

  constructor(model: THREE.Object3D) {
    this.bones = discoverBones(model);
    model.traverse(o => {
      if (o instanceof THREE.Bone) this.rest.set(o, o.rotation.clone());
    });
  }

  getCoverage() {
    const keys = Object.keys(this.bones) as Array<keyof BoneMap>;
    return { found: keys.filter(k => !!this.bones[k]).length, total: keys.length };
  }

  setState(state: PresentationState) {
    if (state !== this.state) { this.state = state; this.stateTime = 0; }
  }

  update(state: PresentationState, p: TransformPose, archetype: PlayerArchetype|undefined, time: number, dt: number) {
    this.setState(state);
    this.stateTime += Math.max(0, dt);

    this.rest.forEach((r,b) => {
      b.rotation.x=damp(b.rotation.x,r.x,10,dt);
      b.rotation.y=damp(b.rotation.y,r.y,10,dt);
      b.rotation.z=damp(b.rotation.z,r.z,10,dt);
    });

    const b=this.bones;
    const power=archetype==='AGGRESSIVE_BATTER'?1.18:1;
    const fast=archetype==='FAST_BOWLER'?1.18:1;
    const stride=p.stride;
    const swing=p.armSwing;

    rot(b.spine,p.lean*.55,0,p.lean*.18,14,dt);
    rot(b.chest,p.lean*.85,0,p.lean*.28,14,dt);
    rot(b.head,0,p.headYaw*.8,0,12,dt);

    if (state==='RUNUP' || state==='SPRINT' || state==='RUN') {
      const phase=time*(state==='RUNUP'?8:10);
      const s=Math.sin(phase), c=Math.cos(phase);
      rot(b.lThigh,c*.75*fast,0,0,16,dt); rot(b.rThigh,-c*.75*fast,0,0,16,dt);
      rot(b.lShin,Math.max(0,-c)*.65,0,0,16,dt); rot(b.rShin,Math.max(0,c)*.65,0,0,16,dt);
      rot(b.lUpperArm,-s*.65,0,.05,16,dt); rot(b.rUpperArm,s*.65,0,-.05,16,dt);
    }

    if (state==='GATHER') {
      rot(b.lThigh,-.25,0,.08,14,dt); rot(b.rThigh,-.35,0,-.08,14,dt);
      rot(b.lUpperArm,-.8,0,.25,14,dt); rot(b.rUpperArm,-1.15,0,-.25,14,dt);
    }

    if (state.startsWith('RELEASE_')) {
      const x=state==='RELEASE_BOUNCER'?.35:state==='RELEASE_YORKER'?-.18:.08;
      rot(b.lUpperArm,-1.15,0,.55,20,dt); rot(b.rUpperArm,-1.45,0,-.65,20,dt);
      rot(b.lForeArm,-.45,0,.25,20,dt); rot(b.rForeArm,x,0,-.2,20,dt);
      rot(b.chest,.22,0,.08,18,dt);
    }

    if (state==='FOLLOW_THROUGH') {
      rot(b.lUpperArm,-.8,0,.55,12,dt); rot(b.rUpperArm,-.55,0,-.55,12,dt);
      rot(b.chest,.25,0,.1,12,dt);
    }

    if (['DRIVE','CUT','PULL','FLICK','SWEEP','LOFT','DEFENSIVE','EDGE','MISS'].includes(state)) {
      const q=swing*power;
      rot(b.lUpperArm,-.55-.22*q,0,.3+.45*q,18,dt);
      rot(b.rUpperArm,-.75-.30*q,0,-.3-.55*q,18,dt);
      rot(b.lForeArm,-.3-p.batAngle*.12,0,.15,18,dt);
      rot(b.rForeArm,-.25-p.batAngle*.18,0,-.18,18,dt);
      rot(b.spine,p.lean*.8,0,p.lean*.22,18,dt);
    }

    if (state==='DIVE') {
      rot(b.spine,-.55,0,-.15,16,dt); rot(b.lThigh,.7,0,.2,16,dt); rot(b.rThigh,.35,0,-.2,16,dt);
      rot(b.lUpperArm,-.8,0,.8,16,dt); rot(b.rUpperArm,-.8,0,-.8,16,dt);
    }

    if (state==='PICKUP' || state==='COLLECT' || state==='CROUCH') {
      rot(b.lThigh,.75,0,.08,14,dt); rot(b.rThigh,.75,0,-.08,14,dt);
      rot(b.spine,.4,0,0,14,dt);
      rot(b.lUpperArm,-.55,0,.15,14,dt); rot(b.rUpperArm,-.55,0,-.15,14,dt);
    }

    if (state==='THROW') {
      rot(b.lUpperArm,-.55,0,.2,18,dt); rot(b.rUpperArm,-1.35,0,-.75,18,dt);
      rot(b.rForeArm,-.65,0,-.2,18,dt);
    }

    if (state==='CATCH') {
      rot(b.lUpperArm,-.9,0,.5,16,dt); rot(b.rUpperArm,-.9,0,-.5,16,dt);
      rot(b.lForeArm,-.5,0,.25,16,dt); rot(b.rForeArm,-.5,0,-.25,16,dt);
    }

    if (state==='APPEAL' || state==='CELEBRATE') {
      const wave=state==='CELEBRATE'?Math.sin(time*6)*.25:0;
      rot(b.lUpperArm,-1.25+wave,0,.35,14,dt); rot(b.rUpperArm,-1.25-wave,0,-.35,14,dt);
      rot(b.lForeArm,-.35,0,.1,14,dt); rot(b.rForeArm,-.35,0,-.1,14,dt);
    }

    if (state==='SHIFT_LEFT' || state==='SHIFT_RIGHT') {
      const side=state==='SHIFT_LEFT'?-1:1;
      rot(b.lThigh,.15,0,side*.15,12,dt); rot(b.rThigh,.15,0,side*.15,12,dt);
      rot(b.spine,0,side*.12,0,12,dt);
    }

    if (state==='DISMISS') {
      rot(b.spine,-.18,0,-.12,12,dt); rot(b.head,0,-.35,0,12,dt);
    }

    void stride;
  }
}
