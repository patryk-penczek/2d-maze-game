'use client';

import { ReturnButton } from '@/components/ReturnButton';
import { Maze } from './maze';

export default function Mazepage() {
  return (
    <main>
      <ReturnButton />
      <Maze />
    </main>
  );
}
