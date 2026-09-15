import type { ReactNode } from "react";

type LandingSectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
};

export function LandingSectionHeading({ id, eyebrow, title, children }: LandingSectionHeadingProps) {
  return (
    <div className="landing-section-heading">
      <p className="landing-eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
