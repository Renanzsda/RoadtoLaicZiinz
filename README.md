# BARATÃO TCG — ROAD TO LAIC 2026

> Projeto de análise de metagame e treinamento coletivo de Pokémon TCG, com foco na preparação do grupo BARATÃO TCG para o LAIC de novembro de 2026.

## 1. Objetivo e escopo

Construir uma aplicação **simples, local e auditável**, em **HTML, CSS e JavaScript puro**, que ajude um grupo de jogadores a escolher **15 decks prioritários de treinamento**, identificar melhores/piores matchups, acompanhar mudanças no metagame e registrar treinos.

A aplicação não deve escolher decks exclusivamente por popularidade, nem misturar automaticamente torneios japoneses BO1 com Regionais ocidentais BO3. Deve oferecer duas perspectivas distintas:

1. **Ranking de desempenho:** força competitiva observada, considerando qualidade da amostra.
2. **Prioridade de treinamento:** probabilidade de enfrentar o deck, dificuldade dos confrontos, diversidade e ameaças emergentes.

O Top 15 do grupo é **revisável**. Não apresentar projeções como fatos ou taxas calculadas sem resultados reais.

## 2. Fontes de dados

### Regionais ocidentais (base principal, quatro eventos)

| ID | Evento | Fonte de classificação | Fonte de decks / matchups |
|---|---|---|---|
| 0072 | Baltimore | https://labs.limitlesstcg.com/0072/standings | https://labs.limitlesstcg.com/0072/decks |
| 0074 | Frankfurt | https://labs.limitlesstcg.com/0074/standings | https://labs.limitlesstcg.com/0074/decks |
| 0075 | Recife | https://labs.limitlesstcg.com/0075/standings | https://labs.limitlesstcg.com/0075/decks |
| 0076 | Louisville | https://labs.limitlesstcg.com/0076/standings | https://labs.limitlesstcg.com/0076/decks |

Páginas de confronto possuem geralmente caminhos específicos por arquétipo, por exemplo `https://labs.limitlesstcg.com/0075/decks/n-zoroark/matchups`. **Confirmar a URL e a disponibilidade real dos dados** antes de criar importadores. Não presumir uma API pública.

### Japão (radar de mudança do formato)

- Champions League Yokohama: https://limitlesstcg.com/tournaments/569
- Torneios e City Leagues japonesas: https://limitlesstcg.com/tournaments/jp
- Artigo japonês complementar: https://note.com/osgggg/n/nd544d2574c3e

Contexto: o lançamento ocidental **Reinado Delta** pode modificar os arquétipos relevantes no LAIC. O Japão já apresentou **Mega Rayquaza** em listas de competição. Isso **não basta, por si só, para provar que todas as cartas da expansão estarão legais no LAIC**: validar regras, calendário e listas. City Leagues, por serem eventos menores e frequentemente BO1, devem servir sobretudo para detectar novidades e recorrência, não para substituir amostras grandes de Regionais/Champions League.

**Regra de proveniência:** guardar para cada observação `sourceUrl`, `retrievedAt` (quando aplicável), torneio, região, formato BO1/BO3, definição da métrica e estado `preliminar`/`verificado`/`incompleto`.

## 3. Estado atual da V1

Arquivos:

```text
baratao-road-to-laic/
├── index.html     # interface e estrutura da página
├── styles.css     # estilos e responsividade
├── seed.js        # dados iniciais, ainda preliminares
├── app.js         # componentes, ranking, CRUD, backups, treinos
└── README.md      # este documento
```

Para abrir: extraia o ZIP e abra `index.html` no navegador. Não há dependências, build, servidor ou banco de dados. Dados editados são persistidos no **localStorage do dispositivo/navegador**; o sistema não sincroniza entre integrantes.

Funcionalidades existentes:

- Dashboard, filtro por região e ranking Top 15 experimental.
- Cadastro/edição de torneios e estatísticas por arquétipo.
- Cadastro de matchups com vitórias/derrotas/empates e inversão de perspectiva.
- Registro separado dos treinos de integrantes.
- Exportação e importação de JSON (a importação substitui os dados locais).
- Champions League Yokohama cadastrada como fonte, sem partidas inventadas.

**Atenção:** `seed.js` contém transcrições de números citados em conversas anteriores, **não uma extração auditada diretamente no site nesta implementação**. Valide cada linha antes de fundamentar a escolha final. Não há matriz completa de matchups preenchida. Dados ausentes usam `null` (não zero). Uma ausência de resultados japoneses não significa que o deck não foi usado.

## 4. Regras estatísticas obrigatórias

### 4.1 Dados observados versus aproximações

- Quando houver W/L/D reais: `partidas = wins + losses + draws` e `scoreRate = 100 * (wins + 0.5 * draws) / partidas`.
- Guardar **taxa de vitórias puras** separadamente: `100 * wins / partidas`.
- A definição de win rate exibida pelo Limitless precisa ser conferida antes de reproduzir ou comparar percentuais.
- **Nunca** calcular um win rate agregado real pela média simples de percentuais de eventos.
- Sem W/L/D completos, pode-se exibir o win rate publicado por torneio. A V1 faz uma **aproximação ponderada por número de jogadores**, marcada na interface com `†`. Isto **não equivale ao win rate real agregado por partidas**.
- Sempre mostrar `N` (quantidade de partidas) ao reportar taxa de matchup; tratar amostras pequenas com cautela e, futuramente, intervalos de confiança.
- Separar `BO1`, `BO3`, partidas (games) e rodadas/séries (matches): não combiná-los sem normalização e justificativa.
- Não confundir sucesso em Top Cut, avanço ao Dia 2 e win rate. São métricas diferentes.

### 4.2 Arquétipos e variantes

- Preservar variante original da fonte (`Dragapult`, `Dragapult Dusknoir`, `Dragapult Blaziken` etc.).
- Disponibilizar agrupamento opcional por família, sem apagar a variante.
- Evitar contagem dupla ao agregar diferentes visões do mesmo confronto/torneio.
- Normalizar apelidos/nomes equivalentes (por exemplo, versões de Kangaskhan/Basic Box) **apenas depois da confirmação das decklists**; não assumir equivalência pelo nome.

### 4.3 Força e prioridades

O **índice atual da V1 é experimental**: 45% win rate, 30% presença, 15% conversão ao Dia 2 e 10% recorrência. Há normalizações heurísticas em `app.js`, não validação preditiva. Não interpretar o índice como probabilidade de ganhar o LAIC.

Como direção futura, gerar **duas ordenações**:

1. Desempenho estatístico, com tamanho amostral e incerteza.
2. Prioridade de treino, incluindo presença esperada, matchups difíceis, cobertura de estratégias e ameaças pós-expansão.

Os pesos devem ser configuráveis e acompanhados de metodologia explícita. Não redistribuir valores para indicadores ausentes silenciosamente; indicar cobertura/qualidade dos dados.

### 4.4 Japão e Reinado Delta

- Manter `Japão` e `Ocidente` separados por padrão.
- Champions League: fonte de desempenho e listas; verificar regras e período de legalidade.
- City Leagues: sinalização de decks emergentes e adoção de cartas, com menor confiança por evento; considerar repetição em torneios independentes.
- Nunca transformar uma única boa colocação ou taxa de BO1 automaticamente em expectativa BO3.
- Verificar cartas existentes, rotação e legalidade exata do evento-alvo antes de recomendar decklists.

### 4.5 Treino do grupo

- Cada treino registra integrante, deck, oponente, data, formato e resultados.
- **Não somar treinos locais às estatísticas oficiais.** Exibir comparações lado a lado.
- Futuramente distinguir jogador no play/draw, variante, lista, versão da expansão e comentários de matchup.

## 5. Contrato de dados atual (V1)

Exemplo ilustrativo, sem inventar resultados:

```js
const tournament = {
  id: '0076',
  name: 'Louisville Regional',
  region: 'Ocidente',
  format: 'BO3',
  date: '2026-10-09',
  players: 2927,
  url: 'https://labs.limitlesstcg.com/0076/standings',
  status: 'preliminar'
};

const result = {
  tournamentId: '0076',
  deck: 'Dragapult',
  players: null,
  winRateReported: null,
  day2: null,
  wins: null,
  losses: null,
  draws: null
};

const matchup = {
  tournamentId: '0076',
  deck: 'Dragapult',
  opponent: "N's Zoroark",
  wins: 0,
  losses: 0,
  draws: 0
};
// Exemplo de formato apenas. Na UI, não cadastrar confronto de zero partidas.
```

Observação: a V1 usa `SEED` em `seed.js` e chave de armazenamento em `app.js`. **Alterar o seed não atualiza automaticamente dados já salvos no localStorage.** Faça backup antes de restaurar a base.

## 6. Roteiro priorizado para continuar no Codex

### Fase 1 — Consolidar e validar dados

- [ ] Validar IDs, nome, datas, formato, participantes e números dos quatro Regionais nas fontes.
- [ ] Criar controle de proveniência por linha: URL, data de coleta, verificado/incompleto.
- [ ] Extrair resultados por arquétipo **sem estimar W/L/D a partir de win rate arredondado**.
- [ ] Coletar matchups de cada Regional com totais de W/L/D e identificação de variantes.
- [ ] Detectar duplicatas e conferir totais antes de agregar.
- [ ] Documentar limites de cobertura (ex.: só jogadores com lista publicada).

### Fase 2 — Estatística confiável

- [ ] Funções puras e testáveis para presença, win rate, empate, conversão e matchup.
- [ ] Consolidar por partidas reais e nunca por médias simples de percentuais.
- [ ] Matriz 15 × 15 com `N`, W/L/D, confiança e fonte.
- [ ] Separar ranking de desempenho de prioridade de treino.
- [ ] Filtros por evento, período, região, BO1/BO3 e variante.

### Fase 3 — Japão / expansão

- [ ] Importar listas e resultados verificáveis de Yokohama.
- [ ] Coletar City Leagues relevantes e recorrência de Top Cut por deck.
- [ ] Comparar arquétipos e cartas novas com os Regionais ocidentais.
- [ ] Sinalizar legalidade e disponibilidade das cartas no LAIC.

### Fase 4 — Grupo e experiência

- [ ] Selecionar oficialmente os 15 decks-alvo.
- [ ] Registro dos participantes e evolução individual/coletiva.
- [ ] Plano de treino priorizado por jogador/deck e histórico de sessões.
- [ ] Gráficos, exportações e, somente se necessário, banco de dados compartilhado.

## 7. Diretrizes para o Codex

1. **Não reescreva o projeto em React/TypeScript sem necessidade ou pedido explícito.** Preserve JavaScript puro nesta etapa.
2. Leia este README, `seed.js` e `app.js` antes de alterar dados/cálculos.
3. Preserve o funcionamento local offline, salvo mudança de arquitetura solicitada.
4. Não crie resultados, cartas, listas, matchups ou percentuais de exemplo apresentados como reais.
5. Separar dados observados, estimados e indisponíveis; não converter `null` em zero.
6. Sempre cite a origem em dados importados; respeite limitações de acesso do site e não dependa de endpoints não confirmados.
7. Não misture BO1/BO3 nem treinos com campeonatos oficiais sem segmentação visível.
8. Mantenha exportação/backup JSON e compatibilidade com dados existentes; versionar migrações de schema.
9. Escreva testes para fórmulas, inversão de matchups, duplicação e valores faltantes.
10. Antes de concluir cada alteração, descreva arquivos modificados, testes executados e limitações.

## 8. Definição de pronto para a próxima entrega

Uma V2 inicial estará pronta quando **os quatro Regionais estiverem auditados**, a matriz de matchups mostrar **apenas confrontos reais com amostra**, houver **rankings separados** para desempenho e treino, e o usuário puder **exportar/restaurar** todos os dados sem perda.

## 9. Prompt sugerido para iniciar o Codex

> Você está trabalhando no projeto BARATÃO TCG — ROAD TO LAIC 2026. Leia `README.md`, `seed.js`, `app.js`, `index.html` e `styles.css`. Preserve a arquitetura HTML/CSS/JavaScript puro e o funcionamento local. Sua primeira tarefa é auditar o modelo de dados e a lógica de ranking, identificar aproximações e problemas de integridade, propor uma implementação incremental para importar resultados verificáveis dos quatro Regionais (0072, 0074, 0075, 0076) e incluir testes. Não invente dados nem assuma que o Limitless oferece API pública. Diferencie BO1/BO3, Japão/Ocidente, arquétipos/variantes e desempenho oficial/treinos. Explique o que é verificável antes de alterar a base.

---

**Princípio do projeto:** a ferramenta deve ajudar o grupo BARATÃO TCG a treinar melhor para o LAIC, mostrando tanto aquilo que os dados confirmam quanto aquilo que ainda não sabemos.
