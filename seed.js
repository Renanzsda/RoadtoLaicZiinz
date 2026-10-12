// Transcrição PRELIMINAR dos números discutidos no chat. Não é uma extração auditada do Limitless.
// winRateReported é o percentual publicado/relatado, não uma contagem de W/L/D.
const SEED = {
  version: 1,
  tournaments: [
    {id:'0072',name:'Baltimore Regional',region:'Ocidente',country:'EUA',date:'2026-09-18',format:'BO3',players:3122,url:'https://labs.limitlesstcg.com/0072/standings',status:'preliminar'},
    {id:'0074',name:'Frankfurt Regional',region:'Ocidente',country:'Alemanha',date:'2026-09-26',format:'BO3',players:2793,url:'https://labs.limitlesstcg.com/0074/standings',status:'preliminar'},
    {id:'0075',name:'Recife Regional',region:'Ocidente',country:'Brasil',date:'2026-10-03',format:'BO3',players:1074,url:'https://labs.limitlesstcg.com/0075/standings',status:'preliminar'},
    {id:'0076',name:'Louisville Regional',region:'Ocidente',country:'EUA',date:'2026-10-09',format:'BO3',players:2927,url:'https://labs.limitlesstcg.com/0076/standings',status:'preliminar'},
    {id:'JP-569',name:'Champions League Yokohama',region:'Japão',country:'Japão',date:'2026-09-20',format:'BO1',players:null,url:'https://limitlesstcg.com/tournaments/569',status:'aguardando dados'}
  ],
  // [arquétipo, jogadores, win rate relatado (%), classificados dia 2 ou null]
  results: [],
  matchups: [],
  training: [],
  settings: { japanTrendBoost: false }
};
const SEED_ROWS = {
 '0072': [
 ['Dragapult',558,50.51,131],["N's Zoroark",243,48.89,45],['Dragapult Dusknoir',229,47.46,42],['Alakazam Dudunsparce',192,42.69,null],['Slowking',172,50.36,42],['Basic Box',161,53.14,46],['Dragapult Blaziken',155,48.98,null],['Mega Excadrill',154,46.30,null],['Crustle',138,50.21,28],['Dhelmise',93,48.82,19],['Lucario Hariyama',86,45.95,null],['Festival Lead',81,46.98,null],['Ogerpon Meganium Hydrapple',77,45.33,null],["Rocket's Honchkrow",61,48.38,null],['Sharpedo Toxtricity',54,45.33,null]],
 '0074': [
 ['Dragapult',427,50.37,88],["N's Zoroark",188,49.12,42],['Dragapult Dusknoir',176,47.06,33],['Slowking',166,49.86,40],['Basic Box',165,50.77,40],['Alakazam Dudunsparce',161,42.95,17],['Dragapult Blaziken',136,46.90,27],['Mega Excadrill',129,42.46,14],['Festival Lead',111,53.02,32],['Dhelmise',97,49.07,null],['Ogerpon Meganium Hydrapple',91,48.39,20],['Crustle',88,48.67,15],['Lopunny Dudunsparce',83,45.55,null],['Lucario Hariyama',69,45.36,null],["Rocket's Honchkrow",62,47.62,null]],
 '0075': [
 ['Dragapult',250,50.23,44],["N's Zoroark",79,53.16,31],['Alakazam Dudunsparce',66,47.15,9],['Basic Box',63,50.09,15],['Dragapult Dusknoir',60,42.83,6],['Slowking',48,48.67,15],['Mega Excadrill',44,43.34,9],['Dragapult Blaziken',43,48.15,3],['Crustle',34,50,8],['Ogerpon Meganium Hydrapple',33,49.28,6],['Lucario Hariyama',31,41.01,null],['Alakazam Dusknoir',29,47.72,null],['Festival Lead',29,51.97,null],['Dhelmise',25,40.84,null],["Cynthia's Garchomp",22,48.83,null]],
 '0076': [
 ['Dragapult',543,51.64,141],['Basic Box',223,50.25,43],['Slowking',205,48.89,46],['Alakazam Dudunsparce',162,45.54,26],["N's Zoroark",150,47.72,33],['Mega Excadrill',147,43.59,15],['Dhelmise',114,50.73,22],['Dragapult Dusknoir',113,45.07,17],['Ogerpon Meganium Hydrapple',113,47.42,18],['Dragapult Blaziken',112,50.71,28],['Alakazam Dusknoir',79,46.55,16],['Sharpedo Toxtricity',75,49.35,11],['Lopunny Dudunsparce',74,47.73,13],['Festival Lead',73,50,18],['Crustle',69,48.80,16]]
};
for (const [tId, rows] of Object.entries(SEED_ROWS)) {
  for (const [deck,players,winRateReported,day2] of rows) {
    SEED.results.push({tournamentId:tId,deck,players,winRateReported,day2,wins:null,losses:null,draws:null});
  }
}
