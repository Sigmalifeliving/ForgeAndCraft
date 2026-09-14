import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';

function PlaceholderBox({ wireframe }) {
  return (
    <mesh rotation={[0, Math.PI / 4, 0]}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color="#7c3aed"
        roughness={0.35}
        metalness={0.15}
        wireframe={wireframe}
      />
    </mesh>
  );
}

function LoadedModel({ url, wireframe, onStats }) {
  const { scene } = useGLTF(url);

  const { modelGroup, stats } = useMemo(() => {
    const clone = scene.clone(true);
    let vertices = 0;
    let faces = 0;

    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = obj.material.clone();
        obj.material.wireframe = wireframe;

        // Ensure vertex colors render correctly for TripoSR meshes
        if (obj.geometry?.attributes?.color) {
          obj.material.vertexColors = true;
        }
        obj.material.roughness = 0.6;
        obj.material.metalness = 0.15;
        obj.material.needsUpdate = true;

        if (obj.geometry) {
          const pos = obj.geometry.attributes.position;
          if (pos) vertices += pos.count;
          if (obj.geometry.index) {
            faces += obj.geometry.index.count / 3;
          } else if (pos) {
            faces += pos.count / 3;
          }
        }
      }
    });

    // Compute bounding box and center precisely at origin (0, 0, 0)
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 2.0 / maxDim;

    // Center geometry exactly at (0, 0, 0) so camera orbit is centered
    clone.scale.setScalar(targetScale);
    clone.position.set(
      -center.x * targetScale,
      -center.y * targetScale,
      -center.z * targetScale
    );

    const group = new THREE.Group();
    group.add(clone);

    return {
      modelGroup: <primitive object={group} />,
      stats: {
        vertices,
        faces: Math.round(faces),
        sizeY: size.y * targetScale,
      },
    };
  }, [scene, wireframe]);

  useEffect(() => {
    if (onStats && stats) {
      onStats(stats);
    }
  }, [stats, onStats]);

  return modelGroup;
}

function Scene({
  url,
  wireframe,
  lighting,
  grid,
  autoRotate,
  resetSignal,
  onStats,
}) {
  const controlsRef = useRef();

  useEffect(() => {
    if (controlsRef.current && resetSignal > 0) {
      controlsRef.current.reset();
    }
  }, [resetSignal]);

  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault position={[0, 1.2, 3.2]} fov={45} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={2.5}
        target={[0, 0, 0]}
        minDistance={0.8}
        maxDistance={15}
      />

      {/* Vibrant Studio 3-Point Lighting for Stylized/Game Assets */}
      <ambientLight intensity={lighting ? 0.8 : 0.15} />
      <directionalLight
        position={[4, 6, 5]}
        intensity={lighting ? 1.3 : 0.25}
      />
      <directionalLight
        position={[-4, 3, -3]}
        intensity={lighting ? 0.6 : 0.1}
      />
      <directionalLight
        position={[0, 4, -5]}
        intensity={lighting ? 0.8 : 0.1}
      />

      <Suspense fallback={<PlaceholderBox wireframe={wireframe} />}>
        {url ? (
          <LoadedModel url={url} wireframe={wireframe} onStats={onStats} />
        ) : (
          <PlaceholderBox wireframe={wireframe} />
        )}
      </Suspense>

      {grid && (
        <Grid
          args={[20, 20]}
          position={[0, -1.05, 0]}
          cellSize={0.5}
          cellColor="#3b3b54"
          sectionSize={2}
          sectionColor="#242438"
          fadeDistance={18}
          infiniteGrid
        />
      )}
    </Canvas>
  );
}

export default function ModelViewer({
  url = null,
  wireframe = false,
  grid = true,
  lighting = true,
  autoRotate = false,
  resetSignal = 0,
  onStats = null,
}) {
  return (
    <div className="model-viewer">
      <Scene
        url={url}
        wireframe={wireframe}
        grid={grid}
        lighting={lighting}
        autoRotate={autoRotate}
        resetSignal={resetSignal}
        onStats={onStats}
      />
    </div>
  );
}