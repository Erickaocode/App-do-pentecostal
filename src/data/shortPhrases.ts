import type { DayPeriod } from '../utils/dates';

/** Frase bíblica curta para a tela Início, com a referência de onde ela vem. */
export interface ShortPhrase {
  text: string;
  reference: string;
}

/** Frases para qualquer hora do dia. */
const generalPhrases: ShortPhrase[] = [
  { text: 'O Senhor é o meu pastor.', reference: 'Sl 23:1' },
  { text: 'Tudo posso naquele que me fortalece.', reference: 'Fp 4:13' },
  { text: 'Não temas, porque Eu estou contigo.', reference: 'Is 41:10' },
  { text: 'Deus é amor.', reference: '1Jo 4:8' },
  { text: 'A alegria do Senhor é a vossa força.', reference: 'Ne 8:10' },
  { text: 'Esforça-te e tem bom ânimo.', reference: 'Js 1:9' },
  { text: 'Entrega o teu caminho ao Senhor.', reference: 'Sl 37:5' },
  { text: 'Buscai primeiro o Reino de Deus.', reference: 'Mt 6:33' },
  { text: 'Em tudo dai graças.', reference: '1Ts 5:18' },
  { text: 'Eu estou convosco todos os dias.', reference: 'Mt 28:20' },
  { text: 'Lâmpada para os meus pés é a tua palavra.', reference: 'Sl 119:105' },
  { text: 'Recebereis poder do Espírito Santo.', reference: 'At 1:8' },
];

/** Frases que combinam com cada período; aparecem antes das gerais. */
const periodPhrases: Record<DayPeriod, ShortPhrase[]> = {
  madrugada: [
    { text: 'O choro dura uma noite, mas a alegria vem pela manhã.', reference: 'Sl 30:5' },
    { text: 'Aquele que te guarda não dormita.', reference: 'Sl 121:3' },
    { text: 'Em paz me deito e logo durmo.', reference: 'Sl 4:8' },
  ],
  manha: [
    { text: 'As misericórdias do Senhor se renovam a cada manhã.', reference: 'Lm 3:23' },
    { text: 'Este é o dia que o Senhor fez.', reference: 'Sl 118:24' },
  ],
  tarde: [
    { text: 'Não nos cansemos de fazer o bem.', reference: 'Gl 6:9' },
    { text: 'Vinde a mim, e eu vos aliviarei.', reference: 'Mt 11:28' },
  ],
  noite: [
    { text: 'Em paz me deito e logo durmo.', reference: 'Sl 4:8' },
    { text: 'Lança sobre Ele a tua ansiedade.', reference: '1Pe 5:7' },
  ],
};

export function phrasesFor(period: DayPeriod): ShortPhrase[] {
  return [...periodPhrases[period], ...generalPhrases];
}
