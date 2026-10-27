import type { Metadata } from 'next';
import { Catalogue } from '@/components/fx/Catalogue';
import '../effects.css';

export const metadata: Metadata = { title: 'Components · __BRAND__', description: 'Small interactive components you import by name, each shown live.' };

export default function ComponentsPage() {
  return <Catalogue />;
}
