import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { getHeroProgress } from '../utils/heroScroll';

interface AvatarModelProps {
  onEasterEggClick?: () => void;
}

export default function AvatarModel({ onEasterEggClick }: AvatarModelProps = {}) {
  const { scene } = useGLTF('/models/avatar-2.glb');
  const { gl, camera } = useThree();

  const groupRef = useRef<THREE.Group | null>(null);

  // Constants
  const BASE_ROTATION_X = (5 * Math.PI) / 180; // ~5° permanent forward lean
  const BASE_ROTATION_Y = -Math.PI / 2; // -90° resting rotation facing viewer
  const MAX_TURN_ANGLE = (22.5 * Math.PI) / 180; // ~+22.5° turn toward Hero headline
  const BOB_SPEED = Math.PI * 0.5; // ~4 second period (2 * PI / 4 = 0.5 * PI)
  const BOB_AMPLITUDE = 0.015; // 0.015 world units idle drift
  const PUNCH_DURATION = 0.55; // 550ms squash-and-stretch duration

  // State refs for useFrame animation
  const isTriggeredRef = useRef(false);
  const clickTimeRef = useRef<number>(-999);
  const currentScaleY = useRef<number>(1);
  const currentScaleXZ = useRef<number>(1);
  const lastTriggerTimeRef = useRef<number>(0);

  // Trigger squash-and-stretch on click of avatar with debounce guard
  const triggerBounce = () => {
    const now = performance.now();
    // Guard against duplicate invocations from simultaneous DOM and R3F events
    if (now - lastTriggerTimeRef.current < 250) {
      return;
    }
    lastTriggerTimeRef.current = now;

    isTriggeredRef.current = true;
    onEasterEggClick?.();
  };

  useEffect(() => {
    const domEl = gl.domElement;
    domEl.tabIndex = 0;
    domEl.setAttribute('role', 'button');
    domEl.setAttribute('aria-label', 'Interactive 3D Avatar');
    domEl.style.outline = 'none';

    let downPos = { x: 0, y: 0 };
    let downTime = 0;

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      downTime = performance.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      const duration = performance.now() - downTime;

      // Only evaluate genuine clicks (not camera rotation drags)
      if (dist < 8 && duration < 450 && groupRef.current) {
        const rect = domEl.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

        const hits = raycaster.intersectObject(groupRef.current, true);
        if (hits.length > 0) {
          triggerBounce();
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerBounce();
      }
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('keydown', onKeyDown);

    return () => {
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('keydown', onKeyDown);
      document.body.style.cursor = 'auto';
    };
  }, [gl, camera]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // ── 1. Forward lean on X-axis (baseline forward lean) ──
    group.rotation.x = THREE.MathUtils.lerp(
      group.rotation.x,
      BASE_ROTATION_X,
      Math.min(1, delta * 12)
    );

    // ── 2. Whole-body turn toward headline tied to scroll, returning to neutral once reveal completes ──
    const progress = getHeroProgress();
    const isCompleted = progress >= 0.999;
    const targetRotationY = isCompleted
      ? BASE_ROTATION_Y
      : BASE_ROTATION_Y + progress * MAX_TURN_ANGLE;

    const lerpSpeedY = isCompleted ? 5 : 10;
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      targetRotationY,
      Math.min(1, delta * lerpSpeedY)
    );

    // ── 2. Idle breathing bob (always running) ──
    const bobY = Math.sin(state.clock.elapsedTime * BOB_SPEED) * BOB_AMPLITUDE;
    group.position.y = bobY;

    // ── 3. Click squash-and-stretch bounce (retriggerable) ──
    if (isTriggeredRef.current) {
      isTriggeredRef.current = false;
      clickTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - clickTimeRef.current;
    let targetScaleY = 1;
    let targetScaleXZ = 1;

    if (elapsed >= 0 && elapsed < PUNCH_DURATION) {
      const t = elapsed / PUNCH_DURATION;
      if (t < 0.35) {
        // Phase 1: squash first (scale Y down to ~0.92, scale X/Z out to ~1.05)
        const p = t / 0.35;
        const s = Math.sin(p * Math.PI);
        targetScaleY = 1 - 0.08 * s;
        targetScaleXZ = 1 + 0.05 * s;
      } else if (t < 0.75) {
        // Phase 2: overshoot into slight stretch (scale Y up to ~1.05, scale X/Z in to ~0.97)
        const p = (t - 0.35) / 0.4;
        const s = Math.sin(p * Math.PI);
        targetScaleY = 1 + 0.05 * s;
        targetScaleXZ = 1 - 0.03 * s;
      } else {
        // Phase 3: settle back to (1,1,1) with ease-out-back feel
        const p = (t - 0.75) / 0.25;
        const s = Math.sin(p * Math.PI);
        targetScaleY = 1 - 0.01 * s;
        targetScaleXZ = 1 + 0.006 * s;
      }
    }

    // Manual lerp towards target scale
    const lerpRate = elapsed < PUNCH_DURATION ? Math.min(1, delta * 24) : Math.min(1, delta * 14);
    currentScaleY.current = THREE.MathUtils.lerp(currentScaleY.current, targetScaleY, lerpRate);
    currentScaleXZ.current = THREE.MathUtils.lerp(currentScaleXZ.current, targetScaleXZ, lerpRate);

    group.scale.set(currentScaleXZ.current, currentScaleY.current, currentScaleXZ.current);
  });

  return (
    <Center>
      <group
        ref={groupRef}
        rotation={[BASE_ROTATION_X, BASE_ROTATION_Y, 0]}
        onClick={(e) => {
          e.stopPropagation();
          triggerBounce();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <primitive object={scene} />

        {/* Generous invisible collider matching avatar's visible bounds (head to toe, shoulders & arms) */}
        <mesh visible={true} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.98, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </Center>
  );
}

useGLTF.preload('/models/avatar-2.glb');
