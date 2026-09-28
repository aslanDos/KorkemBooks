"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Check, ChevronDown, LoaderCircle, Palette, Plus, Settings2 } from "lucide-react";
import { selectBookCoverAction } from "@/app/dashboard/books/cover-actions";
import { BookCoverSpine } from "@/components/books/book-cover-spine";
import { fitRenderedCoverTitlePanel } from "@/lib/books/cover-title-layout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BookWithContent, CoverColorKey, CoverStyle, CoverTemplate } from "@/lib/books/types";

import { COVER_PALETTES as PALETTES, FRAME_COLOR_OPTIONS } from "@/lib/books/cover-palettes";

export function BookCoverDesigner({ book, templates, readOnly = false }: { book: BookWithContent; templates: CoverTemplate[]; readOnly?: boolean }) {
  const [title, setTitle] = useState(book.title);
  const [authorName, setAuthorName] = useState(book.author_name);
  const [titleSize, setTitleSize] = useState(book.cover?.titleSize ?? 24);
  const [authorSize, setAuthorSize] = useState(book.cover?.authorSize ?? 10);
  const titlePanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreviewUrl, setCustomPreviewUrl] = useState(book.cover?.customBackgroundUrl ?? "");
  const [customBackgroundPath, setCustomBackgroundPath] = useState(book.cover?.customBackgroundPath ?? null);
  const [useCustomBackground, setUseCustomBackground] = useState(Boolean(book.cover?.customBackgroundPath));
  const [showAuthor, setShowAuthor] = useState(book.cover?.showAuthor ?? true);
  const [colorKey, setColorKey] = useState<CoverColorKey>(book.cover?.colorKey ?? "burgundy");
  const [coverStyle, setCoverStyle] = useState<CoverStyle>(book.cover?.style ?? "solid");
  const [coloredBack, setColoredBack] = useState(book.cover?.coloredBack ?? false);
  const [backgroundInsideFrame, setBackgroundInsideFrame] = useState(book.cover?.backgroundInsideFrame ?? false);
  const [showFrame, setShowFrame] = useState(book.cover?.showFrame ?? true);
  const [frameStyle, setFrameStyle] = useState<"ver1" | "ver2">(book.cover?.frameStyle ?? "ver2");
  const [frameColor, setFrameColor] = useState<string | null>(book.cover?.frameColor ?? null);
  const [showBackText, setShowBackText] = useState(book.cover?.showBackText ?? true);
  const [spineLetterSpacing, setSpineLetterSpacing] = useState(book.cover?.spineLetterSpacing ?? 10);
  const [spineAuthorName, setSpineAuthorName] = useState(book.cover?.spineAuthorName ?? "");
  const [spineTextOverflow, setSpineTextOverflow] = useState(false);
  const backTextTone = book.cover?.backTextTone ?? "dark";
  const [templateId, setTemplateId] = useState(book.cover?.templateId ?? templates[0]?.id ?? "");
  const [savedChoice, setSavedChoice] = useState(book.cover?.style === "template" && book.cover.customBackgroundPath ? `custom:${book.cover.customBackgroundPath}` : `${book.cover?.style ?? "solid"}:${book.cover?.templateId ?? ""}:${book.cover?.colorKey ?? "burgundy"}`);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = templates.find((template) => template.id === templateId) ?? templates[0];
  const palette = PALETTES.find((item) => item.key === colorKey) ?? PALETTES[0];
  const previewStyle = { "--cover-bg": palette.background, "--cover-detail": frameColor ?? palette.detail, "--cover-title-size": `${titleSize * .11396}cqw`, "--cover-author-size": `${authorSize * .11396}cqw` } as CSSProperties;

  useEffect(() => {
    return () => { if (customPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(customPreviewUrl); };
  }, [customPreviewUrl]);

  function selectCustomFile(file?: File) {
    if (!file || readOnly || pending) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Выберите JPEG, PNG или WebP."); return; }
    if (file.size > 6 * 1024 * 1024 || !file.size) { setError("Изображение должно быть не больше 6 МБ и не пустым."); return; }
    setError("");
    setCustomFile(file);
    setCustomPreviewUrl(URL.createObjectURL(file));
    setUseCustomBackground(true);
    setCoverStyle("template");
  }

  useEffect(() => {
    const panel = titlePanelRef.current;
    if (!panel || coverStyle !== "template") return;
    let disposed = false;
    let frame = 0;
    const scheduleFit = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitRenderedCoverTitlePanel(panel));
    };
    const observer = new ResizeObserver(scheduleFit);
    if (panel.parentElement) observer.observe(panel.parentElement);
    scheduleFit();
    void document.fonts.ready.then(scheduleFit);
    document.fonts.addEventListener("loadingdone", scheduleFit);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", scheduleFit);
    };
  }, [title, authorName, showAuthor, titleSize, authorSize, coverStyle]);

  function saveCover() {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      try {
      let backgroundPath = useCustomBackground && coverStyle === "template" ? customBackgroundPath : null;
      if (useCustomBackground && coverStyle === "template" && customFile) {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) { setError("Supabase не настроен."); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Сессия истекла. Войдите снова."); return; }
        const extension = customFile.type === "image/png" ? "png" : customFile.type === "image/webp" ? "webp" : "jpg";
        backgroundPath = `${user.id}/${book.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("book-cover-images").upload(backgroundPath, customFile, { contentType: customFile.type, upsert: false });
        if (uploadError) { setError("Не удалось загрузить фон. Проверьте Storage и попробуйте снова."); return; }
        const { data: signed } = await supabase.storage.from("book-cover-images").createSignedUrl(backgroundPath, 3600);
        setCustomBackgroundPath(backgroundPath);
        if (signed?.signedUrl) setCustomPreviewUrl(signed.signedUrl);
        setCustomFile(null);
      }
      const result = await selectBookCoverAction({
        bookId: book.id,
        templateId: selected.id,
        showAuthor,
        showRecipient: false,
        title,
        authorName,
        titleSize,
        authorSize,
        recipientName: book.recipient_name,
        customBackgroundPath: backgroundPath,
        titlePosition: "center",
        fontStyle: "playfair",
        textTone: "light",
        overlayStrength: 0,
        colorKey,
        coverStyle,
        coloredBack,
        backgroundInsideFrame,
        showFrame,
        frameStyle,
        frameColor,
        showBackText,
        spineLetterSpacing,
        spineAuthorName,
        backTextTone,
      });
      if (result.error) { setError(result.error); return; }
      setSavedChoice(backgroundPath ? `custom:${backgroundPath}` : `${coverStyle}:${selected.id}:${colorKey}`);
      } catch {
        setError("Не удалось сохранить обложку. Проверьте соединение и попробуйте снова.");
      }
    });
  }

  if (!selected) return <div className="dashboard-section"><p>Шаблоны обложек пока не добавлены.</p></div>;

  return <div className="cover-designer cover-designer--colored cover-designer--preview-layout">
    <header className="book-reader__toolbar cover-designer__toolbar">
      <div><Palette size={19} aria-hidden="true" /><span><strong>Обложка книги</strong><small>Лицевая сторона, корешок и оборот</small></span></div>
    </header>
    <details className={`book-preview-settings cover-template-panel${readOnly ? " is-readonly" : ""}`} open>
      <summary>
        <Settings2 size={18} aria-hidden="true" />
        <span><strong>Настройки обложки</strong><small>Текст, стиль, цвет и корешок</small></span>
        <ChevronDown className="book-preview-settings__chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="book-preview-settings__body cover-template-panel__body" inert={readOnly || pending}>
        <details className="book-preview-settings__group" open>
          <summary><span><strong>Текст обложки</strong><small>Название, автор и задняя сторона</small></span><ChevronDown className="book-preview-settings__chevron" size={17} aria-hidden="true" /></summary>
          <div className="book-preview-settings__group-body">
            <p>Настройте подписи, которые будут напечатаны на обложке.</p>
            <div className="cover-data-fields">
              <label><span>Название книги *</span><input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} /></label>
              <label><span>Автор *</span><input value={authorName} maxLength={120} onChange={(event) => setAuthorName(event.target.value)} /></label>
            </div>
            <fieldset className="book-size-options"><legend>Размер названия книги</legend><div>
              {[16, 20, 24, 28, 32].map((size) => <button key={size} type="button" className={titleSize === size ? "is-selected" : ""} aria-pressed={titleSize === size} onClick={() => setTitleSize(size)}>{size}</button>)}
            </div></fieldset>
            {showAuthor && <fieldset className="book-size-options"><legend>Размер имени автора</legend><div>
              {[8, 10, 12, 14, 16].map((size) => <button key={size} type="button" className={authorSize === size ? "is-selected" : ""} aria-pressed={authorSize === size} onClick={() => setAuthorSize(size)}>{size}</button>)}
            </div></fieldset>}
            <div className="cover-toggle-list">
              <div className="book-footer-option"><span><strong>Имя автора</strong><small>Показывать автора на лицевой стороне и корешке</small></span><button className="book-footer-toggle" type="button" role="switch" aria-label="Показывать автора на обложке" aria-checked={showAuthor} onClick={() => setShowAuthor((value) => !value)}><span /></button></div>
              <div className="book-footer-option"><span><strong>Надпись на задней стороне</strong><small>Показывать KorkemBooks на обороте обложки</small></span><button className="book-footer-toggle" type="button" role="switch" aria-label="Показывать надпись на задней стороне" aria-checked={showBackText} onClick={() => setShowBackText((value) => !value)}><span /></button></div>
            </div>
          </div>
        </details>
        <details className="book-preview-settings__group" open>
          <summary><span><strong>Стиль обложки</strong><small>{coverStyle === "solid" ? "Однотонная" : useCustomBackground ? "Свой фон" : selected.name}</small></span><ChevronDown className="book-preview-settings__chevron" size={17} aria-hidden="true" /></summary>
          <div className="book-preview-settings__group-body">
            <p>Выберите однотонную обложку или готовый вариант оформления.</p>
            <div className="cover-style-grid">
              <button className={`cover-style-card cover-style-card--solid${coverStyle === "solid" ? " is-selected" : ""}`} type="button" aria-pressed={coverStyle === "solid"} onClick={() => { setCoverStyle("solid"); setUseCustomBackground(false); setError(""); }}><span style={{ background: palette.background }} /><strong>Однотонная</strong>{savedChoice.startsWith("solid:") && <Check size={15} aria-label="Сохранено" />}</button>
              {templates.map((template) => <button className={`cover-style-card${coverStyle === "template" && !useCustomBackground && selected.id === template.id ? " is-selected" : ""}`} type="button" key={template.id} aria-pressed={coverStyle === "template" && !useCustomBackground && selected.id === template.id} onClick={() => { setCoverStyle("template"); setUseCustomBackground(false); setTemplateId(template.id); setError(""); }}><span style={{ backgroundImage: `url(${template.backgroundPath})` }} /><strong>{template.name}</strong>{!useCustomBackground && savedChoice.startsWith(`template:${template.id}:`) && <Check size={15} aria-label="Сохранено" />}</button>)}
              {(customPreviewUrl || customBackgroundPath) && <button className={`cover-style-card${coverStyle === "template" && useCustomBackground ? " is-selected" : ""}`} type="button" aria-pressed={coverStyle === "template" && useCustomBackground} onClick={() => { setCoverStyle("template"); setUseCustomBackground(true); setError(""); }}><span style={{ backgroundImage: customPreviewUrl ? `url(${JSON.stringify(customPreviewUrl)})` : undefined }} /><strong>Свой фон</strong>{savedChoice === `custom:${customBackgroundPath}` && <Check size={15} aria-label="Сохранено" />}</button>}
              <button className="cover-style-card cover-style-card--add" type="button" aria-label="Добавить свой фон обложки" disabled={readOnly || pending} onClick={() => fileInputRef.current?.click()}><span><Plus size={22} aria-hidden="true" /></span><strong>Добавить</strong></button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={readOnly || pending} onChange={(event) => { selectCustomFile(event.target.files?.[0]); event.target.value = ""; }} />
            <p className="cover-upload-hint">Свой фон: JPEG, PNG или WebP до 6 МБ. Загрузится после нажатия «Сохранить обложку».</p>
            <div className="cover-toggle-list">
              <div className="book-footer-option"><span><strong>Декоративная рамка</strong><small>Показывать рамку на лицевой и задней сторонах</small></span><button className="book-footer-toggle" type="button" role="switch" aria-label="Показывать рамку на обложке" aria-checked={showFrame} onClick={() => setShowFrame((value) => !value)}><span /></button></div>
              {showFrame && <fieldset className="book-size-options"><legend>Вариант рамки</legend><div>
                <button type="button" className={frameStyle === "ver1" ? "is-selected" : ""} aria-pressed={frameStyle === "ver1"} title="Прямоугольная рамка" onClick={() => setFrameStyle("ver1")}>ver1</button>
                <button type="button" className={frameStyle === "ver2" ? "is-selected" : ""} aria-pressed={frameStyle === "ver2"} title="Декоративная рамка" onClick={() => setFrameStyle("ver2")}>ver2</button>
              </div></fieldset>}
              {showFrame && <fieldset className="book-page-background-options cover-frame-color-options"><legend>Цвет рамки</legend><div className="book-page-background-grid">
                <button type="button" className={frameColor === null ? "is-selected" : ""} aria-label="Автоматический цвет рамки" title="Авто — сочетается с цветом обложки" aria-pressed={frameColor === null} style={{ background: palette.detail, color: "#FFFAF3", fontSize: "9px" }} onClick={() => setFrameColor(null)}>Авто</button>
                {FRAME_COLOR_OPTIONS.map((item) => <button key={item.background} type="button" className={frameColor?.toUpperCase() === item.background ? "is-selected" : ""} aria-label={`Цвет рамки: ${item.name}`} title={item.name} aria-pressed={frameColor?.toUpperCase() === item.background} style={{ background: item.background }} onClick={() => setFrameColor(item.background)} />)}
              </div></fieldset>}
              {coverStyle === "template" && showFrame && <div className="book-footer-option"><span><strong>Фон внутри рамки</strong><small>Оставить выбранный цвет снаружи; выключите для фона на всю обложку</small></span><button className="book-footer-toggle" type="button" role="switch" aria-label="Фон внутри рамки" aria-checked={backgroundInsideFrame} onClick={() => setBackgroundInsideFrame((value) => !value)}><span /></button></div>}
              {coverStyle === "template" && <div className="book-footer-option"><span><strong>Однотонная задняя сторона</strong><small>Использовать выбранный цвет вместо изображения</small></span><button className="book-footer-toggle" type="button" role="switch" aria-label="Сделать заднюю сторону однотонной" aria-checked={coloredBack} onClick={() => setColoredBack((value) => !value)}><span /></button></div>}
            </div>
          </div>
        </details>
        <details className="book-preview-settings__group" open>
          <summary><span><strong>Цвет обложки</strong><small>{palette.name}</small></span><ChevronDown className="book-preview-settings__chevron" size={17} aria-hidden="true" /></summary>
          <div className="book-preview-settings__group-body">
            <p>{coverStyle === "template" ? "Цвет применяется к корешку, полям снаружи рамки и к задней стороне, если она сделана однотонной." : "Выберите основной цвет обложки, рамки и корешка."}</p>
            <fieldset className="book-page-background-options cover-color-options">
              <legend>Основной цвет</legend>
              <div className="book-page-background-grid">{PALETTES.map((item) => <button key={item.key} type="button" className={colorKey === item.key ? "is-selected" : ""} aria-label={item.name} title={item.name} aria-pressed={colorKey === item.key} style={{ background: item.background }} onClick={() => { setColorKey(item.key); setError(""); }} />)}</div>
            </fieldset>
          </div>
        </details>
        <details className="book-preview-settings__group">
          <summary><span><strong>Стиль корешка</strong><small>Имя автора и межбуквенное расстояние</small></span><ChevronDown className="book-preview-settings__chevron" size={17} aria-hidden="true" /></summary>
          <div className="book-preview-settings__group-body">
            <div className="cover-data-fields cover-data-fields--spine">
              <label><span>Имя автора на корешке</span><input value={spineAuthorName} maxLength={120} placeholder={authorName.trim() || "Имя автора"} aria-describedby="cover-spine-author-help" onChange={(event) => setSpineAuthorName(event.target.value)} /></label>
            </div>
            <p id="cover-spine-author-help">Можно указать сокращённое имя только для корешка. Если поле пустое, используется имя из текста обложки.</p>
            <p id="cover-spine-spacing-help">Интервал применяется только к названию книги. Длинный текст автоматически уменьшается; если места всё ещё не хватает, интервал сокращается.</p>
            <label className="cover-spine-spacing"><span><strong>Межбуквенное расстояние</strong><output>{(spineLetterSpacing / 100).toFixed(2)} em</output></span><input type="range" min="0" max="50" step="1" value={spineLetterSpacing} aria-describedby="cover-spine-spacing-help" onChange={(event) => setSpineLetterSpacing(Number(event.target.value))} /></label>
            <p>Для предельно длинных текстов используется многоточие. Полное название и имя автора в данных книги не обрезаются.</p>
          </div>
        </details>
        <div className="cover-actions"><button className="cover-save-button" type="button" onClick={saveCover} disabled={readOnly || pending || !title.trim() || !authorName.trim()}>{pending ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Сохранить обложку</button></div>
        {error && <p className="cover-save-error" role="alert">{error}</p>}
      </div>
    </details>
    <aside className="cover-preview-panel cover-spread-panel" aria-label="Предпросмотр разворота обложки">
      <div className="cover-preview-stage">
      <div className="cover-preview-stage__canvas">
        <div className={`colored-cover-spread colored-cover-spread--frame-${frameStyle}${coverStyle === "template" ? " colored-cover-spread--template" : ""}${coverStyle === "template" && backgroundInsideFrame && showFrame ? " colored-cover-spread--background-inside-frame" : ""}${coverStyle === "template" && coloredBack ? " colored-cover-spread--colored-back" : ""}${coverStyle === "template" && !coloredBack ? ` colored-cover-spread--back-text-${backTextTone}` : ""}${!showFrame ? " colored-cover-spread--no-frame" : ""}`} style={coverStyle === "template" ? ({ ...previewStyle, "--cover-image": `url(${JSON.stringify(useCustomBackground ? customPreviewUrl || selected.backgroundPath : selected.backgroundPath)})` } as CSSProperties) : previewStyle}>
        <section className="colored-cover-side colored-cover-side--back" aria-label="Задняя сторона обложки"><span className="colored-cover-background" /><span className="colored-cover-frame" />{showBackText && <span className="colored-cover-brand">KORKEMBOOKS</span>}</section>
        <BookCoverSpine title={title.trim() || "Название книги"} authorName={spineAuthorName.trim() || authorName.trim() || "Имя автора"} showAuthor={showAuthor} letterSpacing={spineLetterSpacing} onOverflowChange={setSpineTextOverflow} />
        <section className="colored-cover-side colored-cover-side--front" aria-label="Лицевая сторона обложки"><span className="colored-cover-background" /><span className="colored-cover-frame" /><div ref={titlePanelRef} className="colored-cover-title-panel"><h2>{title || "Название книги"}</h2>{showAuthor && <span className="colored-cover-author">{authorName || "Имя автора"}</span>}</div></section>
        </div>
      </div>
      </div>
      <p className="cover-preview-note">Корешок показан условно. Его печатная ширина будет рассчитана по количеству страниц.</p>
      <p className="cover-preview-note cover-spine-warning" role="status">{spineTextOverflow ? "Текст на корешке слишком длинный и показан с многоточием. Для лучшей читаемости сократите название или имя автора." : ""}</p>
    </aside>
  </div>;
}
