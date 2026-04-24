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
  const scrollXRef = useRef(0);
  const targetScrollXRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const isDraggingRef = useRef(false);

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

    // Final shelf arrangement - cards arranged like book spines with gaps
    // Cards stay flat (z rotation = 0) but are positioned with gaps so you can see between them
    tl.to(
      pageGroups.map(g => g.rotation),
      {
        x: 0,
        y: 0,
        z: 0,
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

    // Spring physics: stiffness 0.055, damping 0.80 → damping ratio ≈ 0.34 (underdamped → overshoot)
    scrollVelocityRef.current += (targetScrollXRef.current - scrollXRef.current) * 0.055;
    scrollVelocityRef.current *= 0.80;
    scrollXRef.current += scrollVelocityRef.current;

    const vel  = scrollVelocityRef.current;
    const GAP  = 0.5;
    // World-space half-width where the 90°→0° mapping saturates (matches approx viewport edge)
    const MAX_R = 4.5;
    const t = Date.now() * 0.001;

    pageGroupsRef.current.forEach((grp, i) => {
      const basePos = (i - (N - 1) / 2) * GAP;
      const x = basePos + scrollXRef.current;
      grp.position.x = x;

      // Centre = spine (90°), edges = face-on (0°)
      const norm  = Math.max(-1, Math.min(1, x / MAX_R));
      grp.rotation.y = (1 - Math.abs(norm)) * (Math.PI / 2);

      // Lean: all cards tilt slightly in the direction of travel
      const lean = -vel * 0.06;
      // Float: each card sways at its own phase, amplitude scales with scroll speed
      const float = Math.sin(i * 0.65 + t * 1.8) * Math.min(0.05, Math.abs(vel) * 0.35);
      grp.rotation.z = lean + float;

      // Z-bob: subtle depth oscillation while scrolling
      grp.position.z = Math.sin(i * 0.5 + t * 1.5) * Math.min(0.035, Math.abs(vel) * 0.25);
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
