import {clamp} from './easing';
export interface TimelineCue { name:string; start:number; end:number; run:(t:number)=>void; }
export class PresentationTimeline {
  private cues:TimelineCue[]=[]; private duration=0; private started=0; private active=false;
  reset(){this.cues=[];this.duration=0;this.active=false;}
  add(name:string,start:number,end:number,run:(t:number)=>void){this.cues.push({name,start,end,run});this.duration=Math.max(this.duration,end);return this;}
  start(now=performance.now()){this.started=now;this.active=true;}
  tick(now=performance.now()){
    if(!this.active)return;
    const elapsed=(now-this.started)/1000;
    for(const c of this.cues) if(elapsed>=c.start&&elapsed<=c.end)c.run(clamp((elapsed-c.start)/(c.end-c.start)));
    if(elapsed>this.duration)this.active=false;
  }
  get running(){return this.active;}
}
