import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
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
assert.equal((await db.query('select count(*)::int count from question_catalog')).rows[0].count,1300);
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
console.log('PASS: 13 catalogs, 4×25 per book, legacy preservation, assignment, pool, stale selection, duplicate selection, chapter deletion, preserved answers and photos, progress, reorder, cross-book and cross-user rejection, immutable wording and custom-insert rejection.');
await db.close();
