import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import { getHeroProgress } from '../utils/heroScroll';

export default function AvatarModel() {
  const { scene } = useGLTF('/models/avatar.glb');
  const { gl } = useThree();

  const groupRef = useRef<THREE.Group | null>(null);

  // Constants
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

  // Trigger squash-and-stretch on click of avatar or canvas
  const triggerBounce = () => {
    isTriggeredRef.current = true;
  };

  useEffect(() => {
    const domEl = gl.domElement;
    let downPos = { x: 0, y: 0 };
    let downTime = 0;

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      downTime = performance.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      const duration = performance.now() - downTime;
      // Trigger only on genuine clicks, not camera drag-rotations
      if (dist < 6 && duration < 400) {
        triggerBounce();
      }
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointerup', onPointerUp);

    return () => {
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // ── 1. Whole-body turn toward headline tied to scroll ──
    const progress = getHeroProgress();
    const targetRotationY = BASE_ROTATION_Y + progress * MAX_TURN_ANGLE;
    // Responsive smooth lerp to target angle
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      targetRotationY,
      Math.min(1, delta * 10)
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
        rotation={[0, BASE_ROTATION_Y, 0]}
        onClick={(e) => {
          e.stopPropagation();
          triggerBounce();
        }}
      >
        <primitive object={scene} />
      </group>
    </Center>
  );
}

useGLTF.preload('/models/avatar.glb');
