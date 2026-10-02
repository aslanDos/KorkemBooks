# Индекс миграций

SQL-файлы лежат в одном уровне, потому что Supabase CLI использует имя вида
`YYYYMMDDHHmmss_description.sql` как версию миграции. Для чтения здесь они
сгруппированы по месяцу и имеют короткий локальный номер `vNN`.

Новая миграция добавляется командой `supabase migration new <description>` и
затем дописывается в конец соответствующего месяца в этом индексе.

## 08 — август 2026

| Версия | Дата | Миграция |
| --- | --- | --- |
| v01 | 29.08 | [create_profiles](202608290001_create_profiles.sql) |
| v02 | 29.08 | [create_books](202608290002_create_books.sql) |
| v03 | 29.08 | [create_chapters_and_questions](202608290003_create_chapters_and_questions.sql) |
| v04 | 29.08 | [seed_girlfriend_questions](202608290004_seed_girlfriend_questions.sql) |
| v05 | 29.08 | [create_answers](202608290005_create_answers.sql) |
| v06 | 29.08 | [atomic_question_reorder](202608290006_atomic_question_reorder.sql) |
| v07 | 29.08 | [atomic_chapter_reorder](202608290007_atomic_chapter_reorder.sql) |
| v08 | 29.08 | [reduce_girlfriend_template_to_8_chapters](202608290008_reduce_girlfriend_template_to_8_chapters.sql) |
| v09 | 29.08 | [create_book_page_images](202608290009_create_book_page_images.sql) |
| v10 | 29.08 | [add_image_display_mode](202608290010_add_image_display_mode.sql) |
| v11 | 29.08 | [create_book_covers](202608290011_create_book_covers.sql) |
| v12 | 29.08 | [add_custom_book_covers](202608290012_add_custom_book_covers.sql) |
| v13 | 29.08 | [add_cover_recipient_visibility](202608290013_add_cover_recipient_visibility.sql) |
| v14 | 30.08 | [add_cover_design_settings](202608300001_add_cover_design_settings.sql) |

## 09 — сентябрь 2026

| Версия | Дата | Миграция |
| --- | --- | --- |
| v01 | 01.09 | [add_book_page_font](202609010001_add_book_page_font.sql) |
| v02 | 01.09 | [allow_multiple_page_images](202609010002_allow_multiple_page_images.sql) |
| v03 | 01.09 | [create_orders](202609010003_create_orders.sql) |
| v04 | 01.09 | [add_book_production_status](202609010004_add_book_production_status.sql) |
| v05 | 01.09 | [add_profile_phone_login](202609010005_add_profile_phone_login.sql) |
| v06 | 01.09 | [limit_one_book_per_user](202609010006_limit_one_book_per_user.sql) |
| v07 | 09.09 | [question_bank](202609090001_question_bank.sql) |
| v08 | 09.09 | [seed_question_bank](202609090002_seed_question_bank.sql) |
| v09 | 09.09 | [question_assignment](202609090003_question_assignment.sql) |
| v10 | 09.09 | [optional_recipient_name](202609090004_optional_recipient_name.sql) |
| v11 | 10.09 | [add_colored_cover_palette](202609100001_add_colored_cover_palette.sql) |
| v12 | 11.09 | [add_cover_style](202609110001_add_cover_style.sql) |
| v13 | 11.09 | [seed_floral_cover_templates](202609110002_seed_floral_cover_templates.sql) |
| v14 | 11.09 | [add_colored_cover_back](202609110003_add_colored_cover_back.sql) |
| v15 | 11.09 | [add_cover_frame_visibility](202609110004_add_cover_frame_visibility.sql) |
| v16 | 11.09 | [add_cover_back_text_tone](202609110005_add_cover_back_text_tone.sql) |
| v17 | 11.09 | [lock_books_after_submission](202609110006_lock_books_after_submission.sql) |
| v18 | 11.09 | [use_literata_for_book_pages](202609110007_use_literata_for_book_pages.sql) |
| v19 | 11.09 | [add_photo_page_placement](202609110008_add_photo_page_placement.sql) |
| v20 | 11.09 | [add_photo_crop](202609110009_add_photo_crop.sql) |
| v21 | 14.09 | [create_book_reading_positions](202609140001_create_book_reading_positions.sql) |
| v22 | 14.09 | [add_answer_format](202609140002_add_answer_format.sql) |
| v23 | 14.09 | [create_book_question_pages](202609140003_create_book_question_pages.sql) |
| v24 | 14.09 | [add_question_page_background](202609140004_add_question_page_background.sql) |
| v25 | 14.09 | [add_photo_rounding](202609140005_add_photo_rounding.sql) |
| v26 | 14.09 | [expand_question_page_background_palette](202609140006_expand_question_page_background_palette.sql) |
| v27 | 14.09 | [add_chapter_page_style](202609140007_add_chapter_page_style.sql) |
| v28 | 14.09 | [add_book_page_background](202609140008_add_book_page_background.sql) |
| v29 | 14.09 | [add_chapter_title_size](202609140009_add_chapter_title_size.sql) |
| v30 | 14.09 | [add_page_text_sizes](202609140010_add_page_text_sizes.sql) |
| v31 | 14.09 | [add_footer_visibility](202609140011_add_footer_visibility.sql) |
| v32 | 15.09 | [add_title_page_title_size](202609150001_add_title_page_title_size.sql) |
| v33 | 15.09 | [add_photo_footer_visibility](202609150002_add_photo_footer_visibility.sql) |
| v34 | 15.09 | [create_book_photo_texts](202609150003_create_book_photo_texts.sql) |
| v35 | 15.09 | [simplify_book_photo_texts](202609150004_simplify_book_photo_texts.sql) |
| v36 | 15.09 | [add_photo_text_effects](202609150005_add_photo_text_effects.sql) |
| v37 | 15.09 | [limit_photo_darkening](202609150006_limit_photo_darkening.sql) |
| v38 | 15.09 | [add_cover_back_text_visibility](202609150007_add_cover_back_text_visibility.sql) |
| v39 | 15.09 | [add_cover_frame_style](202609150008_add_cover_frame_style.sql) |
| v40 | 15.09 | [add_spine_letter_spacing](202609150009_add_spine_letter_spacing.sql) |
| v41 | 15.09 | [add_spine_author_name](202609150010_add_spine_author_name.sql) |
| v42 | 15.09 | [add_cover_background_inside_frame](202609150011_add_cover_background_inside_frame.sql) |
| v43 | 15.09 | [add_cover_text_sizes](202609150012_add_cover_text_sizes.sql) |
| v44 | 15.09 | [add_cover_frame_color](202609150013_add_cover_frame_color.sql) |
| v45 | 15.09 | [allow_book_owner_to_view_cover_uploads](202609150014_allow_book_owner_to_view_cover_uploads.sql) |
| v46 | 15.09 | [add_book_deliveries](202609150015_add_book_deliveries.sql) |
| v47 | 20.09 | [create_password_setup_tokens](202609200001_create_password_setup_tokens.sql) |
| v48 | 21.09 | [assign_book_type_to_profiles](202609210001_assign_book_type_to_profiles.sql) |
| v49 | 21.09 | [add_book_languages](202609210002_add_book_languages.sql) |
| v50 | 21.09 | [question_prompt_suggestions](202609210003_question_prompt_suggestions.sql) |
| v51 | 21.09 | [question_suggestion_feedback](202609210004_question_suggestion_feedback.sql) |
| v52 | 22.09 | [add_book_approval_status](202609220001_add_book_approval_status.sql) |
| v53 | 22.09 | [book_approval_workflow](202609220002_book_approval_workflow.sql) |
| v54 | 22.09 | [admin_edit_question_catalog](202609220003_admin_edit_question_catalog.sql) |
| v55 | 22.09 | [book_finances](202609220004_book_finances.sql) |
| v56 | 22.09 | [allow_unlimited_admin_books](202609220005_allow_unlimited_admin_books.sql) |
| v57 | 23.09 | [book_photo_defaults_and_palette](202609230001_book_photo_defaults_and_palette.sql) |
| v58 | 26.09 | [admin_only_cover_editing](202609260001_admin_only_cover_editing.sql) |
| v59 | 26.09 | [navigation_performance_indexes](202609260002_navigation_performance_indexes.sql) |
| v60 | 26.09 | [update_boyfriend_question_bank](202609260003_update_boyfriend_question_bank.sql) |
| v61 | 29.09 | [update_ru_kk_question_bank](202609290001_update_ru_kk_question_bank.sql) |
| v62 | 29.09 | [cascade_orders_on_book_delete](202609290002_cascade_orders_on_book_delete.sql) |
| v63 | 29.09 | [assign_book_language_to_profiles](202609290003_assign_book_language_to_profiles.sql) |
| v64 | 29.09 | [remove_son_and_daughter_book_types](202609290004_remove_son_and_daughter_book_types.sql) |
| v65 | 29.09 | [allow_owner_question_edits](202609290005_allow_owner_question_edits.sql) |
| v66 | 29.09 | [fix_book_editing_transition](202609290006_fix_book_editing_transition.sql) |
| v67 | 30.09 | [add_photo_collages](202609300001_add_photo_collages.sql) |
