import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key, bucket_id text, owner_id text, name text);
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
const migrations=(await readdir(root+'/supabase/migrations')).sort();
for(const file of migrations.filter(f=>f <= '202608290008_reduce_girlfriend_template_to_8_chapters.sql')) {
 await db.exec('begin;'+await readFile(root+'/supabase/migrations/'+file,'utf8')+'commit;');
}
for (const file of ['202608290009_create_book_page_images.sql', '202609010002_allow_multiple_page_images.sql']) await db.exec(await readFile(root+'/supabase/migrations/'+file,'utf8'));
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
await db.exec(`insert into auth.users(id) values ('${owner}'),('${other}');`);
const legacy=(await db.query(`insert into books(owner_id,type_id,title,author_name,recipient_name) select '${owner}',id,'Legacy','Author','Recipient' from book_types where slug='girlfriend' returning id`)).rows[0].id;
const oldQuestion=(await db.query('select id,prompt from questions order by created_at limit 1')).rows[0];
await db.query(`insert into answers(question_id,book_id,owner_id,answer_text) values ($1,$2,$3,'Saved history')`,[oldQuestion.id,legacy,owner]);
for(const file of migrations.filter(f=>f.startsWith('20260909'))) await db.exec('begin;'+await readFile(root+'/supabase/migrations/'+file,'utf8')+'commit;');
assert.equal((await db.query('select count(*)::int count from question_catalog')).rows[0].count,1100);
assert.deepEqual((await db.query('select prompt from questions where id=$1',[oldQuestion.id])).rows[0],{prompt:oldQuestion.prompt});
assert.equal((await db.query('select answer_text from answers where question_id=$1',[oldQuestion.id])).rows[0].answer_text,'Saved history');
assert.equal((await db.query('select count(*)::int count from chapters where book_id=$1',[legacy])).rows[0].count,8);
await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
let books=[];
for(const type of (await db.query('select id,slug from book_types order by sort_order')).rows){
 const book=(await db.query(`insert into books(owner_id,type_id,title,author_name,recipient_name) values($1,$2,'New book','Author','Recipient') returning id`,[owner,type.id])).rows[0].id;books.push(book);
 assert.equal((await db.query('select count(*)::int count from chapters where book_id=$1',[book])).rows[0].count,4);
 assert.equal((await db.query('select count(*)::int count from questions where book_id=$1',[book])).rows[0].count,100);
 assert.ok((await db.query('select count(*)::int count from questions where book_id=$1 group by chapter_id',[book])).rows.every(r=>r.count===25));
}
const book=books[0];const chapters=(await db.query('select id from chapters where book_id=$1 order by position',[book])).rows.map(c=>c.id);
const q=(await db.query('select id from questions where chapter_id=$1 order by position',[chapters[0]])).rows[0].id;
await db.query(`insert into answers(question_id,book_id,owner_id,answer_text) values($1,$2,$3,'Keep this answer')`,[q,book,owner]);
await db.query(`insert into book_page_images(book_id,question_id,owner_id,storage_path,mime_type,size_bytes) values($1,$2,$3,'test/photo.jpg','image/jpeg',100)`,[book,q,owner]);
const russianPrompt=(await db.query('select prompt from questions where id=$1',[q])).rows[0].prompt;
await db.query("update chapters set title='Моя глава' where id=$1",[chapters[1]]);
await db.exec('reset role;'+await readFile(root+'/supabase/migrations/202609210002_add_book_languages.sql','utf8'));
await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
await assert.rejects(db.query("update books set language='en' where id=$1",[book]));
await db.exec('reset role; set role service_role;');
assert.equal((await db.query("select set_book_language($1,'en') ok",[book])).rows[0].ok,true);
await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${owner}';`);
const translated=(await db.query('select id,prompt from questions where id=$1',[q])).rows[0];
assert.equal(translated.id,q);
assert.notEqual(translated.prompt,russianPrompt);
assert.equal((await db.query('select answer_text from answers where question_id=$1',[q])).rows[0].answer_text,'Keep this answer');
assert.equal((await db.query('select storage_path from book_page_images where question_id=$1',[q])).rows[0].storage_path,'test/photo.jpg');
assert.equal((await db.query('select title from chapters where id=$1',[chapters[1]])).rows[0].title,'Моя глава');
assert.equal((await db.query('select title from chapters where id=$1',[chapters[0]])).rows[0].title,'How It All Began');
await db.exec('reset role;'+await readFile(root+'/supabase/migrations/202609210003_question_prompt_suggestions.sql','utf8'));
await db.exec(await readFile(root+'/supabase/migrations/202609210004_question_suggestion_feedback.sql','utf8'));
await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
await assert.rejects(db.query('select id from question_prompt_suggestions'));
await db.exec('reset role; set role service_role;');
const suggestion=(await db.query('insert into question_prompt_suggestions(book_id,question_id,owner_id,language,original_prompt,suggested_prompt) values($1,$2,$3,\'en\',$4,\'Suggested wording?\') returning id',[book,q,owner,translated.prompt])).rows[0].id;
assert.equal((await db.query("select resolve_question_prompt_suggestion($1,'approved','Approved wording?','Спасибо за уточнение') ok",[suggestion])).rows[0].ok,true);
assert.deepEqual((await db.query('select status,review_comment,resolved_prompt from question_prompt_suggestions where id=$1',[suggestion])).rows[0],{status:'approved',review_comment:'Спасибо за уточнение',resolved_prompt:'Approved wording?'});
await db.exec('reset role;');
assert.equal((await db.query('select prompt from questions where id=$1',[q])).rows[0].prompt,'Approved wording?');
assert.equal((await db.query('select answer_text from answers where question_id=$1',[q])).rows[0].answer_text,'Keep this answer');
await db.exec('set role service_role;');
assert.equal((await db.query("select set_book_language($1,'kk') ok",[book])).rows[0].ok,true);
await db.exec('reset role;');
assert.notEqual((await db.query('select prompt from questions where id=$1',[q])).rows[0].prompt,'Approved wording?');
await db.exec('set role service_role;');
assert.equal((await db.query("select set_book_language($1,'en') ok",[book])).rows[0].ok,true);
await db.exec('reset role;');
assert.equal((await db.query('select prompt from questions where id=$1',[q])).rows[0].prompt,'Approved wording?');
assert.equal((await db.query('select answer_text from answers where question_id=$1',[q])).rows[0].answer_text,'Keep this answer');
assert.equal((await db.query('select storage_path from book_page_images where question_id=$1',[q])).rows[0].storage_path,'test/photo.jpg');
assert.equal((await db.query('select prompt from questions where id=$1',[oldQuestion.id])).rows[0].prompt,oldQuestion.prompt);
await db.exec('set role service_role;');
const rejected=(await db.query('insert into question_prompt_suggestions(book_id,question_id,owner_id,language,original_prompt,suggested_prompt) values($1,$2,$3,\'en\',\'Approved wording?\',\'Another wording?\') returning id',[book,q,owner])).rows[0].id;
await assert.rejects(db.query('insert into question_prompt_suggestions(book_id,question_id,owner_id,language,original_prompt,suggested_prompt) values($1,$2,$3,\'en\',\'Approved wording?\',\'Duplicate wording?\')',[book,q,owner]));
assert.equal((await db.query("select resolve_question_prompt_suggestion($1,'rejected',null,'Не меняем смысл вопроса') ok",[rejected])).rows[0].ok,true);
assert.deepEqual((await db.query('select status,review_comment,resolved_prompt from question_prompt_suggestions where id=$1',[rejected])).rows[0],{status:'rejected',review_comment:'Не меняем смысл вопроса',resolved_prompt:null});
await db.exec('reset role;');
assert.equal((await db.query('select prompt from questions where id=$1',[q])).rows[0].prompt,'Approved wording?');
await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${owner}';`);
const call=async(ids,target,only=false)=>(await db.query('select assign_book_questions($1,$2::uuid[],$3,$4) ok',[book,ids,target,only])).rows[0].ok;
assert.equal(await call([q],chapters[1]),true);
assert.equal((await db.query('select chapter_id from questions where id=$1',[q])).rows[0].chapter_id,chapters[1]);
assert.equal(await call([q],null),true);
assert.equal(await call([q],chapters[2],true),true);
assert.equal(await call([q],chapters[3],true),false); // stale pool selection
assert.equal(await call([q,q],chapters[3]),false); // duplicate selection
assert.equal((await db.query('select remove_book_chapter($1,$2) ok',[book,chapters[2]])).rows[0].ok,true);
assert.equal((await db.query('select chapter_id from questions where id=$1',[q])).rows[0].chapter_id,null);
assert.equal((await db.query('select answer_text from answers where question_id=$1',[q])).rows[0].answer_text,'Keep this answer');
assert.equal((await db.query('select storage_path from book_page_images where question_id=$1',[q])).rows[0].storage_path,'test/photo.jpg');
assert.equal(await call([q],chapters[2]),false); // deleted chapter
assert.equal(await call([q],chapters[0],true),true);
assert.equal((await db.query('select progress from books where id=$1',[book])).rows[0].progress,1);
assert.equal((await db.query('select move_question($1,$2) ok',[q,'up'])).rows[0].ok,true);
assert.deepEqual((await db.query('select position from questions where chapter_id=$1 order by position',[chapters[0]])).rows.map(r=>r.position),Array.from({length:25},(_,i)=>i+1));
const foreignChapter=(await db.query('select id from chapters where book_id=$1 limit 1',[books[1]])).rows[0].id;
assert.equal(await call([q],foreignChapter),false); // another book, same owner
await assert.rejects(db.query('select instantiate_book_template($1)',[book]));
await assert.rejects(db.query('update question_catalog set prompt=$1',['Custom']));
await assert.rejects(db.query("update questions set prompt='Custom' where id=$1",[q]));
await assert.rejects(db.query("insert into questions(book_id,chapter_id,prompt,position) values($1,$2,'Custom',100)",[book,chapters[0]]));
await db.exec(`set request.jwt.claim.sub='${other}';`);
assert.equal(await call([q],null),false);
assert.equal((await db.query('select remove_book_chapter($1,$2) ok',[book,chapters[0]])).rows[0].ok,false);
assert.equal((await db.query('select move_question($1,$2) ok',[q,'down'])).rows[0].ok,false);
assert.equal((await db.query('select count(*)::int count from questions where book_id=$1',[book])).rows[0].count,0);
await db.exec(`set request.jwt.claim.sub='${owner}';`);
const fifth=(await db.query("insert into chapters(book_id,title,position) values($1,'New chapter',5) returning id",[book])).rows[0].id;
assert.ok(fifth);
for (const chapter of (await db.query('select id from chapters where book_id=$1 and deleted_at is null',[book])).rows) {
 assert.equal((await db.query('select remove_book_chapter($1,$2) ok',[book,chapter.id])).rows[0].ok,true);
}
assert.equal((await db.query('select count(*)::int count from questions where book_id=$1 and chapter_id is null',[book])).rows[0].count,100);
assert.equal((await db.query('select progress from books where id=$1',[book])).rows[0].progress,0);
const replacement=(await db.query("insert into chapters(book_id,title,position) values($1,'Restart',6) returning id",[book])).rows[0].id;
const allIds=(await db.query('select id from questions where book_id=$1',[book])).rows.map(q=>q.id);
assert.equal(await call(allIds,replacement,true),true);
assert.equal((await db.query('select count(*)::int count from questions where book_id=$1 and chapter_id=$2',[book,replacement])).rows[0].count,100);
assert.equal((await db.query('select answer_text from answers where question_id=$1',[q])).rows[0].answer_text,'Keep this answer');
await db.exec("reset role; alter table public.books add column production_status text not null default 'writing';");
await db.exec(await readFile(root+'/supabase/migrations/202609220003_admin_edit_question_catalog.sql','utf8'));
const catalog=(await db.query('select catalog_id from questions where id=$1',[q])).rows[0].catalog_id;
const oldEnglish=(await db.query("select prompt from question_catalog_translations where catalog_id=$1 and language='en'",[catalog])).rows[0].prompt;
await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
await assert.rejects(db.query("select admin_edit_question_catalog($1,'en',$2,'Edited for everyone?')",[catalog,oldEnglish]));
await db.exec('reset role; set role service_role;');
assert.equal((await db.query("select admin_edit_question_catalog($1,'en',$2,'Edited for everyone?') ok",[catalog,oldEnglish])).rows[0].ok,true);
assert.equal((await db.query("select admin_edit_question_catalog($1,'en',$2,'Stale edit?') ok",[catalog,oldEnglish])).rows[0].ok,false);
await db.exec('reset role;');
assert.equal((await db.query('select prompt from questions where id=$1',[q])).rows[0].prompt,'Approved wording?');
assert.equal((await db.query('select answer_text from answers where question_id=$1',[q])).rows[0].answer_text,'Keep this answer');
const editable=(await db.query('select id,catalog_id,prompt from questions where book_id=$1 and catalog_id<>$2 limit 1',[book,catalog])).rows[0];
await db.exec('set role service_role;');
assert.equal((await db.query("select admin_edit_question_catalog($1,'en',$2,'Updated English prompt?') ok",[editable.catalog_id,editable.prompt])).rows[0].ok,true);
await db.exec('reset role;');
assert.equal((await db.query('select prompt from questions where id=$1',[editable.id])).rows[0].prompt,'Updated English prompt?');
await db.query("update books set production_status='approval' where id=$1",[book]);
await db.exec('set role service_role;');
assert.equal((await db.query("select admin_edit_question_catalog($1,'en','Updated English prompt?','Later prompt?') ok",[editable.catalog_id])).rows[0].ok,true);
await db.exec('reset role;');
assert.equal((await db.query('select prompt from questions where id=$1',[editable.id])).rows[0].prompt,'Updated English prompt?');
await db.exec('reset role;'+await readFile(root+'/supabase/migrations/202609260003_update_boyfriend_question_bank.sql','utf8'));
const boyfriendSource=JSON.parse(await readFile(root+'/content/question-bank-boyfriend-v2.json','utf8'));
const boyfriendType=(await db.query("select id from book_types where slug='boyfriend'")).rows[0].id;
assert.equal((await db.query('select count(*)::int count from question_catalog where book_type_id=$1',[boyfriendType])).rows[0].count,150);
assert.deepEqual(
  (await db.query('select prompt from question_catalog where book_type_id=$1 order by number',[boyfriendType])).rows.map(row=>row.prompt),
  boyfriendSource.locales.ru.questions,
);
assert.deepEqual(
  (await db.query("select translations.prompt from question_catalog catalog join question_catalog_translations translations on translations.catalog_id=catalog.id and translations.language='kk' where catalog.book_type_id=$1 order by catalog.number",[boyfriendType])).rows.map(row=>row.prompt),
  boyfriendSource.locales.kk.questions,
);
const existingBoyfriend=(await db.query('select id from books where type_id=$1 order by created_at limit 1',[boyfriendType])).rows[0].id;
assert.equal((await db.query('select count(*)::int count from questions where book_id=$1',[existingBoyfriend])).rows[0].count,150);
assert.equal((await db.query('select count(*)::int count from questions where book_id=$1 and chapter_id is null',[existingBoyfriend])).rows[0].count,50);
await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
const boyfriendBook=(await db.query("insert into books(owner_id,type_id,title,author_name,recipient_name,language) values($1,$2,'Boyfriend','Author','Recipient','ru') returning id",[owner,boyfriendType])).rows[0].id;
assert.equal((await db.query('select count(*)::int count from chapters where book_id=$1',[boyfriendBook])).rows[0].count,5);
assert.deepEqual((await db.query('select count(*)::int count from questions where book_id=$1 group by chapter_id order by min(position)',[boyfriendBook])).rows.map(row=>row.count),[30,30,30,30,30]);
assert.equal((await db.query('select prompt from questions where book_id=$1 order by catalog_id limit 1',[boyfriendBook])).rows.length,1);
assert.equal((await db.query('select prompt from questions where book_id=$1 and catalog_id=(select id from question_catalog where book_type_id=$2 and number=1)',[boyfriendBook,boyfriendType])).rows[0].prompt,boyfriendSource.locales.ru.questions[0]);
await db.exec('reset role; set role service_role;');
assert.equal((await db.query("select set_book_language($1,'kk') ok",[boyfriendBook])).rows[0].ok,true);
await db.exec('reset role;');
assert.equal((await db.query('select prompt from questions where book_id=$1 and catalog_id=(select id from question_catalog where book_type_id=$2 and number=150)',[boyfriendBook,boyfriendType])).rows[0].prompt,boyfriendSource.locales.kk.questions[149]);
assert.deepEqual((await db.query('select title from chapters where book_id=$1 order by position',[boyfriendBook])).rows.map(row=>row.title),boyfriendSource.locales.kk.chapters.map(chapter=>chapter.title));
await db.exec('reset role;'+await readFile(root+'/supabase/migrations/202609290001_update_ru_kk_question_bank.sql','utf8'));
const updatedSource=JSON.parse(await readFile(root+'/content/question-bank-ru-kk-v3.json','utf8'));
const wifeSource=updatedSource.types.find(type=>type.slug==='wife');
assert.equal((await db.query('select count(*)::int count from chapters where book_id=$1 and deleted_at is null',[books[2]])).rows[0].count,6);
assert.equal((await db.query('select count(*)::int count from questions where book_id=$1 and chapter_id is not null',[books[2]])).rows[0].count,150);
assert.deepEqual((await db.query('select title from chapters where book_id=$1 and deleted_at is null order by position',[books[2]])).rows.map(row=>row.title),wifeSource.locales.ru.chapters.map(chapter=>chapter.title));
assert.equal((await db.query('select count(*)::int count from questions where book_id=$1',[books[0]])).rows[0].count,100); // approval content remains frozen
for (const sourceType of updatedSource.types) {
  const type=(await db.query('select id from book_types where slug=$1',[sourceType.slug])).rows[0];
  assert.equal((await db.query('select count(*)::int count from question_catalog where book_type_id=$1',[type.id])).rows[0].count,150);
  assert.deepEqual((await db.query('select prompt from question_catalog where book_type_id=$1 order by number',[type.id])).rows.map(row=>row.prompt),sourceType.locales.ru.questions);
  assert.deepEqual((await db.query("select translations.prompt from question_catalog catalog join question_catalog_translations translations on translations.catalog_id=catalog.id and translations.language='kk' where catalog.book_type_id=$1 order by catalog.number",[type.id])).rows.map(row=>row.prompt),sourceType.locales.kk.questions);
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
  const localizedBook=(await db.query("insert into books(owner_id,type_id,title,author_name,recipient_name,language) values($1,$2,'Localized','Author','Recipient','ru') returning id",[owner,type.id])).rows[0].id;
  assert.equal((await db.query('select count(*)::int count from chapters where book_id=$1',[localizedBook])).rows[0].count,sourceType.locales.ru.chapters.length);
  assert.equal((await db.query('select count(*)::int count from questions where book_id=$1',[localizedBook])).rows[0].count,150);
  assert.ok((await db.query('select count(*)::int count from questions where book_id=$1 group by chapter_id',[localizedBook])).rows.every(row=>row.count===sourceType.questionsPerChapter));
  await db.exec('reset role; set role service_role;');
  assert.equal((await db.query("select set_book_language($1,'kk') ok",[localizedBook])).rows[0].ok,true);
  await db.exec('reset role;');
  assert.deepEqual((await db.query('select title from chapters where book_id=$1 order by position',[localizedBook])).rows.map(row=>row.title),sourceType.locales.kk.chapters.map(chapter=>chapter.title));
  assert.equal((await db.query('select prompt from questions where book_id=$1 and catalog_id=(select id from question_catalog where book_type_id=$2 and number=150)',[localizedBook,type.id])).rows[0].prompt,sourceType.locales.kk.questions[149]);
}
console.log('PASS: 11 RU/KK catalogs, admin catalog editing, per-book overrides and answers preserved, approval frozen, assignment, pool, deletion, progress and ownership.');
await db.close();
