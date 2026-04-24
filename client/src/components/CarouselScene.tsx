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

    // Final state: edge-on center with card wings
    const centerX = (N - 1) / 2;

    tl.to(
      pageGroups.map(g => g.position),
      {
        x: (i: number) => (i - centerX) * 0.25, // Very tight horizontal spacing
        z: (i: number) => Math.abs(i - centerX) * 0.5, // Pushes outer cards back
        stagger: { amount: 0.8 },
        ease: "power2.inOut",
      },
      "final"
    );

    tl.to(
      pageGroups.map(g => g.rotation),
      {
        x: 0,
        y: (i: number) => {
            const diff = i - centerX;
            // The "Edge-on" effect: 
            // Cards on left of center: ~1.5 radians (90 deg)
            // Cards on right of center: ~-1.5 radians (-90 deg)
            // Adjust the 0.15 multiplier to control how much the wings face the user
            return diff > 0 ? -1.5 + (diff * 0.15) : 1.5 + (diff * 0.15);
        },
        z: 0,
        stagger: { amount: 0.8 },
        ease: "power2.inOut",
        onComplete: () => setIsCarouselMode(true)
      },
      "final"
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

  // Update carousel positions with swapping edge-on effect
  useFrame(() => {
    if (!isCarouselMode || !pageGroupsRef.current) return;

    const N = pageGroupsRef.current.length;
    const centerX = (N - 1) / 2;

    pageGroupsRef.current.forEach((group, i) => {
      // 1. Calculate relative position including scroll
      const relX = (i - centerX) + (scrollXRef.current * 1.5); // Adjust 1.5 for scroll speed

      // 2. Position: Tight horizontal strip with a slight curve in Z
      group.position.x = relX * 0.35; 
      group.position.z = Math.abs(relX) * 0.4;

      // 3. Rotation: The "Swapping" motion
      // As relX passes 0, the card "flips" its edge orientation
      const baseRotation = relX > 0 ? -1.5 : 1.5;
      
      // This adds the "facing the viewer" tilt as they move to the sides
      const tiltTowardViewer = relX * 0.12; 
      
      group.rotation.y = baseRotation + tiltTowardViewer;

      // Optional: Add a slight "breathing" or tilt to X/Z for organic feel
      group.rotation.x = Math.sin(Date.now() * 0.001 + i) * 0.02;
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
