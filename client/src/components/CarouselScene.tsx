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
const CARD_W = 1.5;
const CARD_H = 2.1;
const CARD_T = 0.02;

function buildTexture(brand: typeof BRANDS[0]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 840;
  const ctx = canvas.getContext('2d')!;

  // Pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 600, 840);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = true;
  return tex;
}

function SceneController() {
  const { scene } = useThree();
  const fanContainerRef = useRef<THREE.Group>(null);
  const pageGroupsRef = useRef<THREE.Group[]>([]);
  const pageMatRef = useRef<THREE.Material[]>([]);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const scrollXRef = useRef(0);
  const targetScrollXRef = useRef(0);

  useEffect(() => {
    // Create fan container at center
    const fanContainer = new THREE.Group();
    fanContainer.position.set(0, 0, 0);
    scene.add(fanContainer);
    fanContainerRef.current = fanContainer;

    // Create page groups with meshes
    const pageGroups: THREE.Group[] = [];
    const pageMats: THREE.Material[] = [];

    for (let i = 0; i < N; i++) {
      const brand = BRANDS[i];
      const texture = buildTexture(brand);

      // Create materials - white cards only
      const frontMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.FrontSide,
      });
      const backMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
      });
      const sideMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      });

      // Create geometry and mesh
      const geometry = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T);
      const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
      const mesh = new THREE.Mesh(geometry, materials);
      // Pivot at left edge (spine)
      mesh.position.x = CARD_W / 2;

      // Create group with proper pivot at center
      const grp = new THREE.Group();
      grp.position.z = (N - i) * 0.02;
      grp.add(mesh);
      fanContainer.add(grp);

      pageGroups.push(grp);
      pageMats.push(frontMat, backMat, sideMat);
    }

    pageGroupsRef.current = pageGroups;
    pageMatRef.current = pageMats;

    // Run animation timeline
    const tl = gsap.timeline();

    // Phase 1: Reveal (fade in all cards)
    tl.to(pageMats, { opacity: 1, duration: 0.6, stagger: 0.02 });

    // Phase 2: Fan open from center (radial spread around Y-axis)
    tl.to(
      pageGroups.map(g => g.rotation),
      {
        y: (i: number) => (i / (N - 1) - 0.5) * Math.PI * 1.0, // Spread from -50° to +50°
        duration: 1.5,
        ease: "power2.inOut",
        stagger: 0.03,
      },
      "+=0.2"
    );

    // Phase 3: Spin the entire stack around Z-axis
    tl.to(
      fanContainer.rotation,
      {
        z: Math.PI * 3.5, // Full rotations
        duration: 3.2,
        ease: "linear",
      },
      "+=0.1"
    );

    // Phase 4: Burst transition to carousel (rapid 600-800ms)
    // Reset container rotation
    tl.to(
      fanContainer.rotation,
      { z: 0, duration: 0.7, ease: "power3.out" }
    );

    // Spread cards horizontally
    const GAP = 0.35; // Spacing: ~1/4 of card width
    tl.to(
      pageGroups.map(g => g.position),
      {
        x: (i: number) => (i - (N - 1) / 2) * GAP,
        z: 0,
        duration: 0.7,
        ease: "power3.out",
      },
      "<"
    );

    // Apply final 45-60 degree tilt based on position
    tl.to(
      pageGroups.map(g => g.rotation),
      {
        y: (i: number) => {
          const n = (i - (N - 1) / 2) / (N / 2);
          return n * (Math.PI / 3.2); // ~56 degrees at edges
        },
        duration: 0.7,
        ease: "power3.out",
        onComplete: () => setIsCarouselMode(true),
      },
      "<"
    );
  }, [scene]);

  // Handle carousel scrolling
  useEffect(() => {
    if (!isCarouselMode) return;

    const handleMouseDown = (e: MouseEvent) => {
      const startX = e.pageX;
      const startScrollX = targetScrollXRef.current;

      const handleMouseMove = (e: MouseEvent) => {
        const dx = (e.pageX - startX) * 0.008;
        targetScrollXRef.current = startScrollX + dx;
      };

      const handleMouseUp = () => {
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

    const GAP = 0.35;
    pageGroupsRef.current.forEach((grp, i) => {
      const basePos = (i - (N - 1) / 2) * GAP;
      const currentPos = basePos + scrollXRef.current;

      grp.position.x = currentPos;
      
      // Maintain 45-60 degree tilt based on position
      const n = currentPos / 7;
      grp.rotation.y = n * (Math.PI / 3.2);
    });
  });

  return null;
}

export function CarouselScene() {
  return (
    <Canvas style={{ width: '100%', height: '100vh' }}>
      {/* Camera: Fixed, centered, angled slightly downward (15-20 degrees) */}
      <PerspectiveCamera 
        position={[0, 0.6, 5.0]} 
        fov={48} 
        makeDefault 
        rotation={[-0.25, 0, 0]} // Slight downward angle
      />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <SceneController />
    </Canvas>
  );
}
