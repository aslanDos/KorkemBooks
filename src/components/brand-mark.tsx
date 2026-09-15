import Link from "next/link";

type BrandMarkProps = {
  variant?: "dark" | "light";
  collapsed?: boolean;
  href?: string;
};

export function BrandMark({ variant = "dark", collapsed = false, href = "/dashboard" }: BrandMarkProps) {
  return (
    <Link className={`brand-mark brand-mark--${variant}${collapsed ? " brand-mark--collapsed" : ""}`} href={href} aria-label="Korkem Books — главная">
      <span className="brand-mark__logo" aria-hidden="true" />
    </Link>
  );
}
