export type PlayerRole='BATTER'|'BOWLER'|'FIELDER'|'KEEPER'|'NON_STRIKER';
export type DeliveryKind='PACE'|'SWING'|'CUTTER'|'SLOWER'|'YORKER'|'BOUNCER';
export type BatterIntent='DEFENSIVE'|'NORMAL'|'LOFT'|'LEAVE';
export type TimingBand='VERY_EARLY'|'EARLY'|'GOOD'|'PERFECT'|'LATE'|'VERY_LATE';
export type Outcome='DOT'|'ONE'|'TWO'|'THREE'|'FOUR'|'SIX'|'WICKET'|'WIDE'|'NO_BALL'|'RUN_OUT';
export type BatterState='IDLE'|'READY'|'TRIGGER'|'READ'|'DEFENSIVE'|'DRIVE'|'CUT'|'PULL'|'FLICK'|'SWEEP'|'LOFT'|'LEAVE'|'MISS'|'EDGE'|'CONTACT'|'RUN'|'CELEBRATE'|'DISMISS';
export type BowlerState='IDLE'|'READY'|'RUNUP'|'GATHER'|'RELEASE_PACE'|'RELEASE_SWING'|'RELEASE_CUTTER'|'RELEASE_SLOWER'|'RELEASE_YORKER'|'RELEASE_BOUNCER'|'FOLLOW_THROUGH'|'REACT'|'CELEBRATE';
export type FielderState='IDLE'|'READY'|'REACT'|'SPRINT'|'DIVE'|'PICKUP'|'THROW'|'CATCH'|'MISS'|'CELEBRATE';
export type KeeperState='CROUCH'|'READY'|'SHIFT_LEFT'|'SHIFT_RIGHT'|'COLLECT'|'CATCH'|'APPEAL'|'CELEBRATE';
export type PresentationState=BatterState|BowlerState|FielderState|KeeperState;
export type PlayerArchetype='COMPACT_BATTER'|'AGGRESSIVE_BATTER'|'TECHNICAL_BATTER'|'FAST_BOWLER'|'SWING_BOWLER'|'SPIN_BOWLER'|'ATHLETIC_FIELDER'|'STANDARD_FIELDER'|'KEEPER';

export interface AnimationClipMap{[state:string]:string[];}
export interface PlayerAssetManifestEntry{id:string;url:string;role:PlayerRole;animationSet?:string;scale?:number;}

export interface FriendLikenessProfile{
  likenessId:string;
  displayName:string;
  jerseyNumber:number;
  role:PlayerRole;
  archetype?:PlayerArchetype;
  referencePhotoUrl?:string;
  glbUrl?:string;
  faceTextureUrl?:string;
  animationSet?:string;
  kitPrimary?:number;
  kitSecondary?:number;
  skinTone?:number;
  hairColor?:number;
  heightScale?:number;
}

export interface PlayerIdentity{
  /** Authoritative game/auction player ID. */
  id:string;
  /** Authoritative game/auction display name. */
  name:string;
  role:PlayerRole;
  archetype?:PlayerArchetype;
  jerseyNumber?:number; teamCode?:string; kitPrimary?:number; kitSecondary?:number;
  skinTone?:number; hairColor?:number; heightScale?:number;
  assetUrl?:string; faceTextureUrl?:string; animationSet?:string; clipMap?:AnimationClipMap;
  likenessId?:string;
  /** Presentation-only visual profile. Never replaces id/name/role. */
  visualProfileId?:string;
}

export interface AuthoritativeBallPresentation{
  ballId:string; deliveryKind:DeliveryKind; batterIntent:BatterIntent; outcome:Outcome;
  speedKph:number; timingBand:TimingBand; aimX?:number; aimZ?:number; trajectorySeed?:number;
  contactQuality?:number; contactHeight?:number; direction?:number; runCount?:number; wicketType?:string;
}
export interface TransformPose{x:number;y:number;z:number;yaw:number;lean:number;stride:number;armSwing:number;batAngle:number;headYaw:number;}
export interface FaceTextureOptions{headMeshNameHints?:string[];skinMaterialNameHints?:string[];roughness?:number;metalness?:number;}
export interface FaceLikenessAsset extends FriendLikenessProfile{photoOnly?:boolean;}
