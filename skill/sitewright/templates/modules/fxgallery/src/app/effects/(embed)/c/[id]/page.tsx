import { EmbedStage } from '@/components/fx/EmbedStage';
import { UI_IDS } from '@/components/fx/ui/ids';

// Static export: every id is rendered at build time and anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return UI_IDS.map((id) => ({ id }));
}

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedStage kind="c" id={id} />;
}
