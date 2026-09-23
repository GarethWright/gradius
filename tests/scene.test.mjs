import fs from 'node:fs';
import assert from 'node:assert/strict';
let code=fs.readFileSync('src/scene.js','utf8');
code=code.replace("import * as THREE from 'three';",`import * as THREE from '${new URL('../node_modules/three/build/three.module.js',import.meta.url).href}';`);
code=code.replace(/^import \{.*from 'three\/addons.*;$/gm,'');
code=code.replace('new THREE.WebGLRenderer(', 'new MockRenderer(');
const prelude=`
export let capturedScene,capturedCamera;
class MockRenderer { constructor(){this.domElement={};} setPixelRatio(){} setSize(){} dispose(){} }
class EffectComposer {constructor(){this.passes=[]} addPass(p){this.passes.push(p)} setSize(){} render(){capturedScene.updateMatrixWorld(true)} dispose(){}}
class RenderPass {constructor(scene,camera){capturedScene=scene;capturedCamera=camera}}
class UnrealBloomPass {}
class OutputPass {}
`;
globalThis.matchMedia=()=>({matches:false});globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class {observe(){} disconnect(){}};globalThis.window={addEventListener(){}};
const inspection=await import('data:text/javascript;base64,'+Buffer.from(prelude+code).toString('base64'));
const render=inspection.createSpaceRenderer({getBoundingClientRect:()=>({width:960,height:540})});
const g={state:'play',player:{x:130,y:270,inv:0,shield:3,options:4},history:Array.from({length:70},()=>({x:130,y:270})),stage:0,world:100,shake:0,colors:['#ef7348','#6bdcee','#ba9ae8','#829bba','#92da82','#f1b85b','#ff657f'],terrain:()=>40,enemies:['turret','wave','hunter','spinner'].map((type,i)=>({type,red:i%2===0,x:500+i*80,y:200,t:1,top:false})),caps:[{x:300,y:270,t:1}],bullets:[{x:200,y:270,laser:true,vx:860,vy:0},{x:200,y:300,missile:true,vx:230,vy:180}],shots:[{x:400,y:270,r:5}],particles:[{x:600,y:200,life:.4,color:'#ff8844'}],boss:{x:760,y:270,t:1}};
for(const state of ['title','play','paused','over','win'])for(let stage=0;stage<7;stage++){g.state=state;g.stage=stage;render.render(g,1/60);}
let objects=0;inspection.capturedScene.traverse(o=>{objects++;assert(o.matrixWorld.elements.every(Number.isFinite),o.type+' invalid transform');if(o.geometry?.attributes.position)assert([...o.geometry.attributes.position.array].every(Number.isFinite),'invalid geometry')});
assert(objects>100);assert.equal(inspection.capturedCamera.projectionMatrix.elements[0],1.875);
render.dispose();console.log('PASS: Three.js scene construction, all entity types, all seven palettes and five game states, finite geometry/transforms, camera plane alignment, disposal. GPU shader execution not tested.');
