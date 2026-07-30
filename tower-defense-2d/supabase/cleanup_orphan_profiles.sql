-- ==========================================================================
-- LIMPEZA DAS IDENTIDADES ANONIMAS ORFAS
-- ==========================================================================
--
-- CONTEXTO
-- O `ensureAuth()` do DatabaseManager nao serializava chamadas concorrentes, entao
-- cada carregamento do jogo disparava varios `signInAnonymously()` em paralelo — ate
-- 11 no mesmo segundo. Cada um criava um usuario anonimo novo, o trigger
-- `handle_new_user` criava um `profiles` para cada, e o ultimo login a resolver
-- sobrescrevia a identidade. Resultado: 56 perfis para um jogador so, e o perfil
-- salvo (`skadi_xxxYYZz`) ficou preso a um uid que nunca mais era selecionado.
--
-- O bug ja esta corrigido no codigo (ensureAuth compartilha o login em voo, e o
-- perfil agora e local-first em `td2d_profile_v1`). Este script limpa o lixo que
-- ficou para tras e libera o nome de usuario, que e UNIQUE em `public.profiles`.
--
-- COMO RODAR
-- Supabase Dashboard -> SQL Editor. Rode o PASSO 1 sozinho e confira os numeros
-- antes de executar o PASSO 2. Nao rode o arquivo inteiro de uma vez.
--
-- O QUE SE PERDE
-- Nada de progresso real. Estrelas, talentos e conquistas sao local-first: vivem no
-- localStorage e voltam para o servidor pelo outbox no proximo carregamento. As 3
-- runs registradas sao descartaveis (onda 10 / 72 kills, ja duplicada entre duas
-- identidades pelo proprio bug).
-- ==========================================================================


-- --------------------------------------------------------------------------
-- PASSO 1 — CONFERENCIA (rode sozinho, nao altera nada)
-- --------------------------------------------------------------------------

-- Quantos usuarios anonimos existem?
select count(*) as total_anonimos
from auth.users
where is_anonymous = true;

-- Existe algum usuario NAO anonimo? Se retornar > 0, PARE: alguem criou conta de
-- verdade e o PASSO 2 precisa ser revisto antes de rodar.
select count(*) as total_nao_anonimos
from auth.users
where is_anonymous = false or is_anonymous is null;

-- Panorama dos perfis: os customizados sao os que interessam.
select
  p.id,
  p.username,
  p.avatar_id,
  p.created_at,
  (select count(*) from public.runs r where r.player_id = p.id) as runs
from public.profiles p
order by p.created_at;


-- --------------------------------------------------------------------------
-- PASSO 2 — LIMPEZA
-- --------------------------------------------------------------------------
-- Apaga TODAS as identidades anonimas. O `on delete cascade` de profiles,
-- player_state, player_achievements e runs limpa o resto sozinho.
--
-- Zerar tudo (em vez de preservar o uid do skadi_xxxYYZz) e de proposito: o navegador
-- nao tem como reassumir um uid anonimo especifico, entao preservar aquela linha so
-- manteria o nome ocupado por um registro inalcancavel — exatamente o beco sem saida
-- que causava "Este nome de usuário já está em uso." ao tentar salvar o nome de volta.

begin;

delete from auth.users
where is_anonymous = true;

-- Confira que sobrou zero antes de confirmar.
select count(*) as perfis_restantes from public.profiles;

commit;
-- Se algo parecer errado acima, troque `commit` por `rollback`.


-- --------------------------------------------------------------------------
-- PASSO 3 — NO NAVEGADOR (obrigatorio)
-- --------------------------------------------------------------------------
-- O navegador ainda guarda o JWT de um usuario que acabou de ser apagado. Se ele for
-- reaproveitado, todo write falha por violacao de chave estrangeira. Limpe o token
-- ANTES de abrir o jogo de novo, rodando isto no console do DevTools:
--
--   Object.keys(localStorage)
--     .filter((k) => k.startsWith('sb-'))
--     .forEach((k) => localStorage.removeItem(k));
--
-- Isso remove somente a sessao do Supabase. As chaves `td2d_*` (estrelas, talentos,
-- conquistas, perfil, outbox) ficam intactas.
--
-- Depois: recarregue o jogo (agora nasce UMA identidade anonima), abra Perfil, digite
-- `skadi_xxxYYZz`, escolha Mago Solar e salve. O nome esta livre e vai persistir.
