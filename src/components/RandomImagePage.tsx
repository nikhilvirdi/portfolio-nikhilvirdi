import { useState } from 'react';

const TOTAL_IMAGES = 22;

function getRandomImagePath(): string {
  const index = Math.floor(Math.random() * TOTAL_IMAGES) + 1;
  return `/random/img${index}.jpeg`;
}

export default function RandomImagePage() {
  const [imageSrc] = useState<string>(getRandomImagePath);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <img
        src={imageSrc}
        alt=""
        className="max-w-full max-h-full w-auto h-auto object-contain select-none"
      />
    </main>
  );
}

