import * as THREE from './CMapJS/Libs/three.module.js';
import Renderer from './CMapJS/Rendering/Renderer.js';


function MeshHandler (mesh, params = {}) {
	const vertex = mesh.vertex;
	const edge = mesh.edge;
	const face = mesh.face;

	const renderer = new Renderer(mesh);
	const position = mesh.getAttribute(vertex, "position");
	const savedPosition = mesh.addAttribute(vertex, "savedPosition");

	const vertex_color = params.vertex_color || new THREE.Color(0xFF0000);
	const vertex_select_color = params.vertex_select_color || new THREE.Color(0x00FF00);
	const edge_color = params.edge_color || new THREE.Color(0x0000DD);
	const edge_select_color = params.edge_select_color || new THREE.Color(0x00FF00);
	const face_color = params.face_color || new THREE.Color(0x339999);
	const face_select_color = params.face_select_color || new THREE.Color(0x00FF00);

	let vertexSize = params.vertexSize || 0.01; 
	let edgeSize = params.edgeSize || 1.5; 

	const selectedVertices = new Set;
	const selectedEdges = new Set;
	const selectedFaces = new Set;
	const selectionVertices = new Set;

	let parentObject;
	let verticesMesh, edgesMesh, facesMesh;
	this.initialize = function (params = {}) {
		if(params.vertices) {
			renderer.vertices.create({size: vertexSize, color: vertex_color}); 
			verticesMesh = renderer.vertices.mesh;
		}
		if(params.edges) {
			renderer.edges.create({size: edgeSize, color: edge_color}); 
			edgesMesh = renderer.edges.mesh;
		}
		if(params.faces) {
			renderer.faces.create({color: face_color, side: THREE.DoubleSide}); 
			facesMesh = renderer.faces.mesh;
		}
	};

	this.addMeshesTo = function (parent) {
		parentObject = parentObject || parent;
		if(verticesMesh) renderer.vertices.addTo(parent);
		if(edgesMesh) renderer.edges.addTo(parent);
		if(facesMesh) renderer.faces.addTo(parent);
	}

	this.resizeVertices = function(size) {
		vertexSize = size;
		renderer.vertices.resize(size);
		this.updateVertices();
	}

	this.resizeEdges = function(size) {
		edgeSize = size;
		renderer.edges.resize(size);
		this.updateEdges();
	}

	this.updateVertices = function() {
		renderer.vertices.update();
		verticesMesh = renderer.vertices.mesh;
	};

	this.updateEdges = function() {
		renderer.edges.update();
		edgesMesh = renderer.edges.mesh;
	};

	this.updateFaces = function() {
		renderer.faces.update();
		facesMesh = renderer.faces.mesh;
	}

	this.updateMeshes = function () {
		if(verticesMesh) {
			this.updateVertices();
		}
		if(edgesMesh) {
			this.updateEdges();
		}
		if(facesMesh) {
			this.updateFaces();
		}
	}

	function raycast (raycaster, target) {
		return raycaster.intersectObject(target)[0];
	};

	this.positionHit = function (raycaster) {
		let targets = [];
		if(verticesMesh) targets.push(verticesMesh);
		if(edgesMesh) targets.push(edgesMesh);
		if(facesMesh) targets.push(facesMesh);
		console.log(facesMesh)
		const hit = raycaster.intersectObjects(targets);
		return (hit[0] ? hit[0].point : undefined);
	};

	this.edgePoint = function (eid, point) {
		let e0 = edgesMesh.ed[eid];
		let projection = new THREE.Vector3;
		let A = new THREE.Vector3;
		let B = new THREE.Vector3;
		let vs = [];
		mesh.foreachIncident(vertex, edge, e0, v => {
			vs.push(v);
		});
		B.subVectors(position[vs[1]], position[vs[0]]);
		A.subVectors(point, position[vs[0]]);
		B.multiplyScalar(A.dot(B) / B.dot(B));
		projection.add(B).add(position[vs[0]]);
		return projection;
	};

	this.selectHit = function (raycaster, params) {
		params = params ? params : {vertices: true, edges: true, faces: true};
		let vertexHit = (verticesMesh && params.vertices)? raycast(raycaster, verticesMesh) : undefined;
		if(vertexHit) {
			let vid = vertexHit.instanceId;
			selectedVertices.add(vid);
			this.changeVertexColor(vid, vertex_select_color);
			return vertexHit;
		}
		let edgeHit = (edgesMesh && params.edges) ? raycast(raycaster, edgesMesh): undefined;
		if(edgeHit) {
			let eid = edgeHit.instanceId;
			selectedEdges.add(eid);
			this.changeEdgeColor(eid, edge_select_color);
			return edgeHit;
		}
		let faceHit = (facesMesh && params.faces) ? raycast(raycaster, facesMesh) : undefined;
		if(faceHit) {
			let fid = faceHit.faceIndex;
			selectedFaces.add(fid);
			this.changeFaceColor(fid, edge_select_color);
			return faceHit;
		}

		return undefined;
	};

	this.toggleSelectHit = function (raycaster, params) {
		params = params ? params : {vertices: true, edges: true, faces: true};
		let vertexHit = (verticesMesh && params.vertices)? raycast(raycaster, verticesMesh) : undefined;
		if(vertexHit) {
			let vid = vertexHit.instanceId;
			if(selectedVertices.has(vid)) {
				selectedVertices.delete(vid);
				this.changeVertexColor(vid, vertex_color);
			}
			else {
				selectedVertices.add(vid);
				this.changeVertexColor(vid, vertex_select_color);
			}
			return vertexHit;
		}
		let edgeHit = (edgesMesh && params.edges) ? raycast(raycaster, edgesMesh): undefined;
		if(edgeHit) {
			let eid = edgeHit.instanceId;
			if(selectedEdges.has(eid)) {
				selectedEdges.delete(eid);
				this.changeEdgeColor(eid, edge_color);
			}
			else {
				selectedEdges.add(eid);
				this.changeEdgeColor(eid, edge_select_color);
			}
			return edgeHit;
		}
		let faceHit = (facesMesh && params.faces) ? raycast(raycaster, facesMesh) : undefined;
		if(faceHit) {
			let fid = faceHit.faceIndex;
			if(selectedFaces.has(fid)) {
				selectedFaces.delete(fid);
				this.changeFaceColor(fid, face_color);
			}
			else {
				selectedFaces.add(fid);
				this.changeFaceColor(fid, face_select_color);
			}
			return faceHit;
		}

		return undefined;
	};

	this.deselectAll = function (params) {
		params = params ? params : {vertices: true, edges: true, faces: true};
		if(params.vertices) {
			selectedVertices.forEach(v => this.changeVertexColor(v, vertex_color));
			selectedVertices.clear();
		}

		if(params.edges) {
			selectedEdges.forEach(e => this.changeEdgeColor(e, edge_color));
			selectedEdges.clear();
		}

		if(params.faces) {
			selectedFaces.forEach(f => this.changeFaceColor(f, face_color));
			selectedFaces.clear();
		}
	};

	this.hasSelection = function (params) {
		params = params ? params : {vertices: true, edges: true, faces: true};
		let hasSelection = 0;
		hasSelection += (params.vertices ? selectedVertices.size : 0);
		hasSelection += (params.edges ? selectedEdges.size : 0);
		hasSelection += (params.faces ? selectedFaces.size : 0);
		return hasSelection;
	}

	this.selectVertex = function (vid) {
		selectedVertices.add(vid);
		this.changeVertexColor(vid, vertex_select_color);
	};

	this.deselectVertex = function (vid) {
		selectedVertices.delete(vid);
		this.changeVertexColor(vid, vertex_color);
	};

	this.selectEdge = function (eid) {
		selectedEdges.add(eid);
		this.changeEdgeColor(eid, edge_select_color);
	};

	this.deselectEdge = function (eid) {
		selectedEdges.delete(eid);
		this.changeEdgeColor(eid, edge_color);
	};

	this.changeVertexColor = function (vid, color) {
		verticesMesh.setColorAt(vid, color);
		renderer.vertices.mesh.instanceColor.needsUpdate = true;
	};

	this.changeEdgeColor = function (eid, color) {
		edgesMesh.setColorAt(eid, color);
		edgesMesh.instanceColor.needsUpdate = true;
	};

	this.changeFaceColor = function (fid, color) {
		facesMesh.geometry.faces[fid].color.copy(color);
		facesMesh.geometry.colorsNeedUpdate = true;
	};

	this.addFaceFromSelection = function () {
		if(this.hasSelection({edges: true})) {
			const edges = Array.from(selectedEdges).map(eid => edgesMesh.ed[eid]);
			if(mesh.addFace(...edges) != undefined) {
				this.updateFaces();
				this.deselectAll({edges: true});
			}
		}
	};

	this.addEdgeFromSelection = function () {
		if(this.hasSelection({vertices: true}) == 2) {
			let vertices = Array.from(selectedVertices);
			let v0 = verticesMesh.vd[vertices[0]];
			let v1 = verticesMesh.vd[vertices[1]];
			let ed = mesh.addEdge(v0, v1);
			this.updateEdges();
			this.deselectAll({vertices: true});
			return ed;
		}
	};

	this.addVertex = function (pos) {
		let v = mesh.addVertex();
		position[v] = pos.clone();
		this.updateVertices();
		let vid = mesh.getAttribute(vertex, "instanceId")[v];
		return vid;
	};

	this.extrudeEdge = function (eid) {
		let e0 = edgesMesh.ed[eid];
		let e0v = [];
		let e1v = [];
		let es = [];
		mesh.foreachIncident(vertex, edge, e0, v0 => {
			e0v.push(v0);
			let v1 = mesh.addVertex();
			e1v.push(v1);
			position[v1] = position[v0].clone();
			es.push(mesh.addEdge(v0, v1));
		});

		let e1 = mesh.addEdge(e1v[0], e1v[1]);
		mesh.addFace(e0, es[0], e1, es[1]);

		this.updateVertices();
		this.updateEdges();
		this.updateFaces();

		return mesh.getAttribute(edge, "instanceId")[e1];
	};

	this.cutEdge = function (eid, point) {
		console.log(eid, point, edgesMesh.ed[eid])
		let p = this.edgePoint(eid, point)
		let v = mesh.cutEdge(edgesMesh.ed[eid]);
		position[v] = p;
		this.updateVertices();
		this.updateEdges();

		let vid = mesh.getAttribute(vertex, "instanceId")[v];
		mesh.debug();
		console.log(position)
		return vid;
	};

	this.cutFace = function () {
		let it = selectedVertices.entries();
		const v0 = it.next().value[0];
		const v1 = it.next().value[0];

		const faces0 = [];
		mesh.foreachIncident(face, vertex, v0, f => faces0.push(f));

		const faces1 = [];
		mesh.foreachIncident(face, vertex, v1, f => faces1.push(f));

		const commonFace = faces0.filter(f => faces1.includes(f));
		if (commonFace.length) {
			mesh.cutFace(commonFace[0], v0, v1);
			this.updateEdges();
			this.updateFaces();
		}	
	};

	// TODO: mesh.cell(vertex, v) for cmap compatibility
	this.saveSelectionPosition = function () {
		selectionVertices.clear();

		selectedVertices.forEach(vid => {
			selectionVertices.add(verticesMesh.vd[vid]);
		});

		selectedEdges.forEach(eid => {
			let e = edgesMesh.ed[eid];
			mesh.foreachIncident(vertex, edge, e, v => {
				selectionVertices.add(v);
			});
		});

		selectedFaces.forEach(fid => {
			let f = facesMesh.fd[fid];
			mesh.foreachIncident(vertex, face, f, v => {
				selectionVertices.add(v);
			});
		});

		selectionVertices.forEach(v => {
			savedPosition[v] = position[v].clone();

		});
	};

	this.displaceSelection = function (delta) {
		selectionVertices.forEach(vd => {
			position[vd].addVectors(savedPosition[vd], delta);
		});
		this.updateVertices();
		this.updateEdges();
		this.updateFaces();
		this.recolorSelection();
	};

	this.cancelSelectionMove = function () {
		selectionVertices.forEach(vd => {
			position[vd].copy(savedPosition[vd]);
		});
		this.updateVertices();
		this.updateEdges();
		this.updateFaces();
	};

	this.targetCenter = function (raycaster) {}

	this.getPosition = function (v) {};

	this.getEdgeMid = function (e) {};

	this.getFaceCenter = function (f) {};

	this.saveVertexPos = function (v) {};
	this.savedVertexPos = function (v) {};
	this.updateVertex = function (v) {};
	this.updateEdge = function (e) {};

	// this.rescale_vertices

	this.recolorSelection = function () {
		if(selectedFaces.size) {
			selectedFaces.forEach(fid => {
				this.changeFaceColor(fid, face_select_color);
			});
		}

		if(selectedEdges.size) {
			selectedEdges.forEach(eid => {
				this.changeEdgeColor(eid, edge_select_color);
			});
		}

		if(selectedVertices.size) {
			selectedVertices.forEach(vid => {
				this.changeVertexColor(vid, vertex_select_color);	
			});
		}
	}

	this.deleteSelection = function () {
		const update = {};
		if(selectedFaces.size) {
			selectedFaces.forEach(fid => {
				let f = facesMesh.fd[fid];
				mesh.deleteFace(f);
			});
			selectedFaces.clear();
			update.faces = true;
		}

		if(selectedEdges.size) {
			selectedEdges.forEach(eid => {
				let e = edgesMesh.ed[eid];
				mesh.deleteEdge(e);
			});
			selectedEdges.clear();
			update.edges = true;
			update.faces = true;
		}

		if(selectedVertices.size) {
			selectedVertices.forEach(vid => {
				let v = verticesMesh.vd[vid];
				mesh.deleteVertex(v);
			});
			selectedVertices.clear();
			update.vertices = true;
			update.edges = true;
			update.faces = true;
		}

		update.vertices ? this.updateVertices() : undefined;
		update.edges ? this.updateEdges() : undefined;
		update.faces ? this.updateFaces() : undefined;
		this.recolorSelection();
	};

	this.delete = function () {
		renderer.vertices.delete();
		renderer.edges.delete();
		renderer.faces.delete();
	}
}

export default MeshHandler