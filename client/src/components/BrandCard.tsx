import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group } from 'three';
import * as THREE from 'three';

interface BrandCardProps {
  brand: { name: string; file: string; color: string };
  index: number;
  total: number;
  isAnimating: boolean;
  scrollX?: number;
}

export function BrandCard({ brand, index, total, isAnimating, scrollX = 0 }: BrandCardProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  const CARD_W = 1.5;
  const CARD_H = 2.1;
  const CARD_T = 0.02;

  // Create canvas texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 840;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 840);

    // Color accent
    ctx.fillStyle = brand.color;
    ctx.fillRect(0, 0, 600, 30);

    // Brand name
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '300 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(brand.name.toUpperCase(), 300, 810);

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = true;
    return tex;
  }, [brand]);

  useFrame(() => {
    if (!groupRef.current || isAnimating) return;

    const GAP = 0.85;
    const basePos = (index - (total - 1) / 2) * GAP;
    const currentPos = basePos + scrollX;

    groupRef.current.position.x = currentPos;
    groupRef.current.rotation.y = (currentPos / 5) * -1.2;
    groupRef.current.position.z = -Math.abs(currentPos / 5) * 2;
  });

  return (
    <group ref={groupRef} position={[(index - (total - 1) / 2) * 0.85, 0, (total - index) * 0.02]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[CARD_W, CARD_H, CARD_T]} />
        <meshStandardMaterial map={texture} transparent opacity={1} />
      </mesh>
    </group>
  );
}
