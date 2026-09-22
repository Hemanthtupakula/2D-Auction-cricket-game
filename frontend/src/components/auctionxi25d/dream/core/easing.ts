export const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export const smooth=(t:number)=>t*t*(3-2*t);
export const smoother=(t:number)=>t*t*t*(t*(t*6-15)+10);
export const easeOut=(t:number)=>1-Math.pow(1-t,3);
export const easeInOut=(t:number)=>t<.5?4*t*t:1-Math.pow(-2*t+2,2)/2;
