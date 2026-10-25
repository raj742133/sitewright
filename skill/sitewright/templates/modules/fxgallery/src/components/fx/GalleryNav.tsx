import { LogoMark } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

const LINKS = [{ href: '/effects/', label: 'Effects', id: 'effects' }, { href: '/effects/components/', label: 'Components', id: 'components' }, { href: '/effects/templates/', label: 'Templates', id: 'templates' }];

/** The gallery's top bar: where you are, and the three catalogues (effects you pick, components you import, whole screens you start from). */
export function GalleryNav({ active }: { active: 'effects' | 'components' | 'templates' }) {
  return (
    <header className="fxg-bar">
      <a className="fxg-brand" href="/" aria-label="__BRAND__ home"><span className="brand-mark"><LogoMark size={26} /></span><b>__BRAND__</b></a>
      <nav className="fxg-nav" aria-label="Gallery">
        {LINKS.map((l) => <a key={l.id} href={l.href} aria-current={l.id === active ? 'page' : undefined}>{l.label}</a>)}
      </nav>
      <ThemeToggle />
    </header>
  );
}
