/** Minúsculas, sem acentos e só com letras, números e espaços. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palavras que não ajudam a achar versículos parecidos (já sem acento). */
const STOPWORDS = new Set(
  `a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para pra pro
  com sem sob sobre entre ate apos desde contra e ou mas porem pois porque que se como quando onde
  quem qual quais cujo isso isto aquilo esse essa esses essas este esta estes estas aquele aquela
  eu tu ele ela nos vos eles elas me te se lhe lhes meu minha meus minhas teu tua teus tuas seu sua
  seus suas nosso nossa nossos nossas voce voces mim ti si comigo contigo conosco
  ser sou es e somos sao era eram foi fui foram sera serao seja sejam sendo sido
  estar estou esta estamos estao estava estive esteve estavam estando
  ter tenho tem temos tinha tive teve tiveram tendo ha haver havia houve
  fazer faco faz fiz fez fazendo ir vou vai vamos vao fui ia indo dar dou deu
  poder posso pode podemos pude podia querer quero quer queria saber sei sabe
  muito muita muitos muitas pouco mais menos tao tanto tanta todo toda todos todas tudo nada
  algo alguem algum alguma alguns ninguem nenhum nenhuma outro outra outros outras mesmo mesma
  ja ainda agora hoje ontem amanha sempre nunca depois antes entao assim tambem so apenas bem mal
  aqui ali la sim nao talvez coisa coisas vez vezes dia dias ano anos hora momento forma jeito
  deus senhor jesus cristo versiculo versiculos texto leitura capitulo anotacao biblia palavra
  acho sinto senti preciso quero queria consigo consegui devia deveria falei falamos lembrei
  pensei estudando estudei aprendi coisa pessoa pessoas gente parte sobre durante enquanto
  daquele daquela daqueles daquelas naquele naquela deste desta disso nisso dele dela deles delas
  nele nela neles nelas dificil facil grande pequeno`.split(/\s+/)
);

/**
 * Palavras da anotação que valem uma busca: as que mais se repetem primeiro (são o
 * assunto da anotação) e, no empate, as mais longas (mais específicas).
 */
export function keywords(normalizedText: string, max = 10): string[] {
  const counts = new Map<string, number>();
  for (const w of normalizedText.split(' ')) {
    if (w.length < 4 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([w]) => w);
}

/** Radical simples: palavras longas perdem o final ("preocupado" → "preocupa") para pegar variações. */
export function stem(word: string): string {
  return word.length >= 7 ? word.slice(0, word.length - 2) : word;
}

/**
 * Monta a consulta da busca de texto completo. Palavras longas viram prefixo
 * ("preocupado" → "preocupa"*), para pegar variações como preocupação e preocupados.
 */
export function toFtsQuery(words: string[]): string | null {
  const terms = words.map((w) => {
    if (w.length >= 7) return `"${stem(w)}"*`;
    // Palavras curtas ficam exatas: como prefixo ou no plural pegam coisas demais
    // ("amor" acharia "amorreus" e "medos" acharia o povo dos Medos).
    return `"${w}"`;
  });
  return terms.length > 0 ? terms.join(' OR ') : null;
}
