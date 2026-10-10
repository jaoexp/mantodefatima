import React, {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';
import type {PerspectiveCamera} from 'three';
import {cameraNoFrame} from '../camera';

/** Posiciona a camera padrao do canvas a partir do roteiro de camera. */
export const CameraRig: React.FC<{frame: number}> = ({frame}) => {
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const c = cameraNoFrame(frame);

	useLayoutEffect(() => {
		camera.position.set(...c.pos);
		camera.near = 0.1;
		camera.far = 260;
		camera.fov = c.fov;
		camera.lookAt(...c.alvo);
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();
	});

	return null;
};
