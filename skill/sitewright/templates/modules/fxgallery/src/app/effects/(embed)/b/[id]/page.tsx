import { TemplateView } from '@/components/fx/TemplateView';
import { TPL_ITEMS } from '@/components/fx/tpl/demos';

// Static export: every template id is rendered at build time and anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return TPL_ITEMS.map((d) => ({ id: d.id }));
}

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateView id={id} />;
}
