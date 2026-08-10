# 🏢 Estúdio Oh My TD — Equipe de Agentes

Registro versionado da equipe de agentes de IA que trabalha neste repositório.

> **As definições vivem em `.claude/agents/*.md`, que está no `.gitignore`** (junto com `CLAUDE.md` e `skills/`, sob a seção *AI and Agent Context Files*). Elas existem apenas na máquina local. Este documento é o único registro versionado da estrutura — se a pasta `.claude/` se perder, é a partir daqui que a equipe é reconstruída.

---

## Organograma

Um líder que planeja e dez especialistas que executam.

```
studio-lead  ·  Opus 5  ·  effort xhigh  ·  permissionMode plan
   │  investiga, decide e delega — nunca edita código
   │
   ├── game-designer            balanceamento, curvas, economia, retenção
   ├── gameplay-engineer        src/engine/, simulação, determinismo
   ├── ui-ux-engineer           HUD, CSS, responsividade, toque, acessibilidade
   ├── graphics-vfx-engineer    Three.js, Canvas 2D, sprites, partículas, arte
   ├── audio-engineer           Web Audio, BGM procedural, SFX, mixagem
   ├── qa-engineer              Vitest, regressão, harness de balanceamento
   ├── backend-engineer         Supabase, auth, leaderboard, RLS
   ├── performance-engineer     orçamento de quadro, GC, custo em celular
   ├── tech-writer              README, docs, BACKLOG, CLAUDE.md
   └── release-manager          build, tsc, commit semântico, push

                 todos: Sonnet 5 · effort high · permissionMode acceptEdits
                        (release-manager em default — commit e push confirmam)
```

## Configuração e o porquê de cada escolha

| Campo | Líder | Especialistas | Razão |
| :--- | :--- | :--- | :--- |
| `model` | `claude-opus-5` | `claude-sonnet-5` | IDs completos em vez dos aliases `opus`/`sonnet`, para fixar a geração |
| `effort` | `xhigh` | `high` | Decisão arquitetural custa mais raciocínio que execução dirigida |
| `permissionMode` | `plan` | `acceptEdits` | Plano é exploração somente-leitura; execução aceita edição de arquivo mas ainda passa pelo portão de shell |
| `tools` | lista fechada sem `Write`/`Edit` | herdado | O líder é somente-leitura por **duas** vias independentes: o modo *e* a lista de ferramentas |
| `disallowedTools` | — | `Agent` | Só o líder distribui trabalho; evita cascata de spawn e mantém o rastro legível |

Notas de comportamento do harness que sustentam o desenho:

- Profundidade de aninhamento padrão é **3 camadas** (Claude Code ≥ v2.1.219), então o líder consegue acionar especialistas sem configuração extra.
- Só `bypassPermissions`, `acceptEdits` e `auto` do agente pai têm precedência sobre o filho. `plan` **não** está nessa lista, então os especialistas escrevem normalmente mesmo despachados por um líder em modo plano.
- A sintaxe `Agent(tipo1, tipo2)` como allowlist só vale para um agente rodando como thread principal (`claude --agent studio-lead`); dentro de uma definição de subagente a lista entre parênteses é ignorada.

## Como acionar

**`/run-game-studio [briefing]`** é a porta de entrada. Definido em `.claude/commands/run-game-studio.md`, ele resolve o briefing, entrega ao `studio-lead` e cobra o fechamento do ciclo (teste + documentação) antes de reportar.

| Invocação | O que acontece |
| :--- | :--- |
| `/run-game-studio` | o líder lê o backlog de `GAME_DESIGN_REVIEW.md` e propõe o próximo passo |
| `/run-game-studio P0` | expande a fase do plano de execução e entrega a lista inteira ao líder |
| `/run-game-studio <texto livre>` | repassa o briefing literalmente |

Tem `disable-model-invocation: true` — só dispara quando você digita, nunca por conta própria.

Fora do comando: peça pelo nome (`"peça ao game-designer para..."`) quando a disciplina já é óbvia. O roteamento automático também funciona, porque o campo `description` de cada agente descreve quando delegar a ele.

**Agentes novos ou alterados só aparecem após reiniciar a sessão** — a lista é fixada na inicialização.

## Contrato de trabalho da equipe

Vale para todos os especialistas, e está repetido dentro de cada definição na parte que lhe cabe:

1. **Ler `CLAUDE.md` antes de tocar em qualquer arquivo.** Subagentes não recebem o contexto da conversa principal.
2. **O código é a fonte de verdade.** Quando o documento discordar da implementação, o documento está errado — e vira tarefa para o `tech-writer`.
3. **`npm test` precisa continuar verde.** Asserção não se afrouxa para passar; se o comportamento mudou de propósito, isso se declara.
4. **Determinismo é inegociável.** Nada de `Math.random()` em caminho de simulação — quebraria replay e o harness de balanceamento.
5. **Mudança de mecânica só está pronta com teste (`qa-engineer`) e documentação (`tech-writer`) no mesmo pacote.**
6. **pt-BR na prosa e nos comentários; inglês nos identificadores.**

## Se quiser versionar a equipe

Hoje `.gitignore:122` ignora `.claude/` inteiro. Para publicar só as definições mantendo `settings.local.json` privado, o padrão é trocar a linha por:

```gitignore
.claude/*
!.claude/agents/
!.claude/commands/
```

Git não desce em diretório excluído, por isso a exclusão precisa ser `.claude/*` e não `.claude/` para que as reinclusões funcionem.
