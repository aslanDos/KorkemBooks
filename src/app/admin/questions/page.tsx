import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { CatalogQuestionList } from "@/components/admin/catalog-question-list";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BOOK_LANGUAGES, isAvailableBookLanguage } from "@/lib/books/language";
import { isRemovedBookTypeSlug } from "@/lib/books/catalog";

type SearchParams = { type?: string; language?: string };

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const admin = createSupabaseAdminClient();
  if (!admin) return <><DashboardHeader title="Каталог вопросов" /><p role="alert">Сервис временно недоступен.</p></>;

  const { data: types, error: typesError } = await admin.from("book_types")
    .select("id, slug, name").eq("is_active", true).order("sort_order");
  const availableTypes = types?.filter((type) => !isRemovedBookTypeSlug(type.slug));
  const selectedType = availableTypes?.find((type) => type.slug === params.type) ?? availableTypes?.[0];
  const language = isAvailableBookLanguage(params.language) ? params.language : "ru";
  const { data: questions, error: questionsError } = selectedType
    ? await admin.from("question_catalog")
      .select("id, number, prompt, question_catalog_translations(language, prompt)")
      .eq("book_type_id", selectedType.id).order("number")
    : { data: [], error: null };
  const rows = (questions ?? []).map((question) => {
    const translation = question.question_catalog_translations.find((item) => item.language === language);
    return { id: question.id, number: question.number, prompt: language === "ru" ? question.prompt : translation?.prompt ?? question.prompt, missingTranslation: language !== "ru" && !translation };
  });

  return <>
    <DashboardHeader title="Каталог вопросов" description="Общие формулировки для всех типов книг" />
    <section className="admin-card catalog-editor">
      <p className="catalog-editor__notice">Изменения применяются к новым книгам и к книгам на этапах написания и редактуры. Ответы и индивидуальные исправления сохраняются; книги на согласовании и в производстве не меняются.</p>
      {typesError || questionsError ? <p role="alert" className="admin-form-error">Не удалось загрузить каталог вопросов.</p> : <>
        <nav className="catalog-editor__types" aria-label="Тип получателя">
          {availableTypes?.map((type) => <Link key={type.id} className={type.id === selectedType?.id ? "is-active" : ""} href={`/admin/questions?type=${encodeURIComponent(type.slug)}&language=${language}`}>{type.name}</Link>)}
        </nav>
        <nav className="catalog-editor__languages" aria-label="Язык вопросов">
          {BOOK_LANGUAGES.map((item) => <Link key={item.value} className={item.value === language ? "is-active" : ""} href={`/admin/questions?type=${encodeURIComponent(selectedType?.slug ?? "")}&language=${item.value}`}>{item.label}</Link>)}
        </nav>
        {selectedType && <CatalogQuestionList key={`${selectedType.id}:${language}`} questions={rows} language={language} />}
      </>}
    </section>
  </>;
}
