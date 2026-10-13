// Espécies explícitas; decks genéricos usam ícones representativos publicados pelo Limitless.
// Páginas de referência: Pokémon Database. Imagens locais: repositório PokeAPI/sprites.
(function (root) {
  'use strict';
  const species = [
    'Alakazam','Dudunsparce','Dusknoir','Exeggutor','Archaludon','Azumarill','Beedrill',
    'Blaziken','Zoroark','Blissey','Bronzong','Ceruledge','Cinccino','Clefairy','Ogerpon',
    'Conkeldurr','Crustle','Garchomp','Decidueye','Dhelmise','Diancie','Doublade',
    'Dragapult','Froslass','Dragonite','Eelektrik','Typhlosion','Magcargo','Flareon','Dipplin','Thwackey',
    'Noctowl','Munkidori','Gengar','Greninja','Grimmsnarl','Heatran','Metang','Trevenant',
    'Zacian','Hydreigon','Bellibolt','Iron Thorns','Jellicent','Joltik','Kangaskhan',
    'Bouffalant','Lopunny','Lucario','Hariyama','Manectric','Abomasnow','Absol','Camerupt',
    'Chandelure','Charizard','Darkrai','Excadrill','Feraligatr','Starmie','Venusaur',
    'Metagross','Mew','Gyarados','Meganium','Arboliva','Hydrapple','Okidogi','Barbaracle',
    'Palafin','Tauros','Raging Bolt','Honchkrow','Mewtwo','Spidops','Seaking','Sharpedo',
    'Toxtricity','Sinistcha','Slaking','Slowking','Ursaluna','Lunatone','Wailord','Yanmega',
    'Zygarde','Toucannon','Sylveon'
  ];
  const entries = species.map(name => ({ name, slug: name.toLowerCase().replaceAll(' ', '-') }));
  // Os mesmos ícones aparecem nas páginas /decks dos cinco Regionais MD3.
  const representative = {
    'Basic Box': ['Ogerpon', 'Clefairy'],
    'Festival Lead': ['Dipplin', 'Thwackey'],
    'Tera Box': ['Noctowl', 'Ogerpon']
  };
  function forDeck(deck) {
    if (typeof deck !== 'string') return [];
    const matches = representative[deck]
      ? representative[deck].map(name => entries.find(entry => entry.name === name))
      : entries.map(entry => {
      const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = new RegExp(`(^|[^A-Za-z])${escaped}(?=$|[^A-Za-z])`, 'i').exec(deck);
      return match ? { ...entry, index: match.index + match[1].length } : null;
    }).filter(Boolean).sort((a, b) => a.index - b.index);
    return matches.map(({ name, slug }) => ({
      name, slug, sourceUrl: `https://pokemondb.net/sprites/${slug}`,
      imageUrl: `assets/sprites/${slug}.png`
    }));
  }
  const api = { forDeck };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DeckSprites = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
