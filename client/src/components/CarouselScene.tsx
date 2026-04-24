import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

const BRANDS = [
  { name:"McDonald's",    file:"mcdonalds.png",    color:"#FFC72C" },
  { name:"KFC",           file:"kfc.png",           color:"#E4002B" },
  { name:"Domino's",      file:"dominos.png",       color:"#006491" },
  { name:"Pizza Hut",     file:"pizzahut.png",      color:"#EE3124" },
  { name:"Burger King",   file:"burgerking.png",    color:"#F5A623" },
  { name:"Taco Bell",     file:"tacobell.png",      color:"#702082" },
  { name:"Subway",        file:"subway.png",        color:"#009B48" },
  { name:"Papa John's",   file:"papajohns.png",     color:"#004B87" },
  { name:"Maggi",         file:"maggi.png",         color:"#CC0000" },
  { name:"Yippee",        file:"yippee.png",        color:"#E63329" },
  { name:"Ching's",       file:"chings.png",        color:"#D4232A" },
  { name:"Indomie",       file:"indomie.png",       color:"#E31837" },
  { name:"Nissin",        file:"nissin.png",        color:"#CC0000" },
  { name:"GIPPI",         file:"gippi.png",         color:"#F47920" },
  { name:"Top Ramen",     file:"topramen.png",      color:"#E63329" },
  { name:"Bingo!",        file:"bingo.png",         color:"#FF6B35" },
  { name:"Lay's",         file:"lays.png",          color:"#E8CD00" },
  { name:"Haldiram's",    file:"Haldirams.png",     color:"#C8860A" },
  { name:"CRAX",          file:"crax.png",          color:"#E63329" },
  { name:"Balaji",        file:"balaji.png",        color:"#E31837" },
];

const N = 20;
const CARD_W = 1.2; // Scaled down
const CARD_H = 1.7; // Scaled down
const CARD_T = 0.015; // Scaled down

function buildTexture(brand: typeof BRANDS[0]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 840;
  const ctx = canvas.getContext('2d')!;

  // Pure white background (no colored bars, no text)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 600, 840);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = true;
  return tex;
}

function SceneController() {
  const { scene, camera } = useThree();
  const fanContainerRef = useRef<THREE.Group>(null);
  const pageGroupsRef = useRef<THREE.Group[]>([]);
  const pageMatRef = useRef<THREE.Material[]>([]);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const scrollXRef = useRef(0);
  const targetScrollXRef = useRef(0);

  useEffect(() => {
    // Create fan container
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

      // Create materials
      const frontMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.FrontSide,
      });
      const backMat = new THREE.MeshStandardMaterial({
        map: texture,
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
      mesh.position.x = CARD_W / 2;

      // Create group with proper pivot
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
    const cameraState = { y: 0.15, z: 5.8 };

    // Phase 1: Reveal first card only
    tl.to(pageMats[0], { opacity: 1, duration: 0.5 });

    // Phase 2: Fan open (rotate around Y-axis)
    tl.to(
      pageGroups.map(g => g.rotation),
      {
        y: (i: number) => -(i / (N - 1)) * Math.PI * 0.85,
        duration: 1.5,
        ease: "back.out(1.5)",
        stagger: 0.05,
      },
      "+=0.2"
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
      "+=0.1"
    );

    // Spin around Y-axis (not X)
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
        duration: 1.0,
        stagger: { each: 0.02, from: 'end' },
        ease: "power2.inOut",
      },
      "<"
    );

    const GAP = 0.5; // Smaller spacing for scaled-down carousel
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

    // Final shelf angle
    tl.to(
      pageGroups.map(g => g.rotation),
      {
        y: (i: number) => {
          const n = (i - (N - 1) / 2) / (N / 2);
          return n * -0.8;
        },
        duration: 1.0,
        stagger: { each: 0.02, from: 'center' },
        ease: "power3.out",
        onComplete: () => setIsCarouselMode(true),
      },
      "<"
    );
  }, [scene, camera]);

  // Handle carousel scrolling
  useEffect(() => {
    if (!isCarouselMode) return;

    const handleMouseDown = (e: MouseEvent) => {
      const startX = e.pageX;
      const startScrollX = targetScrollXRef.current;

      const handleMouseMove = (e: MouseEvent) => {
        const dx = (e.pageX - startX) * 0.01;
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

    scrollXRef.current += (targetScrollXRef.current - scrollXRef.current) * 0.1;

    const GAP = 0.5;
    pageGroupsRef.current.forEach((grp, i) => {
      const basePos = (i - (N - 1) / 2) * GAP;
      const currentPos = basePos + scrollXRef.current;

      grp.position.x = currentPos;
      const n = currentPos / 6;
      grp.rotation.y = n * -0.8;
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
