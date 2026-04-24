import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

const BRANDS = [
  { name:"7up", file:"7up.png" },
  { name:"Haldirams", file:"Haldirams.png" },
  { name:"aachi", file:"aachi.png" },
  { name:"aashirvaad", file:"aashirvaad.png" },
  { name:"addme", file:"addme.png" },
  { name:"ajmi", file:"ajmi.png" },
  { name:"balaji", file:"balaji.png" },
  { name:"bingo", file:"bingo.png" },
  { name:"brahmins", file:"brahmins.png" },
  { name:"britannia", file:"britannia.png" },
  { name:"burgerking", file:"burgerking.png" },
  { name:"cadbury", file:"cadbury.png" },
  { name:"caldera", file:"caldera.png" },
  { name:"campacola", file:"campacola.png" },
  { name:"cerelac", file:"cerelac.png" },
  { name:"chings", file:"chings.png" },
  { name:"cocacola", file:"cocacola.png" },
  { name:"crax", file:"crax.png" },
  { name:"dominos", file:"dominos.png" },
  { name:"eastern", file:"eastern.png" },
  { name:"everest", file:"everest.png" },
  { name:"farmley", file:"farmley.png" },
  { name:"fortune", file:"fortune.png" },
  { name:"ganesh", file:"ganesh.png" },
  { name:"gippi", file:"gippi.png" },
  { name:"gocheese", file:"gocheese.png" },
  { name:"gowardhan", file:"gowardhan.png" },
  { name:"granamma", file:"granamma.png" },
  { name:"havmor", file:"havmor.png" },
  { name:"horlicks", file:"horlicks.png" },
  { name:"indiagate", file:"indiagate.png" },
  { name:"indomie", file:"indomie.png" },
  { name:"jolliz", file:"jolliz.png" },
  { name:"kemchho", file:"kemchho.png" },
  { name:"keventers", file:"keventers.png" },
  { name:"kfc", file:"kfc.png" },
  { name:"kivo", file:"kivo.png" },
  { name:"kp", file:"kp.png" },
  { name:"lays", file:"lays.png" },
  { name:"licious", file:"licious.png" },
  { name:"maggi", file:"maggi.png" },
  { name:"mcdonalds", file:"mcdonalds.png" },
  { name:"milkmaid", file:"milkmaid.png" },
  { name:"mimo", file:"mimo.png" },
  { name:"mirinda", file:"mirinda.png" },
  { name:"motherdairy", file:"motherdairy.png" },
  { name:"mtr", file:"mtr.png" },
  { name:"munch", file:"munch.png" },
  { name:"nescafe", file:"nescafe.png" },
  { name:"nic", file:"nic.png" },
  { name:"nilons", file:"nilons.png" },
  { name:"nissin", file:"nissin.png" },
  { name:"organictatva", file:"organictatva.png" },
  { name:"papajohns", file:"papajohns.png" },
  { name:"pepsi", file:"pepsi.png" },
  { name:"pizzahut", file:"pizzahut.png" },
  { name:"prabhuji", file:"prabhuji.png" },
  { name:"realbites", file:"realbites.png" },
  { name:"reliance", file:"reliance.png" },
  { name:"saffola", file:"saffola.png" },
  { name:"savai", file:"savai.png" },
  { name:"shan", file:"shan.png" },
  { name:"shana", file:"shana.png" },
  { name:"silvercoin", file:"silvercoin.png" },
  { name:"slice", file:"slice.png" },
  { name:"snacksbeyond", file:"snacksbeyond.png" },
  { name:"subway", file:"subway.png" },
  { name:"sunderfarsan", file:"sunderfarsan.png" },
  { name:"sunfeast", file:"sunfeast.png" },
  { name:"superyou", file:"superyou.png" },
  { name:"suruchi", file:"suruchi.png" },
  { name:"tacobell", file:"tacobell.png" },
  { name:"talod", file:"talod.png" },
  { name:"threemango", file:"threemango.png" },
  { name:"topramen", file:"topramen.png" },
  { name:"tuc", file:"tuc.png" },
  { name:"veeba", file:"veeba.png" },
  { name:"yippee", file:"yippee.png" },
  { name:"zeeba", file:"zeeba.png" },
];

const N = BRANDS.length;
const CARD_W = 1.2;
const CARD_H = 1.7;
const CARD_T = 0.015;

function SceneController() {
  const { scene, camera } = useThree();
  const fanContainerRef = useRef<THREE.Group>(null);
  const pageGroupsRef = useRef<THREE.Group[]>([]);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const scrollX = useRef(0);
  const targetScrollX = useRef(0);

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

    // Run animation timeline - simple intro to blade effect
    const tl = gsap.timeline();
    const centerIdx = (N - 1) / 2;

    // Phase 1: Reveal all cards in blade layout
    tl.to(
      pageGroups,
      {
        x: function(index: number) { return (index - centerIdx) * 0.35; },
        y: 0,
        z: 0,
        opacity: 1,
        rotationX: 0,
        rotationY: function(index: number) {
          const rel = index - centerIdx;
          const angle = 0.7 + (0.87 * Math.exp(-Math.abs(rel) * 0.5));
          return rel > 0 ? -angle : angle;
        },
        rotationZ: 0,
        duration: 1.5,
        stagger: 0.01,
        ease: "power2.inOut",
        onComplete: () => setIsCarouselMode(true)
      }
    );
  }, [scene, camera]);

  // Handle carousel scrolling with wheel and drag
  useEffect(() => {
    if (!isCarouselMode) return;

    const handleWheel = (e: WheelEvent) => {
      // Standardize horizontal scroll
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      targetScrollX.current -= delta * 0.001; // Adjust sensitivity
    };

    // Add drag support
    let isDragging = false;
    let startX = 0;
    const handleDown = (e: PointerEvent) => { isDragging = true; startX = e.clientX; };
    const handleMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      targetScrollX.current += dx * 0.005;
      startX = e.clientX;
    };
    const handleUp = () => { isDragging = false; };

    window.addEventListener('wheel', handleWheel);
    window.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isCarouselMode]);

  // Update carousel positions with blade effect
  useFrame((state) => {
    if (!isCarouselMode || !pageGroupsRef.current) return;

    // 1. Smoothly interpolate scroll
    scrollX.current += (targetScrollX.current - scrollX.current) * 0.1;

    const N = pageGroupsRef.current.length;
    const centerX = (N - 1) / 2;

    pageGroupsRef.current.forEach((group, i) => {
      // Calculate distance from viewport center
      // relX = 0 means the card is perfectly in the middle
      const relX = (i - centerX) + scrollX.current;

      // --- POSITION (Straight Horizontal Line) ---
      group.position.x = relX * 0.35; // Tightly packed blades
      group.position.z = 0; // Keep them on a flat line
      group.position.y = 0;

      // --- ROTATION (The Blade Effect) ---
      const dist = Math.abs(relX);
      
      // We want 90 degrees (1.57 rad) at center, 40 degrees (0.7 rad) at edges
      // We use an exponential decay so the "unfolding" happens smoothly
      const baseAngle = 0.7; // The "Outer State" (approx 40 degrees)
      const centerBonus = 0.87 * Math.exp(-dist * 0.5); // Adds extra rotation in the center
      const finalAngle = baseAngle + centerBonus;

      // Apply the rotation (Left cards face right, Right cards face left)
      group.rotation.y = relX > 0 ? -finalAngle : finalAngle;

      // --- THE SWAYING MOTION ---
      // A: Sway based on movement speed (tilts the blades as you drag)
      const velocity = (targetScrollX.current - scrollX.current);
      const movementSway = velocity * 1.5;
      
      // B: Passive swaying (organic breathing)
      const passiveSway = Math.sin(state.clock.elapsedTime * 1.5 + i * 0.5) * 0.03;
      
      group.rotation.z = movementSway + passiveSway;
      
      // Slight X-axis tilt for perspective
      group.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.02;
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
