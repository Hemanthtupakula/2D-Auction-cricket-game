import * as THREE from 'three';
export type DeliveryKind='PACE'|'SWING'|'CUTTER'|'SLOWER'|'YORKER'|'BOUNCER';
export type BatterIntent='DEFENSIVE'|'NORMAL'|'LOFT'|'LEAVE';
export type TimingBand='VERY_EARLY'|'EARLY'|'GOOD'|'PERFECT'|'LATE'|'VERY_LATE';
export type Outcome='DOT'|'ONE'|'TWO'|'THREE'|'FOUR'|'SIX'|'WICKET'|'WIDE'|'NO_BALL'|'RUN_OUT'|'BYE'|'LEG_BYE';
export type Role='BATTER'|'BOWLER'|'FIELDER'|'KEEPER';
export type PresentationState=string;

export interface AuthoritativeBallEvent {
  ballId:string; over:number; ball:number;
  deliveryKind:DeliveryKind; speed:number;
  batterIntent:BatterIntent; timingBand:TimingBand;
  outcome:Outcome;
  target?:THREE.Vector3|{x:number;z:number};
  trajectory?:{
    bounceX:number; bounceZ:number; endX:number; endZ:number; arc:number; spin?:number;
    contactX?:number; contactZ?:number; contactY?:number;
    bounceTime?:number; contactTime?:number; totalDuration?:number;
  };
  strikerId?:string; nonStrikerId?:string; bowlerId?:string;
  line?:string; length?:string; shot?:string; wicketType?:string;
  fielders?:Array<{id:string;x:number;z:number;role?:Role}>;
  timestamp?:number;
}

export interface ActorHandle { id:string; role:Role; root:THREE.Group; }
export interface PresentationContext { event:AuthoritativeBallEvent; elapsed:number; }
