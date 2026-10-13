# Auditoria da mineração Limitless Labs — 2026-10-13

**Conclusão: PARCIAL.** Os cinco Regionais MD3 têm classificação completa, variantes, W/L/D agregados por arquétipo, Win % publicado, Dia 2, Top Cut, pares de matchup identificados e listas de Top Cut verificados nas páginas públicas. As rodadas individuais publicadas em `pairings?round=N` ainda não são importadas; partidas entre a mesma variante, procedurais ou com deck desconhecido não entram na matriz. A mineração completa, no critério do projeto, ainda não foi atingida.

Uma nova coleta independente consultou `standings`, `decks`, `decks?conversion`, as páginas de matchup de cada variante e as listas de Top Cut. Após ignorar somente `retrievedAt`/`importedAt`, os registros reproduziram integralmente `imports/latest.json`, com `failures: []`. As páginas de `pairings?round=1` dos cinco eventos também retornaram dados públicos, confirmando que o resultado de cada rodada pode ser investigado em uma próxima etapa. Os números abaixo são observações da coleta; `—` em Rodadas significa **não importadas individualmente**, não zero rodadas disputadas.

| Regional e data | Jogadores | Arquétipos/variantes | Pares de matchup | Rodadas | Decklists coletadas | Status |
|---|---:|---:|---:|---|---:|---|
| [Baltimore 0072](https://labs.limitlesstcg.com/0072/standings), 18/09/2026 | 3.122 | 90 | 1.131 | — | 8 Top Cut | PARCIAL |
| [Brisbane 0073](https://labs.limitlesstcg.com/0073/standings), 26/09/2026 | 817 | 68 | 684 | — | 9 Top Cut | PARCIAL |
| [Frankfurt 0074](https://labs.limitlesstcg.com/0074/standings), 26/09/2026 | 2.793 | 81 | 1.149 | — | 16 Top Cut | PARCIAL |
| [Recife 0075](https://labs.limitlesstcg.com/0075/standings), 03/10/2026 | 1.074 | 63 | 635 | — | 9 Top Cut | PARCIAL |
| [Louisville 0076](https://labs.limitlesstcg.com/0076/standings), 09/10/2026 | 2.927 | 82 | 1.015 | — | 9 Top Cut | PARCIAL |
| **Total** | **10.733** | **384 linhas por evento** | **4.614** | **—** | **51** | **PARCIAL** |

O total de arquétipos soma linhas por evento, não 384 nomes únicos. Dos 10.733 jogadores classificados, 10.718 têm variante identificada: 3 sem deck em Baltimore, 1 em Brisbane, 0 em Frankfurt, 2 em Recife e 9 em Louisville. As URLs das demais listas disponíveis estão no relatório por jogador; a coleta padrão baixa apenas listas de Top Cut. O resultado publicado por jogador contém W/L/D agregado, mas ainda não identifica cada oponente e rodada no arquivo importado.

## Indicador “Matchups com séries: 0”

**Bug corrigido e testado.** O importador coletava e persistia os 4.614 pares na base publicada, e o formato `unit: "match"` é compatível com a aplicação. O zero podia surgir porque um banco V2 salvo antes da publicação no `localStorage` tem precedência sobre `regionals-data.js`. A interface agora explica esse caso e oferece o caminho **Dados & backups → Aplicar 5 Regionais auditados** depois do backup. O indicador conta somente pares `verificado` de séries MD3; o ranking Top 15 usa apenas resultados `verificado`. O índice histórico da V1 deixou de preencher win rate ou Dia 2 ausentes com valores padrão.

## Confronto auditado: N’s Zoroark × Dragapult em Recife

Na [página de N’s Zoroark](https://labs.limitlesstcg.com/0075/decks/n-zoroark/matchups), contra Dragapult puro, constam **97 vitórias, 50 derrotas e 39 empates em 186 séries MD3**. A perspectiva inversa na [página de Dragapult](https://labs.limitlesstcg.com/0075/decks/dragapult-ex/matchups) é 50–97–39. A taxa de pontos 3/1/0 de N’s Zoroark é `(97 + 39/3) / 186 = 59,14%`; isso não é taxa de vitórias puras. As variantes ficam separadas: contra Dragapult Blaziken são 15–9–2 em 26 séries; contra Dragapult Dusknoir, 22–9–2 em 33. Esses pares são agregados do Labs, conferidos nas duas perspectivas, sem duplicação; o arquivo ainda não liga cada série a uma rodada ou jogador.

## Testes A–F

| Teste | Estado | Evidência / limite |
|---|---|---|
| A — Recife | VALIDADO | Recoleta ao vivo: 1.074 jogadores, 63 variantes, 635 pares, 9 listas Top Cut, sem falhas. |
| B — Reimportação | TESTADO | Duas coletas seguidas e mesclagem repetida: 1 torneio, 63 resultados e 635 pares em ambas. |
| C — Matchup | VALIDADO | N’s Zoroark × Dragapult e variantes conferidos na página de confronto e na perspectiva inversa. |
| D — Persistência | TESTADO | A fonte aplicada ao navegador manteve 63 resultados e 635 pares de Recife após recarregar a página. |
| E — Ranking | TESTADO | Base local preliminar produz zero candidatos observados; aplicar a fonte verificada alimenta o Top 15. Percentuais ausentes não são convertidos em W/L/D. |
| F — Backup | TESTADO | Exportação e restauração em contexto limpo do navegador preservaram 384 resultados, 4.614 pares e um treino criado no teste. |

`IMPLEMENTADO` significa código disponível, sem implicar validação; `TESTADO` significa comportamento reproduzido em teste local; `VALIDADO` significa conferido com dados públicos do Labs; `PARCIAL` significa cobertura ou funcionalidade incompleta; `BLOQUEADO` significa impedimento externo; `NÃO IMPLEMENTADO` significa ausência de código. A extração de classificação, Win % publicado, variantes, Dia 2, Top Cut, matchups agregados e listas Top Cut é **VALIDADO**. A coleta a partir dos links enviados pelo usuário é feita pelo responsável pela atualização com o importador Node.js; reimportação, persistência e backup são **TESTADO**. Rodadas individuais, placares dos jogos da série, todas as decklists e sincronização dos relatórios detalhados no banco do navegador são **NÃO IMPLEMENTADO**. A análise direta por URL no navegador foi retirada para manter o fluxo simples; o site não depende de um servidor de importação.

## Riscos e próximos passos

- O `Win %` do Labs foi conferido contra `100 × (W + empates/3) / N` para as 384 linhas. Não representa vitórias puras; a matriz mostra `N` e marca confrontos com menos de 20 séries como baixa amostra. Ainda não há intervalo de confiança nem ajuste por habilidade/força do adversário.
- A matriz inclui só confrontos entre variantes diferentes e identificadas. O total de W/L/D de um arquétipo pode exceder o dobro das séries dos pares da matriz por confrontos da mesma variante, resultados procedurais e adversários desconhecidos. Não interprete os 4.614 pares como todas as rodadas do torneio.
- Próxima implementação prioritária: importar cada página `pairings?round=N`, guardar identificadores de jogadores, rodada, resultado e fonte; reconciliar rodadas deduplicadas com standings e agregados de matchup, preservando empates, byes e Top Cut. Depois, ampliar a coleta de listas quando necessário e adicionar intervalos de confiança para os 15 decks.
