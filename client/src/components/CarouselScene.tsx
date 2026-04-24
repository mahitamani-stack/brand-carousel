import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

const BRANDS = [
  { name:"McDonald's",    file:"mcdonalds.png" },
  { name:"KFC",           file:"kfc.png" },
  { name:"Domino's",      file:"dominos.png" },
  { name:"Pizza Hut",     file:"pizzahut.png" },
  { name:"Burger King",   file:"burgerking.png" },
  { name:"Taco Bell",     file:"tacobell.png" },
  { name:"Subway",        file:"subway.png" },
  { name:"Papa John's",   file:"papajohns.png" },
  { name:"Maggi",         file:"maggi.png" },
  { name:"Yippee",        file:"yippee.png" },
  { name:"Ching's",       file:"chings.png" },
  { name:"Indomie",       file:"indomie.png" },
  { name:"Nissin",        file:"nissin.png" },
  { name:"GIPPI",         file:"gippi.png" },
  { name:"Top Ramen",     file:"topramen.png" },
  { name:"Bingo!",        file:"bingo.png" },
  { name:"Lay's",         file:"lays.png" },
  { name:"Haldiram's",    file:"Haldirams.png" },
  { name:"CRAX",          file:"crax.png" },
  { name:"Balaji",        file:"balaji.png" },
];

const N = 20;
const CARD_W = 1.2;
const CARD_H = 1.7;
const CARD_T = 0.015;

// Cloudinary base URL
const CLOUDINARY_URL = 'https://res.cloudinary.com/c-a0a9fcac13d1a2f0381cf7eefc5fa8/image/upload/v1/logos/';

async function loadTexture(filename: string): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    const textureLoader = new THREE.TextureLoader();
    const url = `${CLOUDINARY_URL}${filename}`;
    textureLoader.load(url, (texture) => {
      texture.flipY = true;
      resolve(texture);
    }, undefined, () => {
      // Fallback: white texture if load fails
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 840;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 840);
      const fallbackTex = new THREE.CanvasTexture(canvas);
      fallbackTex.flipY = true;
      resolve(fallbackTex);
    });
  });
}

function SceneController() {
  const { scene, camera } = useThree();
  const fanContainerRef = useRef<THREE.Group>(null);
  const pageGroupsRef = useRef<THREE.Group[]>([]);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const scrollXRef = useRef(0);
  const targetScrollXRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const fanContainer = new THREE.Group();
    fanContainer.position.set(0, 0, 0);
    scene.add(fanContainer);
    fanContainerRef.current = fanContainer;

    const pageGroups: THREE.Group[] = [];
    const texturePromises: Promise<THREE.Texture>[] = [];

    // Pre-load all textures
    for (let i = 0; i < N; i++) {
      const brand = BRANDS[i];
      texturePromises.push(loadTexture(brand.file));
    }

    Promise.all(texturePromises).then((textures) => {
      // Create page groups with meshes
      for (let i = 0; i < N; i++) {
        const texture = textures[i];

        // Create materials - double-sided
        const frontMat = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          opacity: 1,
          side: THREE.FrontSide,
        });
        const backMat = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          opacity: 1,
          side: THREE.BackSide,
        });
        const sideMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 1,
        });

        // Create geometry and mesh
        const geometry = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T);
        const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
        const mesh = new THREE.Mesh(geometry, materials);
        mesh.position.x = CARD_W / 2;

        // Create group with proper pivot
        const grp = new THREE.Group();
        grp.position.z = (N - i) * 0.02;
        grp.add(mesh);
        fanContainer.add(grp);

        pageGroups.push(grp);
      }

      pageGroupsRef.current = pageGroups;

      // Run animation timeline
      const tl = gsap.timeline();
      const cameraState = { y: 0.15, z: 5.8 };

      // Phase 1: Reveal all cards
      tl.to(pageGroups.map(g => g), { opacity: 1, duration: 0.6, stagger: 0.02 });

      // Phase 2: Fan open (rotate around Y-axis)
      tl.to(
        pageGroups.map(g => g.rotation),
        {
          y: (i: number) => -(i / (N - 1)) * Math.PI * 0.85,
          duration: 1.5,
          ease: "back.out(1.5)",
          stagger: 0.05,
        },
        "<"
      );

      // Phase 3: Camera moves up to 45-degree angle during spin
      tl.to(
        cameraState,
        {
          y: 2.2,
          z: 3.8,
          duration: 3.5,
          ease: "power2.inOut",
          onUpdate: () => {
            camera.position.y = cameraState.y;
            camera.position.z = cameraState.z;
            camera.lookAt(0, 0, 0);
          },
        },
        "<"
      );

      // Spin around Y-axis
      tl.to(
        fanContainer.rotation,
        {
          y: Math.PI * 4,
          duration: 3.5,
          ease: "linear",
        },
        "<"
      );

      // Phase 4: Camera returns to center
      tl.to(
        cameraState,
        {
          y: 0.15,
          z: 5.8,
          duration: 1.2,
          ease: "power2.inOut",
          onUpdate: () => {
            camera.position.y = cameraState.y;
            camera.position.z = cameraState.z;
            camera.lookAt(0, 0, 0);
          },
        }
      );

      // Collapse and unroll into horizontal strip
      tl.to(
        pageGroups.map(g => g.rotation),
        {
          y: 0,
          z: 0,
          duration: 1.0,
          stagger: { each: 0.02, from: 'end' },
          ease: "power2.inOut",
        },
        "<"
      );

      const GAP = 0.5;
      tl.to(
        pageGroups.map(g => g.position),
        {
          x: (i: number) => (i - (N - 1) / 2) * GAP,
          z: 0,
          duration: 1.0,
          stagger: { each: 0.02, from: 'center' },
          ease: "power3.inOut",
        },
        "<"
      );

      // Final shelf angle - cards rotated 90 degrees to face sideways (like book spines)
      tl.to(
        pageGroups.map(g => g.rotation),
        {
          y: (i: number) => {
            const n = (i - (N - 1) / 2) / (N / 2);
            return Math.PI / 2 + n * 0.3; // 90 degrees + slight variation
          },
          z: 0,
          duration: 1.0,
          stagger: { each: 0.02, from: 'center' },
          ease: "power3.out",
          onComplete: () => setIsCarouselMode(true),
        },
        "<"
      );
    });
  }, [scene, camera]);

  // Handle carousel scrolling
  useEffect(() => {
    if (!isCarouselMode) return;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      const startX = e.pageX;
      const startScrollX = targetScrollXRef.current;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const dx = (e.pageX - startX) * 0.015;
        targetScrollXRef.current = startScrollX - dx;
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [isCarouselMode]);

  // Update carousel positions
  useFrame(() => {
    if (!isCarouselMode || !pageGroupsRef.current) return;

    scrollXRef.current += (targetScrollXRef.current - scrollXRef.current) * 0.12;

    const GAP = 0.5;
    pageGroupsRef.current.forEach((grp, i) => {
      const basePos = (i - (N - 1) / 2) * GAP;
      const currentPos = basePos + scrollXRef.current;

      grp.position.x = currentPos;
      
      // Maintain sideways orientation with slight variation
      const n = currentPos / 6;
      grp.rotation.y = Math.PI / 2 + n * 0.3;
      grp.position.z = -Math.abs(n) * 1.5;
    });
  });

  return null;
}

export function CarouselScene() {
  return (
    <Canvas style={{ width: '100%', height: '100vh' }}>
      <PerspectiveCamera position={[0, 0.15, 5.8]} fov={42} makeDefault />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <SceneController />
    </Canvas>
  );
}
