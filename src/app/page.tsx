import { LandingFooter } from "@/components/landing/landing-footer";
import { ArrowRight } from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { ScrollTimeline } from "@/components/landing/scroll-timeline";
import { LandingSectionHeading } from "@/components/landing/landing-section-heading";
import { LandingFaq, type FaqItem } from "@/components/landing/landing-faq";
import { LandingEditorDemo } from "@/components/landing/landing-editor-demo";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./landing.css";

const whatsappUrl = `https://wa.me/77004617342?text=${encodeURIComponent("Здравствуйте. Хочу создать свою книгу!")}`;
const managerUrl = "https://wa.me/77004617342";

const steps = [
  { title: "Начните с воспоминаний", text: "Откройте книгу и отвечайте на вопросы о детстве, семье и важных моментах. Они помогут вспомнить детали и найти первые слова." },
  { title: "Добавьте то, что дорого", text: "Возвращайтесь к ответам, дополняйте истории и добавляйте фотографии. Пишите в своём темпе — по одной истории за раз." },
  { title: "Соберите свою книгу", text: "Укажите название и посмотрите готовые страницы в предпросмотре. Обложку для вашей книги подготовит наша команда." },
];

const questions: FaqItem[] = [
  { question: "Нужно ли уметь красиво писать?", answer: "Нет. Отвечайте так, как рассказывали бы близкому человеку. Вопросы помогут вспомнить детали, а ваши слова сохранят индивидуальность истории." },
  { question: "Нужно ли заполнять всю книгу сразу?", answer: "Нет. Можно начать с одного вопроса и возвращаться к книге в удобное время. Ответы сохраняются автоматически: перед выходом дождитесь подтверждения сохранения в редакторе." },
  { question: "Можно ли изменить уже написанное?", answer: "Да. Вы можете возвращаться к вопросам, редактировать ответы и дополнять их новыми подробностями." },
  { question: "Можно ли добавлять фотографии?", answer: "Да. В предпросмотре можно добавить фотографии к ответам, выбрать расположение на странице и изменить их порядок." },
  { question: "Как будет выглядеть моя книга?", answer: "Вы сможете добавить название и посмотреть развороты в предпросмотре. Он показывает, как ответы и фотографии складываются в страницы книги, а обложку подготовит наша команда." },
  { question: "Как получить доступ к сервису?", answer: "Для входа нужны номер телефона и пароль, полученные от администратора KorkemBooks. Если данные уже есть, нажмите «Войти». Если пока нет — обратитесь к администратору сервиса." },
];

export default async function LandingPage() {
  const isSignedIn = Boolean(await getCurrentUser());
  return (
    <div className="landing" lang="ru">
      <a className="landing-skip" href="#main">Перейти к содержимому</a>
      <LandingHeader isSignedIn={isSignedIn} />
      <main id="main" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="hero-title">
          <h1 id="hero-title">Соберите истории своей жизни в&nbsp;книгу</h1>
          <p className="landing-description">Отвечайте на простые вопросы, добавляйте фотографии и сохраняйте то, чем хочется поделиться с близкими.</p>
          <a href={whatsappUrl} className="landing-button">Начать свою книгу <ArrowRight size={19} aria-hidden="true" /></a>
          <p className="landing-hero-note">В своём темпе. Своими словами.</p>
          <LandingEditorDemo />
        </section>

        <section className="landing-about landing-section" id="about" tabIndex={-1} aria-labelledby="about-title">
          <LandingSectionHeading id="about-title" eyebrow="О книге" title={<>Важное складывается<br className="landing-desktop-break" /> из простых моментов</>}>
            Семейные привычки, первые встречи, слова родителей. KorkemBooks помогает сохранить эти воспоминания — постепенно, через вопросы о вашей жизни.
          </LandingSectionHeading>
          <div className="landing-features">
            <div><span>01 / Вопросы</span><h3>Есть с чего начать</h3><p>Темы и вопросы помогают вспомнить то, что трудно рассказать с чистого листа.</p></div>
            <div><span>02 / Истории</span><h3>Остаётся ваш голос</h3><p>Вы сами выбираете слова, добавляете детали и рассказываете так, как чувствуете.</p></div>
            <div><span>03 / Книга</span><h3>Всё в одном месте</h3><p>Ответы и фотографии собираются в личную книгу, а наша команда готовит её к печати.</p></div>
          </div>
        </section>

        <section className="landing-how landing-section" id="how" tabIndex={-1} aria-labelledby="how-title">
          <LandingSectionHeading id="how-title" eyebrow="Как это работает" title={<>От первого ответа<br className="landing-desktop-break" /> до вашей книги</>}>
            Три простых шага. Начать можно с одного воспоминания.
          </LandingSectionHeading>
          <ScrollTimeline>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="landing-step-number" aria-hidden="true">0{index + 1}</span>
                <div className="landing-step-card"><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ScrollTimeline>
        </section>

        <section className="landing-timing landing-section" id="timing" aria-labelledby="timing-title">
          <div className="landing-timing-intro">
            <p className="landing-eyebrow">Сколько времени нужно</p>
            <h2 id="timing-title">Когда будет готова ваша книга?</h2>
          </div>
          <div className="landing-timing-details">
            <ol className="landing-timing-list">
              <li className="landing-timing-step">
                <span className="landing-timing-number" aria-hidden="true">01</span>
                <div>
                  <h3>Заполнение вопросов</h3>
                  <p>Здесь всё зависит от вас. Кто-то заполняет книгу за 2–3 часа, а кому-то нужно уделить воспоминаниям больше времени.</p>
                </div>
              </li>
              <li className="landing-timing-step">
                <span className="landing-timing-number" aria-hidden="true">02</span>
                <div>
                  <h3>Редактура и печать <span>(4–7 дней)</span></h3>
                  <p>Проверяем, оформляем, согласовываем и печатаем вашу книгу.</p>
                </div>
              </li>
            </ol>
            <p className="landing-timing-note">Срок может немного меняться в зависимости от загруженности.</p>
          </div>
        </section>

        <section className="landing-faq landing-section" id="questions" tabIndex={-1} aria-labelledby="faq-title">
          <LandingSectionHeading id="faq-title" eyebrow="Частые вопросы" title="Перед первой страницей">
            Всё, что хочется узнать, прежде чем начать свою книгу.
          </LandingSectionHeading>
          <LandingFaq items={questions} />
          <div className="landing-faq-contact">
            <div className="landing-faq-contact-copy">
              <p className="landing-eyebrow">Остались вопросы?</p>
              <h3>Напишите нам — поможем разобраться<br className="landing-desktop-break" /> и начать свою книгу.</h3>
            </div>
            <a href={managerUrl} className="landing-button">Написать в WhatsApp <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
        </section>

        {/* <section className="landing-final landing-section" aria-labelledby="final-title">
          <p className="landing-eyebrow">Начните с малого</p>
          <h2 id="final-title">Какую историю<br />вы расскажете первой?</h2>
          <p className="landing-description">Один вопрос, несколько строк — начало вашей книги.</p>
          <a href={whatsappUrl} className="landing-button">Начать свою книгу <ArrowRight size={18} aria-hidden="true" /></a>
        </section> */}
      </main>
      <LandingFooter />
    </div>
  );
}
