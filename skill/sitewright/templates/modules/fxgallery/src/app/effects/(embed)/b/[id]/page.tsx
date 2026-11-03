import { TemplateView } from '@/components/fx/TemplateView';
import { TPL_IDS } from '@/components/fx/tpl/ids';

// Static export: every template id is rendered at build time and anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return TPL_IDS.map((id) => ({ id }));
}

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateView id={id} />;
}
