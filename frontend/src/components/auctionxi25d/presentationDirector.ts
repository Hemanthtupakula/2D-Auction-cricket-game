import * as THREE from "three";
import { createCricketFlight, outcomeLift } from "./ballFlight";
import { BroadcastCameraDirector } from "./cameraDirector";
import type { PresentationBall, PresentationCamera } from "./types";

export class PresentationDirector {
  private readonly ball:THREE.Mesh;
  private readonly camera:BroadcastCameraDirector;
  private flight:ReturnType<typeof createCricketFlight>=[];
  private elapsed=0; private duration=0; private active=false; private completion?:()=>void;

  constructor(ball:THREE.Mesh,camera:BroadcastCameraDirector){this.ball=ball;this.camera=camera;}

  play(ball:PresentationBall,cameraState:PresentationCamera,completion?:()=>void){
    const outcome=String(ball.outcome||"DOT"), runs=Number(ball.runs||0);
    const start=new THREE.Vector3(0,1.05,-9.05);
    const end=new THREE.Vector3(
      outcome==="SIX"?8.5:outcome==="FOUR"?6.5:(Number(ball.aimX)||0)*2.5,
      outcome==="SIX"?4.6:outcome==="FOUR"?2.4:.9,
      outcome==="SIX"?0:outcome==="FOUR"?1:6.8
    );
    this.flight=createCricketFlight(start,end,outcomeLift(outcome,runs),outcome==="SIX"?1350:920);
    this.elapsed=0; this.duration=outcome==="SIX"?1350:920; this.active=true;
    this.completion=completion; this.camera.setState(cameraState);
  }

  update(deltaMs:number){
    if(!this.active||!this.flight.length)return;
    this.elapsed+=deltaMs; const t=Math.min(1,this.elapsed/this.duration);
    const i=Math.min(this.flight.length-1,Math.floor(t*(this.flight.length-1)));
    this.ball.position.copy(this.flight[i].position);
    if(t>=1){this.active=false;this.completion?.();}
  }
  get isActive(){return this.active;}
}
