import Link from "next/link";

const footerLinks = [
  { label: "Instagram", href: "https://www.instagram.com/korkembooks/", external: true },
  { label: "Telegram", href: "https://t.me/korkembook", external: true },
  { label: "Политика конфиденциальности", href: "/privacy", external: false },
];

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer-main">
        <p className="landing-footer-copyright">© {currentYear} korkembooks</p>
        <nav className="landing-footer-links" aria-label="Социальные сети и документы">
          {footerLinks.map(({ label, href, external }) => external ? (
            <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>
          ) : <Link key={label} href={href}>{label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}
