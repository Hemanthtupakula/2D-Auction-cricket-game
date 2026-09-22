import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {DreamMatchPresentation} from './presentation/director';
import {AuthoritativeBallEvent} from './core/types';

export function DreamStageAdapter({event}:{event?:AuthoritativeBallEvent}){
 const host=useRef<HTMLDivElement>(null);const presentation=useRef<DreamMatchPresentation>();
 useEffect(()=>{if(!host.current)return;const el=host.current;const scene=new THREE.Scene();scene.background=new THREE.Color(0x07110d);const camera=new THREE.PerspectiveCamera(48,el.clientWidth/Math.max(1,el.clientHeight),.1,100);camera.position.set(0,4.2,10.5);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio));renderer.setSize(el.clientWidth,el.clientHeight);renderer.shadowMap.enabled=true;el.appendChild(renderer.domElement);
  const p=new DreamMatchPresentation();presentation.current=p;scene.add(p.root);scene.add(new THREE.HemisphereLight(0x9bc8ff,0x142018,1.3));
  let raf=0,last=performance.now();const loop=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;p.update(dt,camera);renderer.render(scene,camera);raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);
  const resize=()=>{camera.aspect=el.clientWidth/Math.max(1,el.clientHeight);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight)};window.addEventListener('resize',resize);return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);renderer.dispose();el.removeChild(renderer.domElement)};
 },[]);
 useEffect(()=>{if(event)presentation.current?.playBall(event)},[event]);
 return <div ref={host} style={{position:'relative',width:'100%',height:'100%',overflow:'hidden'}}/>;
}
