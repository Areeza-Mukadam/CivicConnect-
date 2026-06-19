
create or replace function public.match_kb_chunks(query_embedding vector(1536), match_count int default 5)
returns table (id uuid, source_type text, title text, content text, similarity float)
language sql stable set search_path = public as $$
  select k.id, k.source_type, k.title, k.content, 1 - (k.embedding <=> query_embedding) as similarity
  from public.kb_chunks k
  where k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
