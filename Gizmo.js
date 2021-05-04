import * as THREE from './CMapJS/Libs/three.module.js';

function Gizmo () {
	this.constrain = {
		X: 1, Y: 2, Z: 3, W: 4,
		XY: 5, XZ: 6, YZ: 7
	};

	this.position = new THREE.Vector3;

	const group = new THREE.Group;
	let xPlane, yPlane, zPlane, wPlane;

	this.initialize = function () {
		const geometry = new THREE.PlaneGeometry( 1000, 1000 );
		const wMaterial = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0} );
		const xMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0} );
		const yMaterial = new THREE.MeshBasicMaterial( {color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0} );
		const zMaterial = new THREE.MeshBasicMaterial( {color: 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0} );
		xPlane = new THREE.Mesh(geometry, xMaterial);
		yPlane = new THREE.Mesh(geometry, yMaterial);
		zPlane = new THREE.Mesh(geometry, zMaterial);
		wPlane = new THREE.Mesh(geometry, wMaterial);

		group.add(xPlane);
		xPlane.rotation.y += Math.PI / 2;
		group.add(yPlane);
		yPlane.rotation.x += Math.PI / 2;
		group.add(zPlane);
		group.add(wPlane);
	};

	this.setPosition = function (pos) {
		group.position.copy(pos);
		this.position.copy(pos);
	};

	this.addTo = function (parent) {
		parent.add(group);
	};

	this.remove = function () {
		group.parent.remove(group);
	}

	this.update = function (camera) {
		wPlane.rotation.copy(camera.rotation);
	}

	this.positionHit = function (raycaster, constraint) {
		const hits = { };

		hits.x = raycaster.intersectObject(xPlane)[0];
		hits.x = hits.x ? hits.x.point : undefined;

		hits.y = raycaster.intersectObject(yPlane)[0];
		hits.y = hits.y ? hits.y.point : undefined;
		
		hits.z = raycaster.intersectObject(zPlane)[0];
		hits.z = hits.z ? hits.z.point : undefined;
		
		hits.w = raycaster.intersectObject(wPlane)[0];
		hits.w = hits.w ? hits.w.point : undefined;

		let hitPoint = new THREE.Vector3;
		switch(constraint) {
			case undefined:
				hitPoint.copy(hits.w);
				break;
			case this.constrain.X:
				hitPoint.copy(hits.x);
				break;
			case this.constrain.Y:
				hitPoint.copy(hits.y);
				break;
			case this.constrain.Z:
				hitPoint.copy(hits.z);
				break;
			case this.constrain.XY:
				hits.x.set(0, 0, hits.x.z - this.position.z);
				hitPoint.copy(this.position);
				hitPoint.add(hits.x);
				break;
			case this.constrain.XZ:
				hits.z.set(0, hits.z.y - this.position.y, 0);
				hitPoint.copy(this.position);
				hitPoint.add(hits.z);
				break;
			case this.constrain.YZ:
				hits.y.set(hits.y.x - this.position.x, 0, 0);
				hitPoint.copy(this.position);
				hitPoint.add(hits.y);
				break;
			default:
				
		}
		
		return hitPoint;
	};


}

export default Gizmo;

