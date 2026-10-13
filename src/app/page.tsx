import { LandingFooter } from "@/components/landing/landing-footer";
import { ArrowRight } from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { ScrollTimeline } from "@/components/landing/scroll-timeline";
import { LandingSectionHeading } from "@/components/landing/landing-section-heading";
import { LandingFaq, type FaqItem } from "@/components/landing/landing-faq";
import { LandingBookPreview } from "@/components/landing/landing-editor-demo";
import { LandingHeroTitle } from "@/components/landing/landing-hero-title";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingRecipientShowcase } from "@/components/landing/landing-recipient-showcase";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./landing.css";

const whatsappUrl = `https://wa.me/77004617342?text=${encodeURIComponent("Здравствуйте. Хочу создать свою книгу!")}`;
const managerUrl = "https://wa.me/77004617342";

const steps = [
  { title: "Собираем вашу историю", text: "Вы отвечаете на вопросы, рассказываете о важных людях и событиях, добавляете фотографии. Делать это можно постепенно, в удобном для вас темпе." },
  { title: "Создаём рукопись", text: "Ваши ответы превращаются в цельный, связный рассказ. Мы сохраняем ваш голос, интонацию и характер каждой истории." },
  { title: "Готовим книгу к печати", text: "Редактируем текст, проверяем материалы и размещаем ваши истории и фотографии в готовом макете книги." },
  { title: "Печатаем и доставляем", text: "После вашего подтверждения отправляем книгу в печать, а готовый экземпляр доставляем по указанному адресу." },
];

const questions: FaqItem[] = [
  { question: "Нужно ли уметь красиво писать?", answer: "Нет. Отвечайте так, как рассказывали бы близкому человеку. Вопросы помогут вспомнить детали, а ваши слова сохранят индивидуальность истории." },
  { question: "Сколько времени занимает создание книги?", answer: "Создание книги проходит в два этапа. Первый — ответы на вопросы, которые в среднем занимают 1–2 дня, но всё зависит от вашего темпа. Второй — редактура и печать книги, на которые требуется 5–6 рабочих дней." },
  { question: "Как осуществляется доставка?", answer: "Доставляем заказы по всему миру. По Астане доставка осуществляется в день заказа, по Казахстану — за 2–4 дня, по странам СНГ — за 3–10 дней, а в остальные страны — за 7–15 дней." },
  { question: "Могу ли я использовать свой дизайн обложки?", answer: "Конечно. Вы можете предложить собственный дизайн, а наши дизайнеры бесплатно адаптируют его под формат вашей книги." },
  { question: "Обязательно ли отвечать на все вопросы?", answer: "Нет, вы можете выбрать только те вопросы, на которые хотите ответить. Главное, чтобы в итоге получилось не менее 70 заполненных страниц." },
];

export default async function LandingPage() {
  const isSignedIn = Boolean(await getCurrentUser());
  return (
    <div className="landing">
      <LandingMotion />
      <a className="landing-skip" href="#main">Перейти к содержимому</a>
      <LandingHeader isSignedIn={isSignedIn} />
      <main id="main" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero-lead">
            <div className="landing-hero-content">
              <LandingHeroTitle id="hero-title" />
              <p className="landing-description landing-hero-copy">Ответьте на вопросы, добавьте любимые фотографии — а мы превратим ваши воспоминания в настоящую книгу.</p>
              <a href={whatsappUrl} className="landing-button landing-hero-action">Начать свою книгу <ArrowRight size={19} aria-hidden="true" /></a>
            </div>
            <figure className="landing-hero-video-card" data-landing-reveal="video-card">
              <video
                src="/videos/referencevideo.mp4"
                aria-label="Видеопример готовой книги"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </figure>
          </div>
          <LandingBookPreview />
        </section>

        <LandingRecipientShowcase />

        <section className="landing-how landing-section" id="how" tabIndex={-1} aria-labelledby="how-title">
          <LandingSectionHeading id="how-title" eyebrow="Этапы создания" title="Как рождается ваша книга">
            Мы бережно превращаем ваши воспоминания, фотографии и важные события в настоящую книгу.
          </LandingSectionHeading>
          <ScrollTimeline>
            {steps.map((step, index) => (
              <li key={step.title} data-landing-reveal={index % 2 === 0 ? "left" : "right"}>
                <span className="landing-step-number" aria-hidden="true">0{index + 1}</span>
                <div className="landing-step-card"><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ScrollTimeline>
        </section>

        <section className="landing-faq landing-section" id="questions" tabIndex={-1} aria-labelledby="faq-title">
          <LandingSectionHeading id="faq-title" eyebrow="Частые вопросы" title="Перед первой страницей">
            Всё, что важно знать перед тем, как начать свою историю.
          </LandingSectionHeading>
          <LandingFaq items={questions} />
        </section>

        <section className="landing-contact-hero" aria-labelledby="contact-title" data-landing-reveal="contact-image">
          <div className="landing-contact-hero__content" data-landing-reveal="scale">
            <h2 id="contact-title">Остались вопросы?</h2>
            <p>Напишите нам — поможем разобраться<br className="landing-desktop-break" /> и начать свою книгу.</p>
            <a href={managerUrl} className="landing-button">Написать в WhatsApp <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
