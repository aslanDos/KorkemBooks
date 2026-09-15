import { ChevronDown } from "lucide-react";

export type FaqItem = {
  question: string;
  answer: string;
};

export function LandingFaq({ items }: { items: readonly FaqItem[] }) {
  const middle = Math.ceil(items.length / 2);

  return (
    <div className="landing-faq-columns">
      {[items.slice(0, middle), items.slice(middle)].map((column, index) => (
        <div className="landing-faq-column" key={index}>
          {column.map(({ question, answer }) => (
            <details key={question}>
              <summary>{question}<ChevronDown size={20} aria-hidden="true" /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}
