import { useGLTF, Center } from '@react-three/drei';

export default function AvatarModel() {
  const { scene } = useGLTF('/models/avatar.glb');

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

useGLTF.preload('/models/avatar.glb');
