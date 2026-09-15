import Link from "next/link";

// Add the official destinations when the accounts and terms are ready.
const footerLinks: { label: string; href: string | null }[] = [
  { label: "Instagram", href: null },
  { label: "Telegram", href: null },
  { label: "Условия использования", href: null },
];

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-main">
          <Link href="/" className="landing-brand" aria-label="KorkemBooks — главная">
            <span className="brand-mark__logo" aria-hidden="true" />
          </Link>
        <nav className="landing-footer-links" aria-label="Социальные сети и документы">
          {footerLinks.map(({ label, href }) => href ? (
            <a key={label} href={href}>{label}</a>
          ) : (
            <span key={label} role="link" aria-disabled="true" title="Ссылка скоро появится">{label}</span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
