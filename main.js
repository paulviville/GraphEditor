import {CMap0} from './CMapJS/CMap/CMap.js';
import {CMap1} from './CMapJS/CMap/CMap.js';
import {CMap2} from './CMapJS/CMap/CMap.js';
import {CMap3} from './CMapJS/CMap/CMap.js';
import IncidenceGraph from './CMapJS/CMap/IncidenceGraph.js';
import Renderer from './CMapJS/Rendering/Renderer.js';
import * as THREE from './CMapJS/Libs/three.module.js';
import { OrbitControls } from './CMapJS/Libs/OrbitsControls.js';
import { loadCMap2 } from './CMapJS/IO/Surface_Formats/CMap2IO.js';
import { loadSurfaceView } from './CMapJS/Rendering/displayOnly.js';
import { controllers, GUI } from './CMapJS/Libs/dat.gui.module.js';
import { TransformControls } from './CMapJS/Libs/TransformControls.js'
import MeshHandler from './MeshHandler.js';
import Gizmo from './Gizmo.js';


import {importIncidenceGraph, exportIncidenceGraph} from './CMapJS/IO/IncidenceGraphFormats/IncidenceGraphIO.js';
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

let ig = importIncidenceGraph("ig", test0_ig);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xAAAAAA);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000.0);
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
	gui.add(guiParams, "vertexSize", 0.01, 0.1).onChange(vertexResize);
	gui.add(guiParams, "edgeSize", 1, 10).onChange(edgeResize);
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


	let sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(0.01, 10, 10), new THREE.MeshLambertMaterial({color: 0x0000FF}));
	let sphereDelta = new THREE.Mesh(new THREE.SphereBufferGeometry(0.01, 10, 10), new THREE.MeshLambertMaterial({color: 0x00FF00}));
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
				map_handler.exportMesh();
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
				
			}
			if(blob.name.match(/.ig/))
			{
				map_handler.delete();
				map_handler = new MeshHandler(importIncidenceGraph("ig", meshFile));
				map_handler.initialize({vertices: true, edges: true, faces: true});
				map_handler.addMeshesTo(scene);
			}
			if(blob.name.match(/.off/))
			{
				if(surfaceView)
					scene.remove(surfaceView);
				surfaceView = loadSurfaceView("off", meshFile, {transparent: true, opacity: 0.8});
				scene.add(surfaceView);
			}
		});
	});

	return this;
})(renderer.domElement, map_handler);

window.event_handler = event_handler;
window.map_handler = map_handler;
window.ig = ig;


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