import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type View = 'Perspective' | 'Face-on' | 'Edge-on';
export interface GalaxyHandle { zoom: (factor: number) => void; reset: () => void; capture: () => void }
interface Props { playing: boolean; brightness: number; stars: boolean; dust: boolean; view: View; handle: React.RefObject<GalaxyHandle | null>; onReady: () => void; onError: () => void }

export default function Galaxy(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    const handle = props.handle;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); }
    catch { latest.current.onError(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x07090d, 1);
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 1500);
    const mobile = container.clientWidth < 800;
    const cameraScale = mobile ? 1.6 : 1;
    camera.position.set(0, 65 * cameraScale, 110 * cameraScale);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.045;
    controls.enablePan = false; controls.minDistance = 18; controls.maxDistance = 300;
    controls.autoRotateSpeed = 0.12;
    const galaxy = new THREE.Group(); scene.add(galaxy); galaxy.rotation.y = -0.35; galaxy.rotation.z = -0.20;
    if (mobile) galaxy.scale.setScalar(.72);
    let seed = 817;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const normal = () => Math.sqrt(-2 * Math.log(Math.max(random(), 0.00001))) * Math.cos(2 * Math.PI * random());
    const materials: THREE.ShaderMaterial[] = [];
    function particles(count: number, type: 'disk' | 'core' | 'haze' | 'field') {
      const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        let x: number, y: number, z: number;
        const c = new THREE.Color();
        if (type === 'field') {
          const a = random() * Math.PI * 2, u = random() * 2 - 1, r = 330 + random() * 150;
          x = r * Math.sqrt(1-u*u) * Math.cos(a); z = r * Math.sqrt(1-u*u) * Math.sin(a); y = r*u;
          c.setRGB(0.35 + random()*.4, .40 + random()*.35, .55 + random()*.4); sizes[i] = .35 + random() * 1.1;
        } else if (type === 'core') {
          const r = Math.pow(random(), 1.7) * 10, a = random()*Math.PI*2, u = random()*2-1;
          x = r * Math.sqrt(1-u*u)*Math.cos(a); z = r*Math.sqrt(1-u*u)*Math.sin(a); y = r*u*.55;
          c.setRGB(1, .69 + random() * .22, .38 + random()*.32); sizes[i] = .09 + random()*.17;
        } else {
          const r = Math.pow(random(), .63)*47;
          const arm = Math.floor(random()*2) * Math.PI;
          const angle = random() < .32 ? random() * Math.PI * 2 : arm + Math.log(1+r*.42)*2.85 + normal()*(.16 + .23*(1-r/47));
          const spread = type === 'haze' ? 2.3 : 1.25;
          x = Math.cos(angle)*r + normal()*spread; z = Math.sin(angle)*r + normal()*spread;
          y = normal() * (.18 + .6*Math.exp(-r/12));
          const blue = random() > .80 && r > 16;
          if (blue) c.setRGB(.48 + random()*.3, .66 + random()*.25, 1);
          else c.setRGB(.80+random()*.2, .49+random()*.23, .27+random()*.26);
          sizes[i] = type === 'haze' ? 1.5 + random()*2.2 : .075+Math.pow(random(),4)*.42;
          if (type === 'haze') c.multiplyScalar(.16);
        }
        positions.set([x,y,z], i*3); colors.set([c.r,c.g,c.b], i*3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors,3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes,1));
      const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { brightness: { value: 1 }, pixelRatio: { value: renderer.getPixelRatio() } },
        vertexShader: `attribute vec3 color; attribute float size; varying vec3 vColor; uniform float pixelRatio; void main(){ vColor=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(size*pixelRatio*340.0/(-mv.z),1.0,90.0); }`,
        fragmentShader: `varying vec3 vColor; uniform float brightness; void main(){ float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0)discard; float a=exp(-d*d*5.0)*smoothstep(1.0,0.65,d); gl_FragColor=vec4(vColor*brightness,a); }`,
      });
      materials.push(material);
      return new THREE.Points(geometry,material);
    }
    const disk = particles(85000,'disk'), core = particles(23000,'core'), haze = particles(15000,'haze'), field = particles(2300,'field');
    galaxy.add(disk,core,haze); scene.add(field);
    // A soft ellipsoidal central bulge, physically attached to the galaxy plane.
    const glowMaterial = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide,
      uniforms:{ brightness:{value:1} }, vertexShader:`varying vec2 uvp; void main(){uvp=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec2 uvp; uniform float brightness; void main(){float d=length((uvp-.5)*2.); float a=exp(-d*d*9.)*.28; gl_FragColor=vec4(vec3(1.,.68,.38)*brightness,a);}` });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(28,28),glowMaterial); glow.rotation.x=-Math.PI/2; galaxy.add(glow); materials.push(glowMaterial);
    const resize = () => { const w=container.clientWidth,h=container.clientHeight; renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const targetPosition = new THREE.Vector3(0,65 * cameraScale,110 * cameraScale);
    let previousView: View = 'Perspective', tween = 0, animation = 0;
    const reset = () => { previousView=latest.current.view; targetPosition.set(0,65 * cameraScale,110 * cameraScale); tween=1; controls.target.set(0,0,0); };
    handle.current = {
      zoom: (factor) => { camera.position.multiplyScalar(factor); camera.position.clampLength(18,300); }, reset,
      capture: () => { renderer.render(scene,camera); const link=document.createElement('a'); link.download='andromeda-observation.png'; link.href=renderer.domElement.toDataURL('image/png'); link.click(); }
    };
    let lastTime = performance.now();
    const animate = (time: number) => {
      const p=latest.current;
      if(p.view!==previousView) { previousView=p.view; if(p.view==='Face-on')targetPosition.set(0,125,.01); else if(p.view==='Edge-on')targetPosition.set(0,4,130); else targetPosition.set(0,65,110); targetPosition.multiplyScalar(cameraScale); tween=1; }
      if(tween) { camera.position.lerp(targetPosition,.055); if(camera.position.distanceTo(targetPosition)<.1)tween=0; }
      controls.autoRotate=p.playing && !tween;
      controls.update(Math.min((time-lastTime)/1000,.05)); lastTime=time;
      disk.visible=p.stars; core.visible=p.stars; haze.visible=p.dust; field.visible=p.stars;
      materials.forEach(m=>m.uniforms.brightness.value=p.brightness);
      renderer.render(scene,camera); animation=requestAnimationFrame(animate);
    };
    animation=requestAnimationFrame(animate); latest.current.onReady();
    return () => { cancelAnimationFrame(animation); observer.disconnect(); controls.dispose(); scene.traverse(o=>{if(o instanceof THREE.Points || o instanceof THREE.Mesh){o.geometry.dispose();}}); materials.forEach(m=>m.dispose()); renderer.dispose(); container.removeChild(renderer.domElement); handle.current=null; };
  }, [props.handle]);
  return <div className="galaxy-canvas" ref={host} aria-label="Interactive 3D artistic model of the Andromeda galaxy. Drag to orbit, scroll or pinch to zoom." />;
}