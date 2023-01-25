import {CMap0} from './CMapJS/CMap/CMap.js';
import {CMap1} from './CMapJS/CMap/CMap.js';
import {CMap2} from './CMapJS/CMap/CMap.js';
import {CMap3} from './CMapJS/CMap/CMap.js';
import IncidenceGraph from './CMapJS/CMap/IncidenceGraph.js';
import Renderer from './CMapJS/Rendering/Renderer.js';
import * as THREE from './CMapJS/Libs/three.module.js';
import { OrbitControls } from './CMapJS/Libs/OrbitsControls.js';
import { loadCMap2 } from './CMapJS/IO/SurfaceFormats/CMap2IO.js';
import { loadSurfaceView } from './CMapJS/Rendering/displayOnly.js';
import { controllers, GUI } from './CMapJS/Libs/dat.gui.module.js';
import { TransformControls } from './CMapJS/Libs/TransformControls.js'
import MeshHandler from './MeshHandler.js';
import Gizmo from './Gizmo.js';
import {loadWrl} from './CMapJS/IO/SurfaceFormats/Wrl.js';
import {exportOff} from './CMapJS/IO/SurfaceFormats/Off.js';


import {loadIncidenceGraph, exportIncidenceGraph} from './CMapJS/IO/IncidenceGraphFormats/IncidenceGraphIO.js';
import {importGraph, exportGraph} from './CMapJS/IO/GraphFormats/GraphIO.js';
import {test0_ig} from './ig_files.js';

console.log(`space: selection mode (shift down for multi seleciton)
e: extrusion mode, vertex or edge
l: connect vertices
f: create face from closed selection
c: cut edge on click
x: cut face between 2 selected vertices
m: move selection
o: orbit camera
p: pan camera
escp: deselect
del: delete selection
s: print mesh string
`)

let ig = loadIncidenceGraph("ig", test0_ig);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 1000.0);
camera.position.set(0, 0, 2);
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

window.addEventListener('resize', function() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});



let ambientLight = new THREE.AmbientLight(0xAAAAFF, 0.5);
scene.add(ambientLight);
let pointLight0 = new THREE.PointLight(0x3137DD, 5);
pointLight0.position.set(10,8,5);
scene.add(pointLight0);



let map_handler = new MeshHandler(ig);
map_handler.initialize({vertices: true, edges: true, faces: true});
map_handler.addMeshesTo(scene);
let surfaceView = null;
let gizmo = new Gizmo();
	gizmo.initialize();
	gizmo.addTo(scene);

const event_handler = new (function(scope, map_handler){
	function Mode(start, stop) {
		let on = false;
		this.start = function() {
			start();
			on = true;
			return true;
		};
		this.stop = function(){
			stop();
			on = false;
		};
	
		this.toggle = function() {
			on ? this.stop() : this.start();
		}
	}	

	const orbit_controls = new OrbitControls(camera, scope)
	orbit_controls.enablePan = false;
	orbit_controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
	orbit_controls.mouseButtons.LEFT = null;
	orbit_controls.mouseButtons.RIGHT = null;
	
	const guiParams = {
		vertexSize: 0.01,
		edgeSize: 1,
		
		
	};
	let edgeResize = function() {
		map_handler.resizeEdges(guiParams.edgeSize);
	}
	let vertexResize = function() {
		map_handler.resizeVertices(guiParams.vertexSize);
	}
	
	const gui = new GUI({autoPlace: true, hideable: false});
	gui.add(guiParams, "vertexSize", 0.00025, 10.1).onChange(vertexResize);
	gui.add(guiParams, "edgeSize", 0.05, 60).onChange(edgeResize);
	const raycaster = new THREE.Raycaster;
	const mouse = new THREE.Vector2;
	
	function setMouse(event) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
	}

	let activeMode = undefined;
	const keyHeld = {};

	let vertex = null;
	let edge = null;

	const selectMouseDown = function(event) {
		setMouse(event);
		if(event.button == 0){
			raycaster.setFromCamera(mouse, camera);
			if(!keyHeld.ShiftLeft)
				map_handler.deselectAll();

			let hit = keyHeld.ShiftLeft ? map_handler.toggleSelectHit(raycaster) : map_handler.selectHit(raycaster);
		}
	}

	const modeSelect = new Mode(
		() => {
			scope.addEventListener( 'pointerdown', selectMouseDown );
		},
		() => {
			scope.removeEventListener( 'pointerdown', selectMouseDown );
		}
	);

	const OPdblClick = function(event) {
		setMouse(event);
		raycaster.setFromCamera(mouse, camera);
		let point = map_handler.positionHit(raycaster);
		if(point) {
			orbit_controls.target.copy(point)
			orbit_controls.update();
		}
	}

	const modeOrbit = new Mode(
		() => {
			orbit_controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
			scope.addEventListener('dblclick', OPdblClick, false);
		},
		() => {
			scope.removeEventListener('dblclick', OPdblClick, false);
			orbit_controls.mouseButtons.LEFT = null;
		}
	);

	const modePan = new Mode(
		() => {
			scope.addEventListener('dblclick', OPdblClick);
			orbit_controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
			orbit_controls.enablePan = true;
		},
		() => {
			scope.removeEventListener('dblclick', OPdblClick);
			orbit_controls.mouseButtons.LEFT = null;
			orbit_controls.enablePan = false;
		}
	);


	let sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(0.0001, 10, 10), new THREE.MeshLambertMaterial({color: 0x0000FF}));
	let sphereDelta = new THREE.Mesh(new THREE.SphereBufferGeometry(0.0001, 10, 10), new THREE.MeshLambertMaterial({color: 0x00FF00}));
	let sphereEdge = new THREE.Mesh(new THREE.SphereBufferGeometry(0.01, 10, 10), new THREE.MeshLambertMaterial({color: 0xFFFF00}));
	scene.add(sphereEdge);
	const getGizmoConstraint = function () {
		if(keyHeld.Digit1)
			return keyHeld.ShiftLeft ? gizmo.constrain.X : gizmo.constrain.YZ;

		if(keyHeld.Digit2)
			return keyHeld.ShiftLeft ? gizmo.constrain.Y : gizmo.constrain.XZ;

		if(keyHeld.Digit3)
			{
				return keyHeld.ShiftLeft ? gizmo.constrain.Z : gizmo.constrain.XY;}
	}

	const worldPos0 = new THREE.Vector3;
	const delta = new THREE.Vector3;

	const moveMouseMove = function(event) {
		setMouse(event);
		raycaster.setFromCamera(mouse, camera);
		let p = gizmo.positionHit(raycaster, getGizmoConstraint());
		delta.subVectors(p, worldPos0);
		sphere.position.copy(p);
		map_handler.displaceSelection(delta);
	}

	const moveMouseUp = function(event) {
		scope.removeEventListener( 'pointermove', moveMouseMove );
		scope.removeEventListener( 'pointerup', moveMouseUp );
	}

	const moveMouseDown = function(event) {
		setMouse(event);
		if(!map_handler.hasSelection())
			selectMouseDown(event);

		if(event.button == 0 && map_handler.hasSelection()){
			map_handler.saveSelectionPosition();
			raycaster.setFromCamera(mouse, camera);
			let hit = map_handler.positionHit(raycaster);
			if(hit){
				gizmo.setPosition(hit);
				gizmo.update(camera);
				worldPos0.copy(gizmo.position);
			}
			else
				worldPos0.copy(gizmo.positionHit(raycaster, getGizmoConstraint()));
			
			sphere.position.copy(worldPos0);
			sphereDelta.position.copy(worldPos0);
			scope.addEventListener( 'pointermove', moveMouseMove );
			scope.addEventListener( 'pointerup', moveMouseUp );
			
		}
	}

	const modeMove = new Mode(
		() => {
			scene.add(sphere);
			scene.add(sphereDelta);
			scope.addEventListener( 'pointerdown', moveMouseDown );
		},
		() => {
			scene.remove(sphere);
			scene.remove(sphereDelta);
			scope.removeEventListener( 'pointerdown', moveMouseDown );
		}
	);

	const addFaceSelectMouseDown = function(event) {
		setMouse(event);
		if(event.button == 0){
			raycaster.setFromCamera(mouse, camera);

			map_handler.toggleSelectHit(raycaster, {edges: true});
			map_handler.addFaceFromSelection();
		}
	}

	const modeAddFace = new Mode(
		() => {
			map_handler.deselectAll({vertices: true, faces:  true});
			map_handler.addFaceFromSelection();
			scope.addEventListener( 'pointerdown', addFaceSelectMouseDown );
		},
		() => {
			scope.removeEventListener( 'pointerdown', addFaceSelectMouseDown );
		}
	);

	const addEdgeSelectMouseDown = function(event) {
		setMouse(event);
		if(event.button == 0){
			raycaster.setFromCamera(mouse, camera);

			map_handler.toggleSelectHit(raycaster, {vertices: true});
			if(map_handler.hasSelection({vertices: true}) == 2){
				map_handler.addEdgeFromSelection();
			}
		}
	}

	const modeAddEdge = new Mode(
		() => {
			map_handler.deselectAll();
			scope.addEventListener( 'pointerdown', addEdgeSelectMouseDown );
		},
		() => {
			scope.removeEventListener( 'pointerdown', addEdgeSelectMouseDown );
		}
	);
	
	const extrudeMouseDown = function(event) {
		setMouse(event);
		map_handler.deselectAll();
		if(event.button == 0){
			raycaster.setFromCamera(mouse, camera);

			let vertexHit = map_handler.selectHit(raycaster, {vertices: true});
			if(vertexHit) {
				let vid0 = vertexHit.instanceId;
				let vid1 = map_handler.addVertex(vertexHit.point);
				map_handler.selectVertex(vid1);
				map_handler.addEdgeFromSelection();
				map_handler.selectVertex(vid1);
				moveMouseDown(event);
				return;
			}

			let edgeHit = map_handler.selectHit(raycaster, {edges: true});
			if(edgeHit) {
				let eid0 = edgeHit.instanceId;
				let eid1 = map_handler.extrudeEdge(eid0);
				map_handler.deselectEdge(eid0);
				// map_handler.deselectAll();
				map_handler.selectEdge(eid1);
				moveMouseDown(event);
				return;
			}
		}
	}
	const modeExtrude = new Mode(
		() => {
			map_handler.deselectAll();
			scope.addEventListener( 'pointerdown', extrudeMouseDown );
		},
		() => {
			scope.removeEventListener( 'pointerdown', extrudeMouseDown );
		},
	);

	const cutEdgeMouseDown = function(event) {
		setMouse(event);
		map_handler.deselectAll();
		if(event.button == 0){
			raycaster.setFromCamera(mouse, camera);

			let edgeHit = map_handler.selectHit(raycaster, {edges: true});
			if(edgeHit) {
				let eid0 = edgeHit.instanceId;
				let vid = map_handler.cutEdge(eid0, edgeHit.point)
				map_handler.deselectAll();
				map_handler.selectVertex(vid);
				moveMouseDown(event);
				// sphereEdge.position.copy(map_handler.edgePoint(edgeHit.point, eid0));
			}
		}
	}	
	const modeCutEdge = new Mode(
		() => {
			map_handler.deselectAll();
			scope.addEventListener( 'pointerdown', cutEdgeMouseDown );
		},
		() => {
			scope.removeEventListener( 'pointerdown', cutEdgeMouseDown );
		},
	);

	const cutFaceMouseDown = function(event) {
		setMouse(event);
		// map_handler.deselectAll();
		if(event.button == 0){
			raycaster.setFromCamera(mouse, camera);

			let vertexHit = map_handler.selectHit(raycaster, {vertices: true});
			if(vertexHit) {
				let vid = vertexHit.instanceId;
				map_handler.selectVertex(vid);
				if(map_handler.hasSelection({vertices: true}) == 2) {
					map_handler.cutFace();
					map_handler.deselectAll();
				}
				return;
			}
		}
	}
	const modecutFace = new Mode(
		() => {
			map_handler.deselectAll();
			console.log("cut face");
			scope.addEventListener( 'pointerdown', cutFaceMouseDown );
		},
		() => {
			scope.removeEventListener( 'pointerdown', cutFaceMouseDown );
		},
	);

	const defaultKeyDown = function(event){
		keyHeld[event.code] = true;
	};

	const defaultKeyUp = function(event){
		console.log(event.which, event.code, event.charCode);
		let nextMode = undefined;
		switch(event.code) {
			case "Escape": // deselect
				map_handler.deselectAll();
				break;
			case "Space": // select mode
				nextMode = modeSelect;
				break;
			case "Delete": // delete selection
				map_handler.deleteSelection();
				break;
			case "KeyA": // add vertices mode

				break;
			case "KeyC": // cut edge
				nextMode = modeCutEdge;
				break;
			case "KeyE": // extrude
				nextMode = modeExtrude;
				break;
			case "KeyF": // create face
				nextMode = modeAddFace;
				break
			case "KeyL": // draw
				nextMode = modeAddEdge;
				break;
			case "Semicolon": // azerty -> "m" move
			case "KeyM":
				nextMode = modeMove;
				break;
			case "KeyO": // orbit
				nextMode = modeOrbit;
				break;
			case "KeyP": // pan
				nextMode = modePan;
				break;
			case "KeyX": // Cut face
				nextMode = modecutFace;
				break;
			case "KeyS": // Print mesh string
				map_handler.exportMesh("ig");
				break;
			case "ControlLeft":
				map_handler.debug(scene);
				break;
		};

		if(nextMode) {
			if(activeMode) 
				activeMode.stop();
			activeMode = nextMode;
			activeMode.start();
		}

		keyHeld[event.code] = false;

	}

	scope.addEventListener("keydown", defaultKeyDown);
	scope.addEventListener("keyup", defaultKeyUp);
	activeMode = modeSelect;
	activeMode.start();


	function load(blob)
	{
		let file_name = blob.name;
		let reader = new FileReader();
		return new Promise( (resolve, reject) =>
		{
			reader.onerror = () => 
			{
				reader.abort();
				ewgl_common.console.error('can not load '+blob.name);
				reject();
			};
			reader.onload = () => 
			{
				resolve(reader.result);
			};
			reader.readAsText(blob);
		});
	}

	function FileDroppedOnCanevas(func)
	{
		scope.addEventListener("dragenter", e =>
		{
			e.stopPropagation();
			e.preventDefault();
		}, false);

		scope.addEventListener("dragover",  e =>
		{
			e.stopPropagation();
			e.preventDefault();
		}, false);

		scope.addEventListener("drop", e =>
		{
			e.stopPropagation();
			e.preventDefault();
			const dt = e.dataTransfer;
			const files = dt.files;
			func(files[0]);
		}, false);
	}
	
	FileDroppedOnCanevas( (blob) =>
	{
		load(blob).then((meshFile) =>
		{
			console.log(meshFile);
			if(blob.name.match(/.cg/))
			{
				map_handler.delete();
				map_handler = new MeshHandler(importGraph("cg", meshFile));
				map_handler.initialize({vertices: true, edges: true});
				map_handler.addMeshesTo(scene);
			}
			if(blob.name.match(/\.ig/))
			{
				map_handler.delete();
				map_handler = new MeshHandler(loadIncidenceGraph("ig", meshFile));
				map_handler.initialize({vertices: true, edges: true, faces: true});
				map_handler.addMeshesTo(scene);
			}
			if(blob.name.match(/.off/))
			{
				if(surfaceView)
					scene.remove(surfaceView);
					// loadCMap2("off", meshFile)
				surfaceView = loadSurfaceView("off", meshFile, {transparent: true, opacity: 0.25});
				scene.add(surfaceView);

				// let map = loadCMap2("off", meshFile);
				// let pos = map.getAttribute(map.vertex, "position");
				// let igPos = ig.getAttribute(ig.vertex, "position");
				// map.foreach(map.edge, ed => {
				// 	let p = new THREE.Vector3(0, 0, 0);
				// 	map.foreachIncident(map.vertex, map.edge, ed, vd => {
				// 		p.addScaledVector(pos[map.cell(map.vertex, vd)], 0.5);
				// 	})
				// 	map_handler.addVertex(p);
				// });

				// map.foreach(map.face, ed => {
				// 	let p = new THREE.Vector3(0, 0, 0);
				// 	let n = 0;
				// 	map.foreachIncident(map.vertex, map.face, ed, vd => {
				// 		p.add(pos[map.cell(map.vertex, vd)]);
				// 		++n;
				// 	})
				// 	p.divideScalar(n);
				// 	map_handler.addVertex(p);
				// });
			}
			if(blob.name.match(/.wrl/)){
				let g = loadWrl(meshFile);
				console.log(g);
				console.log(exportOff(g));
				if(surfaceView)
					scene.remove(surfaceView);
					// loadCMap2("off", meshFile)
				surfaceView = loadSurfaceView("wrl", meshFile, {transparent: true, opacity: 0.25});
				scene.add(surfaceView);
			}
		});
	});

	return this;
})(renderer.domElement, map_handler);

window.event_handler = event_handler;
window.map_handler = map_handler;
window.ig = ig;

window.twirl = function() {
	let angle = Math.PI * 2 / 3;
	let axis = new THREE.Vector3(0, 0, 1);
	let angleOffset = Math.PI / 8;
	let distOffset = new THREE.Vector3(0, 0, 0.25);
	let p0 = new THREE.Vector3(0, 0, 0);
	let p1 = new THREE.Vector3(0, 0.25, 0);
	let p2 = p1.clone().applyAxisAngle(axis, 1.25*angleOffset).multiplyScalar(2);
	// let p2 = new THREE.Vector3(0, 0, 0.5);
	let p3 = new THREE.Vector3(0, 0, 0.5);

	// map_handler.selectVertex()
	let v1_0 = map_handler.addVertex(p1);
	let v1_1 = map_handler.addVertex(p1.clone().applyAxisAngle(axis, angle))
	let v1_2 = map_handler.addVertex(p1.clone().applyAxisAngle(axis, -angle))
	let v2_0 = map_handler.addVertex(p2);
	let v2_1 = map_handler.addVertex(p2.clone().applyAxisAngle(axis, angle))
	let v2_2 = map_handler.addVertex(p2.clone().applyAxisAngle(axis, -angle))
	// met p = new THREE.Vector3();

	let v0_0 = 0;
	map_handler.addEdge(v0_0, v1_0);
	map_handler.addEdge(v0_0, v1_1);
	map_handler.addEdge(v0_0, v1_2);
	map_handler.addEdge(v1_0, v2_0);
	map_handler.addEdge(v1_1, v2_1);
	map_handler.addEdge(v1_2, v2_2);

	let v0_0_ = v0_0;
	let v1_0_ = v1_0;
	let v1_1_ = v1_1;
	let v1_2_ = v1_2;
	let v2_0_ = v2_0;
	let v2_1_ = v2_1;
	let v2_2_ = v2_2;

	for(let i = 0; i < 8; ++i){

	p0.add(distOffset);
	p1.applyAxisAngle(axis, angleOffset);
	p2.applyAxisAngle(axis, angleOffset);
	p1.multiplyScalar(1/0.8);
	p2.multiplyScalar(1/0.8);
	distOffset.multiplyScalar(1/0.8);
	angleOffset *= 0.95;

	v0_0 = map_handler.addVertex(p0);
	v1_0 = map_handler.addVertex(p1.clone().add(p0));
	v1_1 = map_handler.addVertex(p1.clone().add(p0).applyAxisAngle(axis, angle))
	v1_2 = map_handler.addVertex(p1.clone().add(p0).applyAxisAngle(axis, -angle))
	v2_0 = map_handler.addVertex(p2.clone().add(p0));
	v2_1 = map_handler.addVertex(p2.clone().add(p0).applyAxisAngle(axis, angle))
	v2_2 = map_handler.addVertex(p2.clone().add(p0).applyAxisAngle(axis, -angle))
	
	map_handler.addEdge(v0_0, v1_0);
	map_handler.addEdge(v0_0, v1_1);
	map_handler.addEdge(v0_0, v1_2);
	map_handler.addEdge(v1_0, v2_0);
	map_handler.addEdge(v1_1, v2_1);
	map_handler.addEdge(v1_2, v2_2);

	map_handler.addEdge(v0_0_, v0_0);
	map_handler.addEdge(v1_0_, v1_0);
	map_handler.addEdge(v1_1_, v1_1);
	map_handler.addEdge(v1_2_, v1_2);
	map_handler.addEdge(v2_0_, v2_0);
	map_handler.addEdge(v2_1_, v2_1);
	map_handler.addEdge(v2_2_, v2_2);

	v0_0_ = v0_0;
	v1_0_ = v1_0;
	v1_1_ = v1_1;
	v1_2_ = v1_2;
	v2_0_ = v2_0;
	v2_1_ = v2_1;
	v2_2_ = v2_2;
}
angleOffset *= 0.95;


	for(let i = 0; i < 8; ++i){

		p0.add(distOffset);
		p1.applyAxisAngle(axis, angleOffset);
		p2.applyAxisAngle(axis, angleOffset);
		p1.multiplyScalar(0.8);
		p2.multiplyScalar(0.8);
		distOffset.multiplyScalar(0.8);
		angleOffset *= 1/0.95;
	
		v0_0 = map_handler.addVertex(p0);
		v1_0 = map_handler.addVertex(p1.clone().add(p0));
		v1_1 = map_handler.addVertex(p1.clone().add(p0).applyAxisAngle(axis, angle))
		v1_2 = map_handler.addVertex(p1.clone().add(p0).applyAxisAngle(axis, -angle))
		v2_0 = map_handler.addVertex(p2.clone().add(p0));
		v2_1 = map_handler.addVertex(p2.clone().add(p0).applyAxisAngle(axis, angle))
		v2_2 = map_handler.addVertex(p2.clone().add(p0).applyAxisAngle(axis, -angle))
		
		map_handler.addEdge(v0_0, v1_0);
		map_handler.addEdge(v0_0, v1_1);
		map_handler.addEdge(v0_0, v1_2);
		map_handler.addEdge(v1_0, v2_0);
		map_handler.addEdge(v1_1, v2_1);
		map_handler.addEdge(v1_2, v2_2);
	
		map_handler.addEdge(v0_0_, v0_0);
		map_handler.addEdge(v1_0_, v1_0);
		map_handler.addEdge(v1_1_, v1_1);
		map_handler.addEdge(v1_2_, v1_2);
		map_handler.addEdge(v2_0_, v2_0);
		map_handler.addEdge(v2_1_, v2_1);
		map_handler.addEdge(v2_2_, v2_2);
	
		v0_0_ = v0_0;
		v1_0_ = v1_0;
		v1_1_ = v1_1;
		v1_2_ = v1_2;
		v2_0_ = v2_0;
		v2_1_ = v2_1;
		v2_2_ = v2_2;
		}
}

window.crossTorus = function() {
	let axisY = new THREE.Vector3(1, 0, 0);
	let axisX = new THREE.Vector3(0, 1, 0);
	let angle = Math.PI / 8;
	let angleOffset = Math.PI / 16;
	// let angleOffset = Math.PI / 7;
	let p = new THREE.Vector3();
	let p0 = new THREE.Vector3(0, 0, 1);
	let p1 = new THREE.Vector3(0, 0, -0.35);
	let p2 = new THREE.Vector3(0.35, 0, 0);
	let p3 = new THREE.Vector3(0, 0, 0.35);
	let p4 = new THREE.Vector3(-0.35, 0, 0);
	
	map_handler.addVertex(p0);
	map_handler.addVertex(p.addVectors(p0, p1));
	map_handler.addVertex(p.addVectors(p0, p2));
	map_handler.addVertex(p.addVectors(p0, p3));
	map_handler.addVertex(p.addVectors(p0, p4));

	for(let i = 1; i < 16; ++i){
	p0.applyAxisAngle(axisY, angle)
	p1.applyAxisAngle(axisX, angleOffset)
	p2.applyAxisAngle(axisX, angleOffset)
	p3.applyAxisAngle(axisX, angleOffset)
	p4.applyAxisAngle(axisX, angleOffset)
	
	let p1_ = p1.clone().applyAxisAngle(axisY, angle*i)
	let p2_ = p2.clone().applyAxisAngle(axisY, angle*i)
	let p3_ = p3.clone().applyAxisAngle(axisY, angle*i)
	let p4_ = p4.clone().applyAxisAngle(axisY, angle*i)
	map_handler.addVertex(p0);
	map_handler.addVertex(p.addVectors(p0, p1_));
	map_handler.addVertex(p.addVectors(p0, p2_));
	map_handler.addVertex(p.addVectors(p0, p3_));
	map_handler.addVertex(p.addVectors(p0, p4_));
	}
}

window.windTurbine = function() {
	let v0_0, v0_1, v0_2;
	let v0_0_, v0_1_, v0_2_;
	let v1_0, v1_1, v1_2;
	let v1_0_, v1_1_, v1_2_;
	let v2_0, v2_1, v2_2;
	let v2_0_, v2_1_, v2_2_;

	let p0, p1, p2, p3, p4, p5;
	let axis = new THREE.Vector3(0, 1, 0);
	let angleOffset = Math.PI/40;
	let turbineAngle = Math.PI/20;
	p0 = new THREE.Vector3(0, 0, 1);
	p1 = p0.clone().applyAxisAngle(axis, 2*Math.PI/3);
	p2 = p0.clone().applyAxisAngle(axis, -2*Math.PI/3);

	v0_0 = map_handler.addVertex(p0);
	v0_1 = map_handler.addVertex(p0.clone().applyAxisAngle(axis, turbineAngle));
	v0_2 = map_handler.addVertex(p0.clone().applyAxisAngle(axis, -turbineAngle));
	v1_0 = map_handler.addVertex(p1);
	v1_1 = map_handler.addVertex(p1.clone().applyAxisAngle(axis, turbineAngle));
	v1_2 = map_handler.addVertex(p1.clone().applyAxisAngle(axis, -turbineAngle));
	v2_0 = map_handler.addVertex(p2);
	v2_1 = map_handler.addVertex(p2.clone().applyAxisAngle(axis, turbineAngle));
	v2_2 = map_handler.addVertex(p2.clone().applyAxisAngle(axis, -turbineAngle));

	map_handler.addEdge(v0_0, v0_1);map_handler.addEdge(v0_0, v0_2);
	map_handler.addEdge(v1_0, v1_1);map_handler.addEdge(v1_0, v1_2);
	map_handler.addEdge(v2_0, v2_1);map_handler.addEdge(v2_0, v2_2);

	v0_0_ = v0_0; v0_1_ = v0_1; v0_2_ = v0_2;
	v1_0_ = v1_0; v1_1_ = v1_1;	v1_2_ = v1_2;
	v2_0_ = v2_0; v2_1_ = v2_1;	v2_2_ = v2_2;

	p0.applyAxisAngle(axis, angleOffset).addScaledVector(axis, 1/8);
	p1 = p0.clone().applyAxisAngle(axis, 2*Math.PI/3);
	p2 = p0.clone().applyAxisAngle(axis, -2*Math.PI/3);

	let p4_0, v0_4_0, v0_4_1, v0_4_2, v1_4_0, v1_4_1, v1_4_2, v2_4_0, v2_4_1, v2_4_2;
	let p25_0, v0_25_0, v0_25_1, v0_25_2, v1_25_0, v1_25_1, v1_25_2, v2_25_0, v2_25_1, v2_25_2;

	for(let i = 1; i < 30; ++i){
		if(i == 4){
			p4_0 = p0.clone();
			// p4_0_0 = 
			// p4_0_1
			// p4_0_2
		} 
		if(i == 25) p25_0 = p0.clone();
		
		v0_0 = map_handler.addVertex(p0);
		v0_1 = map_handler.addVertex(p0.clone().applyAxisAngle(axis, turbineAngle));
		v0_2 = map_handler.addVertex(p0.clone().applyAxisAngle(axis, -turbineAngle));
		v1_0 = map_handler.addVertex(p1);
		v1_1 = map_handler.addVertex(p1.clone().applyAxisAngle(axis, turbineAngle));
		v1_2 = map_handler.addVertex(p1.clone().applyAxisAngle(axis, -turbineAngle));
		v2_0 = map_handler.addVertex(p2);
		v2_1 = map_handler.addVertex(p2.clone().applyAxisAngle(axis, turbineAngle));
		v2_2 = map_handler.addVertex(p2.clone().applyAxisAngle(axis, -turbineAngle));

		map_handler.addEdge(v0_0, v0_1);map_handler.addEdge(v0_0, v0_2);
		map_handler.addEdge(v1_0, v1_1);map_handler.addEdge(v1_0, v1_2);
		map_handler.addEdge(v2_0, v2_1);map_handler.addEdge(v2_0, v2_2);

		map_handler.addEdge(v0_0, v0_0_);
		map_handler.addEdge(v0_1, v0_1_);
		map_handler.addEdge(v0_2, v0_2_);
		map_handler.addEdge(v1_0, v1_0_);
		map_handler.addEdge(v1_1, v1_1_);
		map_handler.addEdge(v1_2, v1_2_);
		map_handler.addEdge(v2_0, v2_0_);
		map_handler.addEdge(v2_1, v2_1_);
		map_handler.addEdge(v2_2, v2_2_);

		v0_0_ = v0_0; v0_1_ = v0_1; v0_2_ = v0_2;
		v1_0_ = v1_0; v1_1_ = v1_1;	v1_2_ = v1_2;
		v2_0_ = v2_0; v2_1_ = v2_1;	v2_2_ = v2_2;

		p0.applyAxisAngle(axis, angleOffset).addScaledVector(axis, 1/8);
		p1 = p0.clone().applyAxisAngle(axis, 2*Math.PI/3);
		p2 = p0.clone().applyAxisAngle(axis, -2*Math.PI/3);
	}

	let shrink = new THREE.Vector3(0.87, 1, 0.87)
	console.log(p4_0)
	p4_0.multiply(shrink);
	p25_0.multiply(shrink);
	// p0 = p4_0;
	let p4_1 = p4_0.clone().applyAxisAngle(axis, 2*Math.PI/3);
	let p4_2 = p4_0.clone().applyAxisAngle(axis, -2*Math.PI/3);

	let p25_1 = p25_0.clone().applyAxisAngle(axis, 2*Math.PI/3);
	let p25_2 = p25_0.clone().applyAxisAngle(axis, -2*Math.PI/3);

	let branchAngle = Math.PI/30;

	for(let i = 0;  i < 14; ++i){
		v0_0 = map_handler.addVertex(p4_0);
		v1_0 = map_handler.addVertex(p4_1);
		v2_0 = map_handler.addVertex(p4_2);

		v0_1 = map_handler.addVertex(p4_0.clone().applyAxisAngle(axis, branchAngle));
		v0_2 = map_handler.addVertex(p4_0.clone().applyAxisAngle(axis, -branchAngle));
		v1_0 = map_handler.addVertex(p4_1);
		v1_1 = map_handler.addVertex(p4_1.clone().applyAxisAngle(axis, branchAngle));
		v1_2 = map_handler.addVertex(p4_1.clone().applyAxisAngle(axis, -branchAngle));
		v2_0 = map_handler.addVertex(p4_2);
		v2_1 = map_handler.addVertex(p4_2.clone().applyAxisAngle(axis, branchAngle));
		v2_2 = map_handler.addVertex(p4_2.clone().applyAxisAngle(axis, -branchAngle));

		p4_0.multiply(shrink);
		p4_1 = p4_0.clone().applyAxisAngle(axis, 2*Math.PI/3);
		p4_2 = p4_0.clone().applyAxisAngle(axis, -2*Math.PI/3);


		v0_0 = map_handler.addVertex(p25_0);
		v1_0 = map_handler.addVertex(p25_1);
		v2_0 = map_handler.addVertex(p25_2);

		v0_1 = map_handler.addVertex(p25_0.clone().applyAxisAngle(axis, branchAngle));
		v0_2 = map_handler.addVertex(p25_0.clone().applyAxisAngle(axis, -branchAngle));
		v1_0 = map_handler.addVertex(p25_1);
		v1_1 = map_handler.addVertex(p25_1.clone().applyAxisAngle(axis, branchAngle));
		v1_2 = map_handler.addVertex(p25_1.clone().applyAxisAngle(axis, -branchAngle));
		v2_0 = map_handler.addVertex(p25_2);
		v2_1 = map_handler.addVertex(p25_2.clone().applyAxisAngle(axis, branchAngle));
		v2_2 = map_handler.addVertex(p25_2.clone().applyAxisAngle(axis, -branchAngle));

		p25_0.multiply(shrink);
		p25_1 = p25_0.clone().applyAxisAngle(axis, 2*Math.PI/3);
		p25_2 = p25_0.clone().applyAxisAngle(axis, -2*Math.PI/3);
	}

	branchAngle = Math.PI/15;
	for(let i = 0; i < 30; i++)
	{
		p4_0.applyAxisAngle(axis, branchAngle);
		p25_0.applyAxisAngle(axis, branchAngle);

		v0_0 = map_handler.addVertex(p4_0);
		v0_0 = map_handler.addVertex(p25_0);
	}
	p4_0.multiply(shrink);
	p25_0.multiply(shrink);
	for(let i = 0; i < 30; i++)
	{
		p4_0.applyAxisAngle(axis, branchAngle);
		p25_0.applyAxisAngle(axis, branchAngle);

		v0_0 = map_handler.addVertex(p4_0);
		v0_0 = map_handler.addVertex(p25_0);
	}
	p4_0.multiply(shrink);
	p25_0.multiply(shrink);
	for(let i = 0; i < 30; i++)
	{
		p4_0.applyAxisAngle(axis, branchAngle);
		p25_0.applyAxisAngle(axis, branchAngle);

		v0_0 = map_handler.addVertex(p4_0);
		v0_0 = map_handler.addVertex(p25_0);
	}
	p4_0.multiply(shrink);
	p25_0.multiply(shrink);
}

function nbIncidentFaces(ig, e) {
	let nbIncFaces = 0;
	ig.foreachIncident(ig.face, ig.edge, e, f => {
		++nbIncFaces;
	});
	return nbIncFaces;
};

function isolatedEdge(ig, e) {
	return nbIncidentFaces(ig, e) == 0;
}

function boundaryEdge(ig, e) {
	return nbIncidentFaces(ig, e) == 1;
}

function pseudoDegree(ig, v) {
	let degree = 0;
	let data = {
		degree: 0,
		isolatedEdges: 0,
		boundaryEdges: 0,
		fanEdges: 0
	}

	ig.foreachIncident(ig.edge, ig.vertex, v, e => {
		switch(nbIncidentFaces(ig, e)) {
			case 0: 
				data.degree += 1;
				++data.isolatedEdges;
				break;
			case 1: 
				data.degree += 0.5;
				++data.boundaryEdges;
				break;
			case 2:
				break;
			default:
				++data.fanEdges;
				return -1;
		}
	});

	return data;
}

const branchesDebugData = [];

function findBranchExtremities(ig, vStart, eStart, eMarker) {
	// const vMarker = ig.newMarker(ig.vertex);
	const branch = [eStart];

	let eCurrent = eStart;

	// vMarker.mark(vStart);
	let incidentVertices = ig.incident(ig.vertex, ig.edge, eStart);
	let incidentEdges;
	let vNext = vStart;

	let degree;
	let debugCount = 0;
	do {
		eMarker.mark(eCurrent);
		incidentVertices = ig.incident(ig.vertex, ig.edge, eCurrent);
		vNext = incidentVertices[0] != vNext ? incidentVertices[0] : incidentVertices[1];
		degree = ig.degree(ig.vertex, vNext);
		if(degree == 2) {
			debugCount++;
			incidentEdges = ig.incident(ig.edge, ig.vertex, vNext);
			eCurrent = incidentEdges[0] != eCurrent ? incidentEdges[0] : incidentEdges[1];
		}
	} while (degree == 2)
	branch.push(eCurrent);
	return branch;
}

function analyzeSkeleton (ig) {
	const igData = {
		intersections : [],
		ffJunctures : [],
		efJunctures : [],
		branches : [],
		leaflets : []
	}

	ig.foreach(ig.vertex, v => {
		let vertexData = pseudoDegree(ig, v);
		if(vertexData.degree > 2) {
			igData.intersections.push(v);
			return;
		}

		if(vertexData.degree == 2) {
			if(vertexData.isolatedEdges == 1)
				igData.efJunctures.push(v);
			else if(vertexData.isolatedEdges == 0)
				igData.ffJunctures.push(v);
		}
	});

	const faceMarker = ig.newMarker(ig.face);
	console.log(faceMarker);
	ig.foreach(ig.face, f0 => {
		if(faceMarker.marked(f0))
			return;

		igData.leaflets.push(f0);
		const visit = [f0];		
		faceMarker.mark(f0);
		for(let i = 0; i < visit.length; ++i) {
			ig.foreachAdjacent(ig.edge, ig.face, visit[i], f => {
				if(!faceMarker.marked(f)) {
					faceMarker.mark(f);
					visit.push(f);
				}
			});
		}
		
	});

	const eMarker = ig.newMarker(ig.edge);

	igData.efJunctures.forEach(v => {
		let firstEdge;
		ig.foreachIncident(ig.edge, ig.vertex, v, e => {
			if(ig.degree(ig.edge, e) == 0)
				firstEdge = e;
		});

		if(!eMarker.marked(firstEdge))
			igData.branches.push(findBranchExtremities(ig, v, firstEdge ,eMarker));
	});

	igData.intersections.forEach(v => {
		ig.foreachIncident(ig.edge, ig.vertex, v, e => {
			if(ig.degree(ig.edge, e) == 0 && !eMarker.marked(e))
				igData.branches.push(findBranchExtremities(ig, v, e, eMarker));
		});
	});

	console.log(igData.branches);
	return igData;
}

function analyzeFaceGeometry (ig) {
	const faceCenters = ig.addAttribute(ig.face, "faceCenters"); //debug
	const faceNormals = ig.addAttribute(ig.face, "faceNormals");
	const faceVertexTangents = ig.addAttribute(ig.face, "faceVertexTangents");
	const position = ig.getAttribute(ig.vertex, "position");

	ig.foreach(ig.face, f => {
		const center = new THREE.Vector3;
		const verts = [];
		ig.foreachIncident(ig.vertex, ig.face, f, v => {{
			verts.push(position[v]);
			center.add(position[v]);
		}});
		center.divideScalar(verts.length);

		faceCenters[f] = center;
		faceNormals[f] = new THREE.Vector3;
		const normal = new THREE.Vector3;
		const v0 = new THREE.Vector3;
		const v1 = new THREE.Vector3;
		for(let i = 0; i < verts.length; ++i) {
			v0.copy(verts[i]).sub(center);
			v1.copy(verts[(i+1)%verts.length]).sub(center);
			normal.crossVectors(v0, v1).normalize();
			faceNormals[f].add(normal);
		}
		faceNormals[f].divideScalar(verts.length);
		faceVertexTangents[f] = {};
	});

	const skelData = analyzeSkeleton(ig);

	skelData.efJunctures.forEach(v => {
		const tangent = new THREE.Vector3;
		ig.foreachIncident(ig.face, ig.vertex, v, f => {
			tangent.add(faceCenters[f].clone().sub(position[v]));
			faceVertexTangents[f][v] = tangent;
		});
		tangent.normalize();
	});

	skelData.ffJunctures.forEach(v0 => {
		const faceMarker = ig.newMarker(ig.face);
		const tangents = [];
		ig.foreachIncident(ig.face, ig.vertex, v0, f0 => {
			if(faceMarker.marked(f0))
				return;

			const tangent = new THREE.Vector3;

			const leaflet = incidentLeaflet(ig, v0, f0);
			leaflet.forEach(f => {
				faceMarker.mark(f);
				tangent.add(faceCenters[f].clone().sub(position[v0]));
				faceVertexTangents[f][v0] = tangent;
			});
			tangent.normalize();
			tangents.push(tangent);
		});
	});

	console.log(faceNormals, faceVertexTangents);
}

function incidentLeaflets(ig, v0) {
	const leaflets = [];
	const faceMarker = ig.newMarker(ig.face);

	ig.foreachIncident(ig.face, ig.vertex, v0, f0 => {
		if(faceMarker.marked(f0))
			return;

		const leaflet = incidentLeaflet(ig, v0, f0);
		leaflet.forEach(f => {
			faceMarker.mark(f);
		});
		leaflets.push(leaflet);
	});

	return leaflets;
}

function incidentLeaflet(ig, v0, f0) {
	const leaflet = [f0];
	const faceMarker = ig.newMarker(ig.face);
	faceMarker.mark(f0);

	for(let i = 0; i < leaflet.length; ++i){ 
		ig.foreachAdjacent(ig.edge, ig.face, leaflet[i], f => {
			if(faceMarker.marked(f))
				return;
			faceMarker.mark(f);

			const incidentVertices = {};
			let sharedVert = false;
			ig.foreachIncident(ig.vertex, ig.face, f, v => {
				if(v == v0)
					sharedVert = true;
			});
			if(sharedVert)
				leaflet.push(f);
		});
	}
	return leaflet;
}

function buildContactSurfaces(ig, igData) {
	const surfaces = new CMap2();
	
	const pos = ig.getAttribute(ig.vertex, "position");
	const faceNormals = ig.getAttribute(ig.face, "faceNormals");
	const faceCenters = ig.getAttribute(ig.face, "faceCenters");
	const faceVertexTangents = ig.getAttribute(ig.face, "faceVertexTangents");


}

function buildcontactsurface2(ig, v, m2){
	
}


function debugDrawFaceGeometry() {
	let skelData = analyzeSkeleton(ig);
	analyzeFaceGeometry(ig);

	const ig2 = new IncidenceGraph;
	ig2.createEmbedding(ig2.vertex);
	const pos = ig2.addAttribute(ig2.vertex, "position");
	const pos0 = ig.getAttribute(ig.vertex, "position");

	const faceNormals = ig.getAttribute(ig.face, "faceNormals");
	const faceCenters = ig.getAttribute(ig.face, "faceCenters");
	const faceVertexTangents = ig.getAttribute(ig.face, "faceVertexTangents");

	ig.foreach(ig.face, f => {
		let v0 = ig2.addVertex();
		pos[v0] = faceCenters[f].clone();
		let v1 = ig2.addVertex();
		pos[v1] = faceNormals[f].clone().divideScalar(2).add(faceCenters[f]);
		ig2.addEdge(v0, v1);
	});

	skelData.efJunctures.forEach(v => {
		let v0 = ig2.addVertex();
		pos[v0] = pos0[v].clone();
		let v1 = ig2.addVertex();
		let f;
		ig.foreachIncident(ig.face, ig.vertex, v, fi => {f = f ?? fi})
		pos[v1] = faceVertexTangents[f][v].clone().divideScalar(2).add(pos[v0]);
		ig2.addEdge(v0, v1);
	});
	
	skelData.ffJunctures.forEach(v => {
		let v0 = ig2.addVertex();
		pos[v0] = pos0[v].clone();
		const leaflets = incidentLeaflets(ig, v);
		leaflets.forEach(leaflet => {
			let v1 = ig2.addVertex();
			let f = leaflet[0];
			pos[v1] = faceVertexTangents[f][v].clone().divideScalar(2).add(pos[v0]);
			ig2.addEdge(v0, v1);
		});
		
		
	});
	



	const renderer2 = new Renderer(ig2);
	renderer2.vertices.create();
	renderer2.vertices.addTo(scene);
	renderer2.edges.create();
	renderer2.edges.addTo(scene);
}

window.analyzeSkeleton = analyzeSkeleton;
window.incidentLeaflet = incidentLeaflet;
window.analyzeFaceGeometry = analyzeFaceGeometry;
window.debugDrawFaceGeometry = debugDrawFaceGeometry;


window.exportCG = exportIncidenceGraph;


function update ()
{
	gizmo.update(camera);
}

function render()
{
	renderer.render(scene, camera);
}

function mainloop()
{
    update();
    render();
    requestAnimationFrame(mainloop);
}

mainloop();