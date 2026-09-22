import * as THREE from 'three';
export const damp=(current:number,target:number,lambda:number,dt:number)=>current+(target-current)*(1-Math.exp(-lambda*Math.max(0,dt)));
export const dampAngle=(current:number,target:number,lambda:number,dt:number)=>{const delta=THREE.MathUtils.euclideanModulo(target-current+Math.PI,Math.PI*2)-Math.PI;return current+delta*(1-Math.exp(-lambda*Math.max(0,dt)));};
export const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export const easeInOut=(t:number)=>{t=clamp01(t);return t*t*(3-2*t);};
export const seeded=(seed:number)=>{let x=(seed|0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000;};};
