import type { Metadata } from 'next';
import { Templates } from '@/components/fx/Templates';
import '../effects.css';

export const metadata: Metadata = { title: 'Templates · __BRAND__', description: 'Dashboards, pages and a brand board to start from, each previewed at full size.' };

export default function TemplatesPage() {
  return <Templates />;
}
