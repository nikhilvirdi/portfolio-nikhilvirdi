import { useGLTF, Center } from '@react-three/drei';

export default function AvatarModel() {
  const { scene } = useGLTF('/models/avatar.glb');

  return (
    <Center>
      <group rotation={[0, -Math.PI / 2, 0]}>
        <primitive object={scene} />
      </group>
    </Center>
  );
}

useGLTF.preload('/models/avatar.glb');
