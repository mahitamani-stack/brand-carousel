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

function SceneController() {
  const { scene, camera } = useThree();
  const fanContainerRef = useRef<THREE.Group>(null);
  const pageGroupsRef = useRef<THREE.Group[]>([]);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const targetScroll = useRef(0);
  const currentScroll = useRef(0);

  useEffect(() => {
    const fanContainer = new THREE.Group();
    fanContainer.position.set(0, 0, 0);
    scene.add(fanContainer);
    fanContainerRef.current = fanContainer;

    const pageGroups: THREE.Group[] = [];

    // Canvas texture: white bg + logo scaled to fill card width
    const makeCardTextures = (url: string): [THREE.CanvasTexture, THREE.CanvasTexture] => {
      const PX_W = 512;
      const PX_H = Math.round(PX_W * (CARD_H / CARD_W)); // ≈ 725

      const makeFace = () => {
        const canvas = document.createElement('canvas');
        canvas.width = PX_W;
        canvas.height = PX_H;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PX_W, PX_H);
        return { canvas, ctx, tex: new THREE.CanvasTexture(canvas) };
      };

      const front = makeFace();
      const back  = makeFace();
      // Canvas textures must be tagged sRGB or Three.js linearises them → washed out
      front.tex.colorSpace = THREE.SRGBColorSpace;
      back.tex.colorSpace  = THREE.SRGBColorSpace;

      const img = new Image();
      img.onload = () => {
        // Scale logo to fill full card width; letterbox vertically on white
        const scale = PX_W / img.naturalWidth;
        const dh    = img.naturalHeight * scale;
        const dy    = (PX_H - dh) / 2;

        front.ctx.fillStyle = '#ffffff';
        front.ctx.fillRect(0, 0, PX_W, PX_H);
        front.ctx.drawImage(img, 0, dy, PX_W, dh);
        front.tex.needsUpdate = true;

        // Back face: mirror horizontally so it reads correctly when viewed from behind
        back.ctx.fillStyle = '#ffffff';
        back.ctx.fillRect(0, 0, PX_W, PX_H);
        back.ctx.save();
        back.ctx.translate(PX_W, 0);
        back.ctx.scale(-1, 1);
        back.ctx.drawImage(img, 0, dy, PX_W, dh);
        back.ctx.restore();
        back.tex.needsUpdate = true;
      };
      img.src = url;

      return [front.tex, back.tex];
    };

    // Create page groups with meshes
    for (let i = 0; i < N; i++) {
      const brand = BRANDS[i];
      const [frontTex, backTex] = makeCardTextures(`/logos/${brand.file}`);

      // Front face (+Z) — MeshBasicMaterial so it's never black regardless of lighting
      const frontMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshBasicMaterial({ map: frontTex })
      );
      frontMesh.position.z = CARD_T / 2 + 0.001;

      // Back face (-Z) — rotated π on Y so it faces away from camera
      const backMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CARD_W, CARD_H),
        new THREE.MeshBasicMaterial({ map: backTex })
      );
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -(CARD_T / 2 + 0.001);

      // Thin card body (visible on edges during spin)
      const edgeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T),
        new THREE.MeshBasicMaterial({ color: 0xf0ebe0 })
      );

      // Inner group offset so the LEFT edge sits at the pivot point (for fan rotation)
      const inner = new THREE.Group();
      inner.position.x = CARD_W / 2;
      inner.add(frontMesh, backMesh, edgeMesh);

      // Outer group — this is what the animation drives.
      // All cards share z≈0 so the fan pivots from one common Z plane.
      // A tiny unique offset prevents z-fighting while keeping them visually flush.
      const grp = new THREE.Group();
      grp.position.z = -i * 0.001;
      grp.add(inner);
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

    // Final state: edge-on center with card wings
    const centerX = (N - 1) / 2;

    tl.to(pageGroups.map(g => g.position), {
      x: (i) => (i - centerX) * 0.45,
      z: (i) => Math.abs(i - centerX) * 0.2,
      stagger: 0.05,
      ease: "expo.out"
    }, "final");

    tl.to(pageGroups.map(g => g.rotation), {
      y: (i) => {
        const rel = (i - centerX);
        return (rel * -0.6) + (rel > 0 ? -0.8 : 0.8);
      },
      x: 0,
      z: 0,
      stagger: 0.05,
      ease: "expo.out",
      onComplete: () => setIsCarouselMode(true)
    }, "final");
  }, [scene, camera]);

  // Handle carousel scrolling with wheel listener
  useEffect(() => {
    if (!isCarouselMode) return;

    const handleWheel = (e: WheelEvent) => {
      targetScroll.current += e.deltaY * 0.002; // Adjust sensitivity
    };
    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isCarouselMode]);

  // Update carousel positions with sway and interaction
  useFrame((state, delta) => {
    if (!isCarouselMode || !pageGroupsRef.current) return;

    // 1. Smoothly interpolate the scroll (Lerp)
    currentScroll.current += (targetScroll.current - currentScroll.current) * 0.1;

    const N = pageGroupsRef.current.length;
    const centerX = (N - 1) / 2;

    pageGroupsRef.current.forEach((group, i) => {
      // Calculate position relative to the center, including the scroll
      const relativePos = (i - centerX) + currentScroll.current;

      // --- POSITION ---
      // Horizontal spread
      group.position.x = relativePos * 0.45; 
      // Slight V-curve depth (keeps edges further or closer)
      group.position.z = Math.abs(relativePos) * 0.2;

      // --- ROTATION (The Sideways Look) ---
      // The multiplier 0.6 ensures that at the center (0), rotation is high.
      // As relativePos increases, rotation decreases, showing the face.
      const baseRotation = relativePos * -0.6; 
      
      // To get that "edge-on" look in the center:
      // We add a constant offset so the middle is ~90 degrees (1.57 rad)
      group.rotation.y = baseRotation + (relativePos > 0 ? -0.8 : 0.8);

      // --- THE SWAYING MOTION ---
      // We use the scroll velocity to tilt the cards on the Z axis
      const velocity = (targetScroll.current - currentScroll.current);
      group.rotation.z = velocity * 2.0 + (Math.sin(state.clock.elapsedTime + i) * 0.05);
      
      // Subtle X-axis tilt based on position for a "weighted" feel
      group.rotation.x = Math.abs(relativePos) * 0.05;
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
