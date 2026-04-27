import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

const BRANDS = [
  { name:"7up",          file:"7up.png" },
  { name:"Haldirams",    file:"Haldirams.png" },
  { name:"aachi",        file:"aachi.png" },
  { name:"aashirvaad",   file:"aashirvaad.png" },
  { name:"addme",        file:"addme.png" },
  { name:"ajmi",         file:"ajmi.png" },
  { name:"balaji",       file:"balaji.png" },
  { name:"bingo",        file:"bingo.png" },
  { name:"brahmins",     file:"brahmins.png" },
  { name:"britannia",    file:"britannia.png" },
  { name:"burgerking",   file:"burgerking.png" },
  { name:"cadbury",      file:"cadbury.png" },
  { name:"caldera",      file:"caldera.png" },
  { name:"campacola",    file:"campacola.png" },
  { name:"cerelac",      file:"cerelac.png" },
  { name:"chings",       file:"chings.png" },
  { name:"cocacola",     file:"cocacola.png" },
  { name:"crax",         file:"crax.png" },
  { name:"dominos",      file:"dominos.png" },
  { name:"eastern",      file:"eastern.png" },
  { name:"everest",      file:"everest.png" },
  { name:"farmley",      file:"farmley.png" },
  { name:"fortune",      file:"fortune.png" },
  { name:"ganesh",       file:"ganesh.png" },
  { name:"gippi",        file:"gippi.png" },
  { name:"gocheese",     file:"gocheese.png" },
  { name:"gowardhan",    file:"gowardhan.png" },
  { name:"granamma",     file:"granamma.png" },
  { name:"havmor",       file:"havmor.png" },
  { name:"horlicks",     file:"horlicks.png" },
  { name:"indiagate",    file:"indiagate.png" },
  { name:"indomie",      file:"indomie.png" },
  { name:"jolliz",       file:"jolliz.png" },
  { name:"kemchho",      file:"kemchho.png" },
  { name:"keventers",    file:"keventers.png" },
  { name:"kfc",          file:"kfc.png" },
  { name:"kivo",         file:"kivo.png" },
  { name:"kp",           file:"kp.png" },
  { name:"lays",         file:"lays.png" },
  { name:"licious",      file:"licious.png" },
  { name:"maggi",        file:"maggi.png" },
  { name:"mcdonalds",    file:"mcdonalds.png" },
  { name:"milkmaid",     file:"milkmaid.png" },
  { name:"mimo",         file:"mimo.png" },
  { name:"mirinda",      file:"mirinda.png" },
  { name:"motherdairy",  file:"motherdairy.png" },
  { name:"mtr",          file:"mtr.png" },
  { name:"munch",        file:"munch.png" },
  { name:"nescafe",      file:"nescafe.png" },
  { name:"nic",          file:"nic.png" },
  { name:"nilons",       file:"nilons.png" },
  { name:"nissin",       file:"nissin.png" },
  { name:"organictatva", file:"organictatva.png" },
  { name:"papajohns",    file:"papajohns.png" },
  { name:"pepsi",        file:"pepsi.png" },
  { name:"pizzahut",     file:"pizzahut.png" },
  { name:"prabhuji",     file:"prabhuji.png" },
  { name:"realbites",    file:"realbites.png" },
  { name:"reliance",     file:"reliance.png" },
  { name:"saffola",      file:"saffola.png" },
  { name:"savai",        file:"savai.png" },
  { name:"shan",         file:"shan.png" },
  { name:"shana",        file:"shana.png" },
  { name:"silvercoin",   file:"silvercoin.png" },
  { name:"slice",        file:"slice.png" },
  { name:"snacksbeyond", file:"snacksbeyond.png" },
  { name:"subway",       file:"subway.png" },
  { name:"sunderfarsan", file:"sunderfarsan.png" },
  { name:"sunfeast",     file:"sunfeast.png" },
  { name:"superyou",     file:"superyou.png" },
  { name:"suruchi",      file:"suruchi.png" },
  { name:"tacobell",     file:"tacobell.png" },
  { name:"talod",        file:"talod.png" },
  { name:"threemango",   file:"threemango.png" },
  { name:"topramen",     file:"topramen.png" },
  { name:"tuc",          file:"tuc.png" },
  { name:"veeba",        file:"veeba.png" },
  { name:"yippee",       file:"yippee.png" },
  { name:"zeeba",        file:"zeeba.png" },
];

const N          = BRANDS.length;
const ANIM_CARDS = 20; // cards visible during fan animation; rest appear once stack collapses
const CARD_W = 1.0;
const CARD_H = 1.6;
const CARD_T = 0.015;
const GAP    = 0.55; // card-centre spacing in carousel

function SceneController() {
  const { scene, camera } = useThree();
  const fanContainerRef = useRef<THREE.Group>(null);
  const pageGroupsRef   = useRef<THREE.Group[]>([]);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const scrollX        = useRef(0);
  const targetScrollX  = useRef(0);
  const scrollVelocity = useRef(0);

  // ── Build scene + run fan animation ──────────────────────────────────────
  useEffect(() => {
    const fanContainer = new THREE.Group();
    scene.add(fanContainer);
    fanContainerRef.current = fanContainer;

    const pageGroups: THREE.Group[]              = [];
    const cardMats:   THREE.MeshBasicMaterial[][] = [];

    // Canvas texture — white bg, logo scaled to fill card width
    const makeCardTextures = (url: string): [THREE.CanvasTexture, THREE.CanvasTexture] => {
      const PX_W = 512;
      const PX_H = Math.round(PX_W * (CARD_H / CARD_W));

      const makeFace = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = PX_W;
        canvas.height = PX_H;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PX_W, PX_H);
        return { canvas, ctx, tex: new THREE.CanvasTexture(canvas) };
      };

      const front = makeFace();
      const back  = makeFace();
      front.tex.colorSpace = THREE.SRGBColorSpace;
      back.tex.colorSpace  = THREE.SRGBColorSpace;

      const img = new Image();
      img.onload = () => {
        const scale = PX_W / img.naturalWidth;
        const dh    = img.naturalHeight * scale;
        const dy    = (PX_H - dh) / 2;

        front.ctx.fillStyle = '#ffffff';
        front.ctx.fillRect(0, 0, PX_W, PX_H);
        front.ctx.drawImage(img, 0, dy, PX_W, dh);
        front.tex.needsUpdate = true;

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

    // Build card meshes — start opacity 0 so nothing is visible before Phase 1
    for (let i = 0; i < N; i++) {
      const [frontTex, backTex] = makeCardTextures(`/logos/${BRANDS[i].file}`);

      const frontMat = new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, opacity: 0 });
      const backMat  = new THREE.MeshBasicMaterial({ map: backTex,  transparent: true, opacity: 0 });
      const edgeMat  = new THREE.MeshBasicMaterial({ color: 0xf0ebe0, transparent: true, opacity: 0 });

      const frontMesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), frontMat);
      frontMesh.position.z = CARD_T / 2 + 0.001;

      const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), backMat);
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -(CARD_T / 2 + 0.001);

      const edgeMesh = new THREE.Mesh(new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T), edgeMat);

      // Inner group: LEFT edge at pivot (x=0 of grp) so fan rotates around spine
      const inner = new THREE.Group();
      inner.position.x = CARD_W / 2;
      inner.add(frontMesh, backMesh, edgeMesh);

      // Outer group: all share the same z≈0 plane so fan pivots from one point
      const grp = new THREE.Group();
      grp.position.z = -i * 0.001;
      grp.add(inner);
      fanContainer.add(grp);

      pageGroups.push(grp);
      cardMats.push([frontMat, backMat, edgeMat]);
    }

    pageGroupsRef.current = pageGroups;

    // ── GSAP timeline ─────────────────────────────────────────────────────
    const tl        = gsap.timeline({ delay: 0.5 });
    const centerIdx  = (N - 1) / 2;
    const camState   = { y: camera.position.y, z: camera.position.z };
    const updateCam  = () => {
      camera.position.y = camState.y;
      camera.position.z = camState.z;
      (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
    };

    // Phase 1 — first card fades in alone (0.9s)
    tl.to(cardMats[0], { opacity: 1, duration: 0.9, ease: 'power2.out' });

        // Phase 2 — fan opens + camera begins rising
    tl.to(
      cardMats.slice(1, ANIM_CARDS).flat(),
      { opacity: 1, duration: 0.5, stagger: 0.006, ease: 'power1.out' },
      '>'
    );
    tl.to(
      pageGroups.slice(0, ANIM_CARDS).map(g => g.rotation),
      {
        y: (i) => -(i / (ANIM_CARDS - 1)) * Math.PI * 0.85,
        duration: 1.8,
        stagger: 0.008,
        ease: 'back.out(1.2)',
      },
      '<'
    );
    tl.to(camState, { y: 1.0, z: 4.8, duration: 1.8, ease: 'power2.inOut', onUpdate: updateCam }, '<');

    // Phase 3 — fan spins; camera completes rise to top-down angle
    tl.to(camState, { y: 2.2, z: 3.8, duration: 3.5, ease: 'power2.inOut', onUpdate: updateCam });
    tl.to(fanContainer.rotation, { y: Math.PI * 4, duration: 3.5, ease: 'linear' }, '<');

    // Phase 4a — camera returns; dim cards during collapse to hide back-face logos
    tl.to(cardMats.flat(), { opacity: 0.1, duration: 0.4, ease: 'power2.out' });
    tl.to(camState, { y: 0.15, z: 5.8, duration: 1.4, ease: 'power2.inOut', onUpdate: updateCam }, '<');
    tl.to(
      pageGroups.slice(0, ANIM_CARDS).map(g => g.rotation),
      { y: 0, z: 0, duration: 1.0, stagger: { each: 0.008, from: 'end' }, ease: 'power2.inOut' },
      '<'
    );

    // Phase 4b — restore opacity; materialise any remaining cards
    tl.to(cardMats.flat(), { opacity: 1, duration: 0.4, ease: 'power2.out' }, '>-0.2');
    tl.to(
      cardMats.slice(ANIM_CARDS).flat(),
      { opacity: 1, duration: 0.3, ease: 'power2.out' },
      '<'
    );

    // Phase 4c — spread from stack sideways AND rotate into blade fan simultaneously
    tl.to(
      pageGroups.map(g => g.position),
      {
        x: (i) => (i - centerIdx) * GAP,
        z: 0,
        duration: 1.0,
        stagger: { each: 0.006, from: 'center' },
        ease: 'power3.inOut',
      },
      '>'
    );
    tl.to(
      pageGroups.map(g => g.rotation),
      {
        y: (i) => {
          const rel  = i - centerIdx;
          const dist = Math.abs(rel);
          const ang  = 0.45 + 1.12 * Math.exp(-dist * dist * 0.04);
          return rel >= 0 ? -ang : ang;
        },
        x: 0,
        z: 0,
        duration: 1.0,
        stagger: { each: 0.006, from: 'center' },
        ease: 'power3.out',
        onComplete: () => setIsCarouselMode(true),
      },
      '<'
    );

    return () => {
      tl.kill();
      scene.remove(fanContainer);
    };
  }, [scene, camera]);

  // ── Wheel + pointer drag listeners ───────────────────────────────────────
  useEffect(() => {
    if (!isCarouselMode) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const px  = e.deltaMode === 1 ? raw * 30 : raw; // DOM_DELTA_LINE → pixels
      targetScrollX.current += px * 0.004;
    };

    let dragging = false, lastX = 0;
    const onPointerDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      // += so drag direction matches natural "pull the deck" feel
      targetScrollX.current += (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
    };
    const onPointerUp = () => { dragging = false; };

    window.addEventListener('wheel',       onWheel,       { passive: false });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
    return () => {
      window.removeEventListener('wheel',       onWheel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup',   onPointerUp);
    };
  }, [isCarouselMode]);

  // ── Per-frame carousel update ─────────────────────────────────────────────
  useFrame(() => {
    if (!isCarouselMode || !pageGroupsRef.current) return;

    // Spring physics — underdamped so there is a slight overshoot on release
    scrollVelocity.current += (targetScrollX.current - scrollX.current) * 0.06;
    scrollVelocity.current *= 0.82;
    scrollX.current += scrollVelocity.current;

    const vel       = scrollVelocity.current;
    const centerIdx = (N - 1) / 2;

    pageGroupsRef.current.forEach((grp, i) => {
      // relX: card's position relative to screen centre in card-index units
      const rawRelX = (i - centerIdx) + scrollX.current / GAP;
const relX = ((rawRelX + N / 2) % N + N) % N - N / 2;

      // Strictly horizontal — no y or z bobbing
      grp.position.x = relX * GAP;
      grp.position.y = 0;
      grp.position.z = 0;

      // Blade fan: spine at centre (≈90°), face opens as card moves to edge
            const dist = Math.abs(relX);
      const ang  = 0.45 + 1.12 * Math.exp(-dist * dist * 0.04);
      grp.rotation.y = relX >= 0 ? -ang : ang;
      
      // Gentle lean into scroll direction — no x-tilt, no oscillation
      grp.rotation.x = 0;
      grp.rotation.z = -vel * 0.05;
    });
  });

  return null;
}

export function CarouselScene() {
  return (
           <Canvas style={{ width: '100%', height: '320px' }}>
      <PerspectiveCamera position={[0, 0.15, 5.8]} fov={42} makeDefault />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <SceneController />
    </Canvas>
  );
}
