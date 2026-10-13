# BARATÃO TCG — ROAD TO LAIC 2026

> Projeto de análise de metagame e treinamento coletivo de Pokémon TCG, com foco na preparação do grupo BARATÃO TCG para o LAIC de novembro de 2026.

**Recorte ativo da V2:** somente MD3 dos Regionais 0072, 0073, 0074, 0075 e 0076. Yokohama e City Leagues permanecem documentados e seus registros existentes são preservados, mas não entram no ranking deste recorte. O 0073 é o Regional de Brisbane; os dados dos cinco eventos foram coletados das páginas públicas do Limitless Labs e mantêm URLs de proveniência por linha.

## 1. Objetivo e escopo

Construir uma aplicação **simples, local e auditável**, em **HTML, CSS e JavaScript puro**, que ajude um grupo de jogadores a escolher **15 decks prioritários de treinamento**, identificar melhores/piores matchups, acompanhar mudanças no metagame e registrar treinos.

A aplicação não deve escolher decks exclusivamente por popularidade, nem misturar automaticamente torneios japoneses BO1 com Regionais ocidentais BO3. Deve oferecer duas perspectivas distintas:

1. **Ranking de desempenho:** força competitiva observada, considerando qualidade da amostra.
2. **Prioridade de treinamento:** probabilidade de enfrentar o deck, dificuldade dos confrontos, diversidade e ameaças emergentes.

O Top 15 do grupo é **revisável**. Não apresentar projeções como fatos ou taxas calculadas sem resultados reais.

## 2. Fontes de dados

### Regionais ocidentais (base principal, cinco eventos)

| ID | Evento | Fonte de classificação | Fonte de decks / matchups |
|---|---|---|---|
| 0072 | Baltimore | https://labs.limitlesstcg.com/0072/standings | https://labs.limitlesstcg.com/0072/decks |
| 0073 | Brisbane | https://labs.limitlesstcg.com/0073/standings | https://labs.limitlesstcg.com/0073/decks |
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

- [ ] Validar IDs, nome, datas, formato, participantes e números dos cinco Regionais nas fontes.
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

Uma V2 inicial estará pronta quando **os cinco Regionais estiverem auditados**, a matriz de matchups mostrar **apenas confrontos reais com amostra**, houver **rankings separados** para desempenho e treino, e o usuário puder **exportar/restaurar** todos os dados sem perda.

## 9. Prompt sugerido para iniciar o Codex

> Você está trabalhando no projeto BARATÃO TCG — ROAD TO LAIC 2026. Leia `README.md`, `seed.js`, `app.js`, `index.html` e `styles.css`. Preserve a arquitetura HTML/CSS/JavaScript puro e o funcionamento local. Sua primeira tarefa é auditar o modelo de dados e a lógica de ranking, identificar aproximações e problemas de integridade, propor uma implementação incremental para importar resultados verificáveis dos quatro Regionais (0072, 0074, 0075, 0076) e incluir testes. Não invente dados nem assuma que o Limitless oferece API pública. Diferencie BO1/BO3, Japão/Ocidente, arquétipos/variantes e desempenho oficial/treinos. Explique o que é verificável antes de alterar a base.

---

**Princípio do projeto:** a ferramenta deve ajudar o grupo BARATÃO TCG a treinar melhor para o LAIC, mostrando tanto aquilo que os dados confirmam quanto aquilo que ainda não sabemos.

## 10. Preparação da V2 e importação auditada

A aplicação continua estática e funciona localmente. `data-core.js` valida backups e arquivos de fonte; `app.js` mantém a interface e o armazenamento. Backups V1 são migrados para a versão 2 no navegador. A chave antiga `baratao-road-to-laic-v1` permanece intacta; a V2 usa `baratao-road-to-laic-v2`. Exporte um backup antes de importar dados ou restaurar a base. A importação de backup substitui a base local; a importação de fonte incorpora torneios, resultados e matchups, mantendo os treinos.

O arquivo de fonte é JSON com `schemaVersion: 2` e três listas: `tournaments`, `results`, `matchups`. Pode-se importar um torneio sem resultados ou matchups; listas vazias representam ausência de dados coletados, não zero ocorrências. Cada torneio exige `id`, `name`, `region`, `format` (`BO1` ou `BO3`), `date` (`AAAA-MM-DD`), `players` (inteiro ou `null`), `sourceUrl` HTTPS e `status` (`preliminar`, `verificado` ou `incompleto`). Cada resultado exige `tournamentId`, `deck`, `players`, `day2`, `wins`, `losses`, `draws` (contagens inteiras ou `null`), `winRateReported` (número ou `null`), `unit` (`game` ou `match`), `sourceUrl`, `retrievedAt` em formato ISO e `status`. Se houver `winRateReported`, informe `metricDefinition` com a definição publicada pela fonte. Preencha as três contagens W/L/D juntas ou deixe as três como `null`; nunca derive contagens de percentuais arredondados.

Cada matchup exige `tournamentId`, `deck`, `opponent`, `wins`, `losses`, `draws` (inteiros não negativos, com ao menos uma partida), `unit`, `sourceUrl`, `retrievedAt` e `status`. Importe um confronto apenas em uma perspectiva: as perspectivas inversas do mesmo par, torneio e unidade são rejeitadas. Preserve a variante do arquétipo como aparece na fonte. Os filtros da interface separam MD1/MD3; confrontos em jogos, séries e registros antigos sem unidade identificada também ficam separados.

A aplicação exibe os dados publicados no repositório. Quando o usuário envia o link de um novo Regional, o responsável pela atualização executa a coleta sob demanda, confere o relatório e publica a base atualizada; não há descoberta, agendamento ou sincronização automática. A coleta de 2026-10-13 atualizou `regionals-data.js` com 384 linhas de resultados e 4.614 pares de confronto dos cinco Regionais, incluindo todas as variantes identificadas nas páginas públicas. Cada par foi conferido na perspectiva inversa; confrontos sem partidas publicadas permanecem ausentes. A classificação completa tem 10.733 jogadores e identifica deck para 10.718 deles. A cobertura por evento é 3119/3122 (0072), 816/817 (0073), 2793/2793 (0074), 1072/1074 (0075) e 2918/2927 (0076). As 51 decklists de Top Cut coletadas e os registros individuais ficam em `imports/latest.json`. Esses limites não são preenchidos por estimativa.

O `Win %` publicado corresponde, em todas as linhas coletadas, a `100 × (W + T/3) / (W + L + T)`, com arredondamento a duas casas. É a taxa por pontos de séries MD3 (3/1/0). A taxa com empate valendo metade e a taxa de vitórias puras são métricas distintas. A página de ranking separa desempenho observado (mínimo de 100 séries para ordenar) e prioridade inicial de treino (presença observada); a prioridade final depende dos decks que os integrantes jogarão e dos confrontos específicos. O índice experimental da V1 permanece visível para comparação, sem ser tratado como previsão.

Em um navegador sem dados locais, a V2 carrega o conjunto auditado. Backups antigos são preservados na chave V1 e não recebem atualização automática por cima de dados pessoais; use **Aplicar 5 Regionais auditados** na aba Dados & backups para incorporá-los à base local depois de exportar um backup. A importação de fonte aceita apenas os cinco Regionais MD3. Yokohama e City Leagues continuam fora do ranking atual.

Validação local: `node --test tests/*.test.js` e `node --check app.js`. Para abrir a interface, use `index.html` diretamente ou um servidor estático como `python3 -m http.server 8000` no diretório do projeto.

## 11. Importador reproduzível do Limitless Labs

O importador é executado **sob demanda**, quando você fornecer novas fontes ou solicitar uma atualização. Não há coleta automática nem agendamento. Ele usa **Node.js apenas na coleta**; a aplicação permanece HTML/CSS/JavaScript puro. Ele acessa as páginas públicas `standings`, `decks`, `decks?conversion`, `decks/<variante>/matchups` e, quando solicitado, `player/<id>/decklist` dos cinco Regionais Masters. Lê os dados embutidos no HTML renderizado; não chama os endpoints internos do Labs. Requer Node.js 20+, `curl` e acesso a `labs.limitlesstcg.com`. O `curl` é usado como transporte para respeitar o proxy do ambiente em nuvem. A execução é sequencial, com intervalo mínimo de 300 ms entre requisições, timeout e tentativas limitadas. Consulte também as regras de acesso do site antes de aumentar a frequência.

```bash
npm ci
npm test
npm run import:labs -- --decklists=topcut --delay-ms=400
```

A execução grava em `imports/limitless-DATA.json` o relatório completo: `source` (torneios, resultados e matchups), `players` (classificação individual, posição, deck, W/L/D, Dia 2, Top Cut e URL da lista), `decklists` (cartas efetivamente coletadas), `coverage` e `failures`. Grava também `imports/limitless-DATA-source.json`, que pode ser selecionado em **Dados & backups → Importar fonte auditada** no navegador. A opção padrão baixa decklists de Top Cut; `--decklists=all` tenta todas as listas publicadas e pode levar muito tempo. `--decklists=none` guarda apenas as URLs das listas. As contagens ausentes continuam ausentes; o arquivo registra o que falhou. Se algum evento ou página necessária falhar, o processo termina com código 2 e **não deve atualizar a base incorporada**.

Depois de conferir `failures: []`, a cobertura e as contagens dos cinco torneios, incorpore a coleta ao site com:

```bash
npm run publish:labs -- imports/limitless-DATA.json
npm test
```

O comando de publicação só aceita os cinco torneios sem falhas. Ele atualiza `regionals-data.js`, `imports/latest.json` (inclui jogadores e listas) e `imports/latest-source.json` (arquivo importável no navegador). A versão publicada fica disponível para download em **Dados & backups**. Arquivos datados ficam locais por padrão para evitar duplicação no Git. `npm run import:labs -- --write-static` faz a publicação da base estática na mesma execução, mas só após a validação completa.

**Definições:** `winRateReported` reproduz o `Win %` mostrado no Labs; W/L/D e a taxa calculada são guardados separadamente. Presença é `players` do arquétipo dividido pelo total oficial do evento. Dia 2 e Top Cut são contagens de jogadores diferentes; Top Cut vem da classificação individual, e a conversão é calculada somente com os denominadores disponíveis. Cada confronto é salvo uma vez por par não ordenado, torneio e unidade, depois de conferir a perspectiva inversa. Não somamos a linha de um deck com a linha inversa. Variante (`variantId`) e família (`family`) permanecem campos distintos, sem agrupar resultados automaticamente. Jogadores sem deck identificado não são atribuídos a nenhum arquétipo.

Os cinco eventos têm `format: "BO3"` e os W/L/D publicados são **rodadas/séries MD3**, salvas como `unit: "match"`. Empates são preservados. O importador não converte vitórias de rodada em vitórias de jogos individuais e não cria dados MD1 para esses Regionais. Em cada página de matchup, a soma de confrontos identificados, confrontos procedurais e adversários desconhecidos precisa bater com W/L/D agregado do arquétipo; apenas os confrontos entre variantes identificadas entram na matriz. A distinção MD1/MD3 será relevante nas futuras fontes japonesas, sem misturar as estatísticas atuais.

**Limites:** a classificação e os resultados individuais podem incluir jogadores sem deck identificado; `coverage` informa quantos ficaram de fora da análise por arquétipo. A coleta padrão inclui somente listas de Top Cut; URLs das demais listas disponíveis ficam em `players`. Partidas individuais não são sintetizadas a partir de W/L/D agregados. Uma página com resposta 200, mas estrutura inesperada ou dados divergentes, é tratada como falha de coleta.

## 12. Sprites por deck

Os ícones do site usam arquivos PNG locais em `assets/sprites/`, para funcionar também offline. As imagens vieram do [repositório PokéAPI Sprites](https://github.com/PokeAPI/sprites); cada ícone abre a [página da espécie no Pokémon Database](https://pokemondb.net/sprites), conforme a referência visual escolhida para o projeto. O acesso direto a `pokemondb.net` estava bloqueado no ambiente de importação, por isso os PNGs foram baixados do PokéAPI, não copiados do Pokémon Database. `assets/sprites/manifest.json` registra URL e SHA-256 de cada arquivo. O importador usa revisões fixas dos repositórios PokéAPI para permitir a reprodução da coleta:

```bash
npm run sprites:download
npm test
```

`deck-sprites.js` identifica espécies explícitas nos nomes dos decks; por exemplo, `Dragapult` mostra Dragapult e `Dragapult Blaziken` mostra Dragapult + Blaziken. As espécies de um mesmo deck permanecem lado a lado. Para nomes genéricos, usa os ícones representativos publicados nas páginas `decks` dos cinco Regionais: `Basic Box` → Ogerpon + Clefairy, `Festival Lead` → Dipplin + Thwackey e `Tera Box` → Noctowl + Ogerpon. Esses ícones identificam a categoria visual do Limitless, não comprovam a lista exata de cada jogador. `Other` continua sem sprite por não identificar uma espécie. Para nomes de formas especiais (como `Mega`, `Alolan` e `Paldean`), o PNG representa a espécie base do PokéAPI; ele não afirma identificar a forma ou carta exata usada no torneio. Sprites são apenas identificação visual e não alteram estatísticas, variantes ou resultados.

## 13. Atualização por link enviado no chat e limites da auditoria

O usuário só precisa enviar o link da página `standings` do novo Regional no chat. A atualização do repositório é feita sob demanda: conferir evento, formato e disponibilidade; executar o importador Node.js; revisar cobertura, variantes, matchups, listas e falhas; publicar os arquivos da base; executar os testes. Para um evento ainda não cadastrado, o responsável adiciona seu ID ao recorte e valida que ele é MD3 antes da publicação. O site continua em HTML/CSS/JavaScript puro e abre diretamente por `index.html` ou GitHub Pages. A aba **Dados & backups** continua oferecendo exportação/restauração da base local e aplicação da fonte publicada, mas o usuário não precisa instalar Node.js nem acionar uma importação na interface.

**Auditoria em 2026-10-13:** uma segunda execução independente do importador buscou os cinco eventos e reproduziu, linha a linha, a base publicada após ignorar apenas os horários de coleta. Foram 10.733 jogadores, 384 variantes, 4.614 pares de matchups e 51 listas Top Cut, com `failures: []`. A classificação, contagem por variante, Win % publicado, Dia 2, Top Cut e confronto direto têm fonte e amostra. As páginas públicas de `pairings?round=N` também existem, mas **rodadas individuais ainda não são importadas**. A matriz contém apenas pares de variantes diferentes e identificadas; confrontos da mesma variante, procedurais ou com oponente desconhecido não aparecem como pares na matriz. A coleta padrão não baixa todas as listas disponíveis. Portanto, a mineração ainda é **parcial** no critério de confrontos e rodadas completos.

O relatório por Regional, os testes A–F, a causa do indicador zero e os limites estatísticos estão em [`AUDITORIA-V1.md`](AUDITORIA-V1.md).

Se o dashboard mostrar **“Matchups com séries: 0”** em um navegador usado antes da publicação, a base V2 antiga no `localStorage` está substituindo a base empacotada. Exporte o backup e use **Aplicar 5 Regionais auditados** em Dados & backups. O ranking Top 15 agora considera somente linhas marcadas `verificado`; resultados preliminares antigos não pontuam. O índice experimental da V1 permanece apenas para comparação histórica.
