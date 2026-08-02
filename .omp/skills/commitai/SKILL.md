---
name: commitai
description: Executa o fluxo de atualização de docs, varredura de segurança, bateria de testes, commit semântico e push.
---

# Slash Command `/commitai`

Este comando executa a esteira automatizada de verificação, documentação e publicação do projeto.

## Etapas do `/commitai`:

1. **Atualização de Documentação**:
   - Atualizar `README.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ARCHITECTURE_CANVAS.md` e `backlog.md` conforme o estado atual do código.

2. **Varredura de Segurança & Dados Sensíveis**:
   - Verificar se há segredos, tokens, senhas ou chaves privadas (ex: Supabase `service_role`, `.env`, tokens privados) na base de código.
   - Confirmar se arquivos de ambiente e sensíveis estão no `.gitignore`.

3. **Bateria de Testes**:
   - Rodar `npm test` e confirmar 100% de aprovação na suíte de testes.

4. **Commit Semântico**:
   - Fazer `git add` dos arquivos necessários.
   - Criar commit seguindo o padrão Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `chore`, etc.).

5. **Push Remoto**:
   - Executar `git push` para sincronizar o repositório remoto.
