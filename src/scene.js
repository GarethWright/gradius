import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Combat stays on a precisely mapped plane; the world extends into real 3D.
export function createSpaceRenderer(canvas) {
  const mobile=matchMedia('(pointer:coarse)').matches;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.75));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#020611');
  const camera=new THREE.PerspectiveCamera(2*Math.atan(270/900)*180/Math.PI,16/9,1,4000);
  camera.position.set(480,270,900);camera.lookAt(480,270,0);
  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(960,540),.8,.55,1.0);
  composer.addPass(bloom);composer.addPass(new OutputPass());
  scene.add(new THREE.HemisphereLight(0xc5e9ff,0x15233c,2.2));
  const key=new THREE.DirectionalLight(0xc1dfff,3.5);key.position.set(-100,500,500);scene.add(key);
  const rim=new THREE.DirectionalLight(0xff7750,2.3);rim.position.set(800,-100,-200);scene.add(rim);
  const mat=(color,metalness=.7,roughness=.35)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const glow=(color,intensity=3)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.25});
  const silver=mat('#b9cedb'),dark=mat('#14273b'),trim=mat('#fa775b'),cyan=glow('#53dfff'),orange=glow('#ff8040'),red=glow('#ff435d');
  const white=glow('#c6fbff',4),glass=mat('#093a5c',.8,.13);
  const sphere=new THREE.SphereGeometry(1,16,10),box=new THREE.BoxGeometry(1,1,1);
  function mesh(g,m,parent,pos=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;}
  function hull(parent,m,length,r,x=0,y=0,z=0){const o=mesh(new THREE.CylinderGeometry(0,r,length,8),m,parent,[x,y,z]);o.rotation.z=-Math.PI/2;return o;}
  function wing(parent,points,material,depth=3,z=-2){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:1,bevelThickness:1}),material,parent,[0,0,z]);}
  function fighter(){const g=new THREE.Group();hull(g,silver,44,7,0);mesh(sphere,glass,g,[2,0,6],[10,4,4]);
    wing(g,[[-16,3],[-24,21],[3,12],[11,3]],silver);wing(g,[[-16,-3],[-24,-21],[3,-12],[11,-3]],silver);
    for(const y of [-12,12]){mesh(box,dark,g,[-15,y,1],[14,5,6]);mesh(box,trim,g,[-9,y,5],[7,4,2]);mesh(sphere,cyan,g,[-23,y,1],[3,2,2]);}
    const exhaust=new THREE.Group();g.add(exhaust);for(const y of [-12,0,12]){const flame=hull(exhaust,cyan,29,3,-34,y,0);flame.rotation.z=Math.PI/2;}g.userData.exhaust=exhaust;
    return g;
  }
  const ship=fighter();scene.add(ship);
  const shield=mesh(new THREE.SphereGeometry(29,24,16),new THREE.MeshBasicMaterial({color:0x6fe9ff,wireframe:true,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false}),scene);
  const options=Array.from({length:4},()=>{const g=new THREE.Group();mesh(new THREE.IcosahedronGeometry(7,1),orange,g);const ring=mesh(new THREE.TorusGeometry(10,1,6,20),silver,g);g.userData.ring=ring;scene.add(g);return g});
  const engines=new THREE.PointLight(0x48d9ff,1000,120,2);scene.add(engines);
  const enemyPools=new Map();
  function enemyModel(type,isRed){const g=new THREE.Group(),m=isRed?trim:silver,energy=isRed?orange:red;
    if(type==='turret'){mesh(new THREE.CylinderGeometry(16,21,13,8),dark,g).rotation.x=Math.PI/2;mesh(sphere,m,g,[0,0,4],[16,12,10]);mesh(box,dark,g,[-12,2,9],[22,6,6]);mesh(box,energy,g,[-24,2,9],[3,5,5]);}
    else if(type==='spinner'){mesh(new THREE.OctahedronGeometry(17),m,g);for(let i=0;i<4;i++){const a=i*Math.PI/2;const p=mesh(box,dark,g,[Math.cos(a)*20,Math.sin(a)*20,0],[18,7,9]);p.rotation.z=a;mesh(sphere,energy,g,[Math.cos(a)*26,Math.sin(a)*26,4],[3,3,3]);}}
    else {hull(g,m,type==='hunter'?38:29,10);g.rotation.z=Math.PI;wing(g,[[-12,0],[-20,19],[12,9]],dark);wing(g,[[-12,0],[-20,-19],[12,-9]],dark);mesh(sphere,energy,g,[9,0,6],[5,4,4]);}
    scene.add(g);return g;
  }
  function poolEntities(list,pools,keyFn,factory,update){const used=new Map();for(const item of list){const k=keyFn(item),index=used.get(k)||0;let pool=pools.get(k);if(!pool)pools.set(k,pool=[]);if(!pool[index])pool[index]=factory(item);const o=pool[index];o.visible=true;update(o,item);used.set(k,index+1);}for(const [k,pool] of pools)for(let i=used.get(k)||0;i<pool.length;i++)pool[i].visible=false;}
  const capPools=new Map();
  function capsule(){const g=new THREE.Group();mesh(new THREE.OctahedronGeometry(9),orange,g);mesh(new THREE.TorusGeometry(14,1.4,6,24),silver,g);scene.add(g);return g;}
  function instanced(material,max=512){const m=new THREE.InstancedMesh(box,material,max);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}
  const beamMesh=instanced(white),missileMesh=instanced(orange),hostileMesh=instanced(red),sparkMesh=instanced(white,1200),trailMesh=instanced(cyan,60);
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  function instances(target,list,fn){target.count=Math.min(list.length,target.instanceMatrix.count);for(let i=0;i<target.count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);fn(dummy,list[i],i);dummy.updateMatrix();target.setMatrixAt(i,dummy.matrix);}target.instanceMatrix.needsUpdate=true;}
  const bossRoot=new THREE.Group();scene.add(bossRoot);
  const bossArmor=mat('#34485e'),bossAccent=glow('#ff7350',1.8);
  const core=mesh(new THREE.IcosahedronGeometry(22,2),cyan,bossRoot,[-27,0,8]);
  const coreRing=mesh(new THREE.TorusGeometry(33,4,8,48),silver,bossRoot,[-27,0,4]);
  const rotor=new THREE.Group();bossRoot.add(rotor);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const part=mesh(box,bossArmor,rotor,[Math.cos(a)*62,Math.sin(a)*62,-8],[29,23,32]);part.rotation.z=a;const line=mesh(box,bossAccent,rotor,[Math.cos(a)*63,Math.sin(a)*63,10],[21,3,3]);line.rotation.z=a;}
  for(const y of [-55,55]){mesh(box,dark,bossRoot,[16,y,-2],[124,24,35]);mesh(box,bossAccent,bossRoot,[-47,y,16],[18,6,5]);hull(bossRoot,silver,30,12,72,y,-2);}
  const backRing=mesh(new THREE.TorusGeometry(88,3,6,64),bossArmor,bossRoot,[0,0,-35]);
  // Distant planet, tilted ring system, and layered moving stars.
  const planet=mesh(new THREE.SphereGeometry(205,48,32),mat('#123657',.25,.85),scene,[950,480,-950]);
  const atmosphere=mesh(new THREE.SphereGeometry(211,32,24),new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false,uniforms:{tint:{value:new THREE.Color('#308ed3')}},vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n; varying vec3 v; uniform vec3 tint; void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(tint*f*1.7,f*.7);}'}),scene,[950,480,-950]);
  const planetRing=mesh(new THREE.RingGeometry(250,320,96),new THREE.MeshStandardMaterial({color:0x637c91,side:THREE.DoubleSide,transparent:true,opacity:.3,roughness:.9}),scene,[950,480,-950]);planetRing.rotation.set(.85,.2,.25);
  const starLayers=[];
  for(let layer=0;layer<3;layer++){const positions=new Float32Array(240*3);for(let i=0;i<240;i++){positions[i*3]=Math.random()*3000-900;positions[i*3+1]=Math.random()*1800-600;positions[i*3+2]=-300-layer*500-Math.random()*300;}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const p=new THREE.Points(geometry,new THREE.PointsMaterial({color:layer===0?0xb4e8ff:0x6985b2,size:layer===0?2.8:2,sizeAttenuation:true,transparent:true,opacity:.85}));scene.add(p);starLayers.push(p);}
  // Layered nebula shader: no external images or runtime asset requests.
  const nebula=mesh(new THREE.PlaneGeometry(4300,2600),new THREE.ShaderMaterial({depthWrite:false,uniforms:{clock:{value:0},tint:{value:new THREE.Color('#123154')}},vertexShader:'varying vec2 uvv;void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 uvv; uniform float clock; uniform vec3 tint;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec2 p=uvv*5.+vec2(clock*.004,0.);float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*noise(p);p=p*2.03+1.;a*=.5;}float band=exp(-pow((uvv.y-.5+sin(uvv.x*5.)*.13)*3.,2.));gl_FragColor=vec4(tint*f*band*.8+vec3(.002,.004,.011),1.);}`}),scene,[480,270,-2100]);
  // Opaque faceted cliff faces, rather than thin luminous ribbons.
  const terrainMaterial=new THREE.MeshStandardMaterial({color:'#817369',metalness:0,roughness:1,flatShading:true,side:THREE.DoubleSide});
  const rockScroll={value:0};
  terrainMaterial.onBeforeCompile=shader=>{
    shader.uniforms.rockScroll=rockScroll;
    shader.vertexShader='varying vec3 vStone;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStone=position;');
    shader.fragmentShader=`varying vec3 vStone;
      uniform float rockScroll;
      float stoneHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float stoneNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(stoneHash(i),stoneHash(i+vec2(1.,0.)),f.x),mix(stoneHash(i+vec2(0.,1.)),stoneHash(i+1.),f.x),f.y);}
      float stoneCracks(vec2 p){vec2 cell=floor(p),f=fract(p);float first=9.,second=9.;
        for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 offset=vec2(float(x),float(y));vec2 seed=vec2(stoneHash(cell+offset),stoneHash(cell+offset+19.3));vec2 delta=offset+seed-f;float d=dot(delta,delta);if(d<first){second=first;first=d;}else{second=min(second,d);}}}
        return smoothstep(.008,.095,second-first);
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 stoneUV=vec2(vStone.x+rockScroll,vStone.y)*.033;
      float grain=stoneNoise(stoneUV*7.);
      float strata=stoneNoise(vec2(stoneUV.x*.45,stoneUV.y*3.5));
      float fracture=stoneCracks(stoneUV+vec2(stoneNoise(stoneUV*.8))*.7);
      float stoneShade=(.46+.32*strata+.22*grain)*mix(.22,1.,fracture);
      diffuseColor.rgb*=stoneShade;
    `);
  };
  terrainMaterial.customProgramCacheKey=()=> 'opaque-fractured-rock-v1';
  const ribbons=[];
  for(const top of [true,false]){
    const count=81,rows=10,indices=[];
    for(let i=0;i<count-1;i++)for(let j=0;j<rows-1;j++){
      const k=i*rows+j,n=k+rows;
      // Alternating diagonals keep the rock facets from forming long stripes.
      if((i+j)%2)indices.push(k,n,k+1,k+1,n,n+1);
      else indices.push(k,n,n+1,k,n+1,k+1);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*rows*3),3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(indices);
    const rock=mesh(geo,terrainMaterial,scene);rock.frustumCulled=false;
    rock.name=top?'ceiling-rock':'floor-rock';
    ribbons.push({top,geo,count,rows});
  }
  const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),terrainMaterial,60);rocks.frustumCulled=false;scene.add(rocks);
  const rockSeeds=Array.from({length:60},()=>({x:Math.random()*1700,y:Math.random(),z:-100-Math.random()*450,s:16+Math.random()*40,r:Math.random()*6}));
  let clock=0,previousStage=-1,lastY=270,disposed=false;
  function resize(){const rect=canvas.getBoundingClientRect();const width=Math.max(1,rect.width),height=Math.max(1,rect.height);renderer.setSize(width,height,false);composer.setSize(width,height);
    // Keep the gameplay plane aligned with pointer coordinates on every aspect ratio.
    camera.aspect=width/height;camera.updateProjectionMatrix();camera.projectionMatrix.elements[0]=2*900/960;camera.projectionMatrix.elements[5]=2*900/540;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function render(g,dt){if(disposed)return;if(g.state!=='paused')clock+=dt;
    if(g.stage!==previousStage){previousStage=g.stage;bossAccent.color.set(g.colors[g.stage]);bossAccent.emissive.set(g.colors[g.stage]);rim.color.set(g.colors[g.stage]);nebula.material.uniforms.tint.value.set(g.colors[g.stage]).multiplyScalar(.32);planet.material.color.set(g.colors[g.stage]).multiplyScalar(.3);}
    nebula.material.uniforms.clock.value=clock;planet.rotation.y=clock*.025;atmosphere.rotation.y=planet.rotation.y;
    if(g.state!=='paused')for(let layer=0;layer<starLayers.length;layer++){const a=starLayers[layer].geometry.attributes.position;for(let i=0;i<a.count;i++){a.array[i*3]-=dt*(g.state==='play'?55:13)/(layer+1);if(a.array[i*3]<-1000)a.array[i*3]=2000;}a.needsUpdate=true;}
    const title=g.state==='title',px=title?260:g.player.x,py=title?285+Math.sin(clock*.6)*15:g.player.y;
    ship.visible=g.state!=='over'&&(title||g.player.inv<=0||Math.floor(g.player.inv*12)%2===0);ship.position.set(px,540-py,0);ship.scale.setScalar(title?2.7:1);ship.rotation.x=THREE.MathUtils.lerp(ship.rotation.x,title?.25+Math.sin(clock*.6)*.12:THREE.MathUtils.clamp((py-lastY)*.06,-.5,.5),.12);ship.rotation.y=title?-.12:0;lastY=py;ship.userData.exhaust.scale.x=.8+Math.sin(clock*40)*.2;
    engines.position.set(px-28,540-py,28);shield.visible=!title&&g.player.shield>0&&ship.visible;shield.position.set(px,540-py,0);shield.rotation.y=clock*.7;shield.material.opacity=.09+g.player.shield*.04;
    const trail=title?[]:g.history.slice(0,45);instances(trailMesh,trail,(d,p,i)=>{d.position.set(p.x-26,540-p.y,-3);d.scale.set(3*(1-i/45),1.4*(1-i/45),1)});
    for(let i=0;i<4;i++){const o=options[i];o.visible=!title&&i<g.player.options;const p=g.history[Math.min(g.history.length-1,(i+1)*14)]||g.player;o.position.set(p.x-(i+1)*18,540-p.y,0);o.rotation.x=clock*2+i;o.userData.ring.rotation.y=clock*2;}
    poolEntities(g.enemies,enemyPools,e=>e.type+e.red,e=>enemyModel(e.type,e.red),(o,e)=>{o.position.set(e.x,540-e.y,0);if(e.type==='spinner')o.rotation.z=e.t*2;if(e.type==='turret')o.rotation.z=e.top?Math.PI:0;else o.rotation.x=Math.sin(e.t*3)*.2;});
    poolEntities(g.caps,capPools,()=>0,capsule,(o,p)=>{o.position.set(p.x,540-p.y-Math.sin(p.t*5)*4,0);o.rotation.y=p.t*2;o.rotation.z=p.t;});
    instances(beamMesh,g.bullets.filter(b=>!b.missile),(d,b)=>{d.position.set(b.x-(b.laser?12:0),540-b.y,0);d.rotation.z=Math.atan2(-b.vy,b.vx);d.scale.set(b.laser?65:15,b.laser?3:2.5,2)});
    instances(missileMesh,g.bullets.filter(b=>b.missile),(d,b)=>{d.position.set(b.x,540-b.y,0);d.rotation.z=Math.atan2(-b.vy,b.vx);d.scale.set(12,4,4)});
    instances(hostileMesh,g.shots,(d,s)=>{d.position.set(s.x,540-s.y,0);d.scale.setScalar(s.r*1.5);d.rotation.z=clock*3});
    instances(sparkMesh,g.particles,(d,p,i)=>{d.position.set(p.x,540-p.y,Math.sin(i*13)*Math.max(0,.7-p.life)*65);d.scale.setScalar(Math.max(.1,p.life*5));color.set(p.color);sparkMesh.setColorAt(i,color)});if(sparkMesh.instanceColor)sparkMesh.instanceColor.needsUpdate=true;
    bossRoot.visible=!!g.boss;if(g.boss){bossRoot.position.set(g.boss.x,540-g.boss.y,0);rotor.rotation.z=g.boss.t*.18;core.rotation.y=g.boss.t*2;coreRing.rotation.y=Math.sin(g.boss.t)*.3;backRing.rotation.x=g.boss.t*.1;}
    const scroll=title?clock*22:g.world;
    rockScroll.value=g.world;
    for(const r of ribbons){
      const a=r.geo.attributes.position,sign=r.top?1:-1;
      for(let i=0;i<r.count;i++){
        const x=i*12,edge=r.top?540-g.terrain(x,true):g.terrain(x);
        for(let j=0;j<r.rows;j++){
          const w=x+g.world;
          const jag=Math.sin(w*.079+j*2.7)*Math.sin(w*.037-j*1.4);
          // The first row stays exactly on the collision boundary at z=0.
          const outward=j===0?0:j*32+jag*9;
          const depth=j===0?0:-8-(.5+.5*Math.sin(w*.064+j*2.2))*24;
          a.setXYZ(i*r.rows+j,x,edge+sign*outward,depth);
        }
      }
      a.needsUpdate=true;r.geo.computeVertexNormals();
    }
    for(let i=0;i<rockSeeds.length;i++){
      const r=rockSeeds[i],x=((r.x-scroll)%1700+1700)%1700-350,top=i%2===1;
      const edge=top?540-g.terrain(x,true):g.terrain(x);
      // Embedded boulders remain outside the playable corridor.
      dummy.position.set(x,edge+(top?1:-1)*(r.s*1.65+24+r.y*60),-18-r.s*.4);
      dummy.rotation.set(r.r,r.r*.7,r.r);dummy.scale.set(r.s*1.6,r.s,r.s*.65);
      dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate=true;
    // Small camera recoil adds impact without moving the collision plane significantly.
    camera.position.x=480+(Math.random()-.5)*g.shake*.25;camera.position.y=270+(Math.random()-.5)*g.shake*.25;
    bloom.strength=g.boss?.85:.65;composer.render(dt);
  }
  function dispose(){disposed=true;observer.disconnect();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());composer.passes.forEach(p=>p.dispose?.());composer.dispose();renderer.dispose();}
  window.addEventListener('pagehide',e=>{if(!e.persisted)dispose()});
  return {render,dispose};
}
