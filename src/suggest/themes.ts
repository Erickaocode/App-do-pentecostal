/**
 * Temas comuns em anotações, com versículos-chave escolhidos à mão. Eles cobrem o que a
 * busca por palavras não alcança: quem escreve "estou preocupado com as contas" deve ver
 * Filipenses 4:6, mesmo que "preocupado" não esteja no versículo.
 *
 * `triggers` são começos de palavra já sem acento e em minúsculas ("preocup" pega
 * preocupado, preocupação...).
 */
export interface Theme {
  name: string;
  triggers: string[];
  verses: [book: string, chapter: number, verse: number][];
}

export const themes: Theme[] = [
  {
    name: 'Ansiedade e preocupação',
    triggers: ['ansie', 'ansios', 'preocup', 'nervos', 'inquiet', 'estress', 'agoni', 'dormir', 'insoni', 'aperto no peito', 'mente nao para', 'cabeca nao para'],
    verses: [['Fp', 4, 6], ['1Pe', 5, 7], ['Mt', 6, 34], ['Sl', 55, 22], ['Jo', 14, 27]],
  },
  {
    name: 'Medo',
    triggers: ['medo', 'temor', 'assust', 'panico', 'receio', 'covard', 'insegur'],
    verses: [['Is', 41, 10], ['2Tm', 1, 7], ['Js', 1, 9], ['Sl', 27, 1], ['Sl', 56, 3]],
  },
  {
    name: 'Tristeza e desânimo',
    triggers: ['trist', 'depress', 'desanim', 'chor', 'lagrim', 'abatid', 'angust', 'sofri', 'dor ', 'dores'],
    verses: [['Sl', 34, 18], ['Sl', 30, 5], ['Sl', 42, 11], ['Mt', 5, 4], ['Sl', 147, 3]],
  },
  {
    name: 'Luto e morte',
    triggers: ['luto', 'morte', 'morreu', 'faleci', 'perdi ', 'saudade', 'enterr', 'velorio'],
    verses: [['Jo', 11, 25], ['Ap', 21, 4], ['1Ts', 4, 13], ['Sl', 23, 4], ['2Co', 5, 8]],
  },
  {
    name: 'Perdão',
    triggers: ['perdo', 'perdao', 'magoa', 'ressentim', 'rancor', 'ofend'],
    verses: [['Ef', 4, 32], ['Cl', 3, 13], ['Mt', 6, 14], ['Mt', 18, 21], ['1Jo', 1, 9]],
  },
  {
    name: 'Culpa, pecado e arrependimento',
    triggers: ['culpa', 'pecad', 'pequei', 'arrepend', 'errei', 'erro', 'vergonh'],
    verses: [['1Jo', 1, 9], ['Sl', 51, 10], ['Rm', 8, 1], ['Is', 1, 18], ['At', 3, 19]],
  },
  {
    name: 'Gratidão',
    triggers: ['grat', 'agradec', 'obrigad', 'bencao', 'abencoa'],
    verses: [['1Ts', 5, 18], ['Sl', 100, 4], ['Sl', 103, 2], ['Cl', 3, 17], ['Sl', 118, 1]],
  },
  {
    name: 'Alegria',
    triggers: ['alegr', 'feliz', 'felicid', 'conten', 'jubil'],
    verses: [['Fp', 4, 4], ['Ne', 8, 10], ['Sl', 16, 11], ['Jo', 15, 11], ['Rm', 15, 13]],
  },
  {
    name: 'Fé e dúvida',
    triggers: ['fe ', 'duvid', 'acredit', 'confia', 'crer', 'cren'],
    verses: [['Hb', 11, 1], ['Hb', 11, 6], ['Mc', 9, 23], ['Rm', 10, 17], ['Pv', 3, 5]],
  },
  {
    name: 'Esperança',
    triggers: ['esperan', 'futuro', 'sonho', 'planos'],
    verses: [['Jr', 29, 11], ['Rm', 15, 13], ['Lm', 3, 22], ['Is', 40, 31], ['Rm', 5, 5]],
  },
  {
    name: 'Amor',
    triggers: ['amor', 'amar ', 'amo ', 'carinh'],
    verses: [['1Co', 13, 4], ['Jo', 3, 16], ['1Jo', 4, 19], ['Rm', 8, 38], ['Jo', 13, 34]],
  },
  {
    name: 'Casamento e relacionamento',
    triggers: ['casament', 'casar', 'marido', 'esposa', 'mulher', 'namor', 'noiv', 'conjuge'],
    verses: [['Ef', 5, 25], ['Gn', 2, 24], ['Ec', 4, 9], ['1Co', 13, 7], ['Cl', 3, 14]],
  },
  {
    name: 'Família e filhos',
    triggers: ['famil', 'filho', 'filha', 'pais', 'mae', 'pai ', 'irmao', 'irma ', 'crianc'],
    verses: [['Js', 24, 15], ['Pv', 22, 6], ['Ef', 6, 1], ['Sl', 127, 3], ['At', 16, 31]],
  },
  {
    name: 'Trabalho, dinheiro e provisão',
    triggers: ['trabalh', 'emprego', 'desempreg', 'dinheiro', 'contas', 'divida', 'financ', 'salario', 'provis'],
    verses: [['Fp', 4, 19], ['Mt', 6, 33], ['Cl', 3, 23], ['Sl', 37, 25], ['Pv', 16, 3]],
  },
  {
    name: 'Doença e cura',
    triggers: ['doen', 'doent', 'cura', 'curar', 'hospital', 'saude', 'cirurg', 'cancer', 'enferm'],
    verses: [['Tg', 5, 14], ['Is', 53, 5], ['Jr', 17, 14], ['Sl', 103, 3], ['Êx', 15, 26]],
  },
  {
    name: 'Cansaço e falta de forças',
    triggers: ['cansa', 'exaust', 'fraco', 'fraquez', 'sem forca', 'esgot'],
    verses: [['Mt', 11, 28], ['Is', 40, 29], ['Is', 40, 31], ['2Co', 12, 9], ['Fp', 4, 13]],
  },
  {
    name: 'Solidão',
    triggers: ['sozinh', 'solid', 'abandon', 'rejeit', 'excluid', 'ninguem me entende', 'ninguem liga', 'ninguem se importa'],
    verses: [['Dt', 31, 6], ['Mt', 28, 20], ['Sl', 27, 10], ['Hb', 13, 5], ['Is', 43, 2]],
  },
  {
    name: 'Sabedoria e decisões',
    triggers: ['sabedor', 'decis', 'decidir', 'escolh', 'direcao', 'orientac', 'caminho'],
    verses: [['Tg', 1, 5], ['Pv', 3, 5], ['Pv', 3, 6], ['Sl', 32, 8], ['Sl', 119, 105]],
  },
  {
    name: 'Paciência e espera',
    triggers: ['pacien', 'esperar', 'espera ', 'demora', 'tempo de deus'],
    verses: [['Sl', 27, 14], ['Is', 40, 31], ['Ec', 3, 1], ['Gl', 6, 9], ['Lm', 3, 25]],
  },
  {
    name: 'Oração',
    triggers: ['oracao', 'orar', 'orei', 'clamar', 'clamor', 'interced', 'jejum'],
    verses: [['Jr', 33, 3], ['Mt', 7, 7], ['1Ts', 5, 17], ['Fp', 4, 6], ['Tg', 5, 16]],
  },
  {
    name: 'Espírito Santo, batismo e Pentecostes',
    triggers: ['espirito santo', 'pentecost', 'batismo', 'batiza', 'linguas', 'unca', 'avivament', 'fogo'],
    verses: [['At', 2, 4], ['At', 1, 8], ['Jl', 2, 28], ['Jo', 14, 26], ['Gl', 5, 22]],
  },
  {
    name: 'Dons espirituais e ministério',
    triggers: ['dons', 'dom ', 'ministeri', 'chamado', 'profeci', 'louvor', 'adora'],
    verses: [['1Co', 12, 7], ['Rm', 12, 6], ['1Pe', 4, 10], ['Sl', 150, 6], ['Jo', 4, 24]],
  },
  {
    name: 'Salvação',
    triggers: ['salva', 'salvo', 'convers', 'aceitei jesus', 'nova vida', 'renasc'],
    verses: [['Jo', 3, 16], ['Rm', 10, 9], ['Ef', 2, 8], ['2Co', 5, 17], ['At', 4, 12]],
  },
  {
    name: 'Tentação e vícios',
    triggers: ['tenta', 'vicio', 'pornograf', 'bebida', 'droga', 'luxuria', 'carne'],
    verses: [['1Co', 10, 13], ['Tg', 4, 7], ['Mt', 26, 41], ['Gl', 5, 16], ['Rm', 12, 21]],
  },
  {
    name: 'Raiva',
    triggers: ['raiva', 'ira ', 'irad', 'odio', 'brig', 'discut', 'nervoso'],
    verses: [['Ef', 4, 26], ['Tg', 1, 19], ['Pv', 15, 1], ['Rm', 12, 18], ['Pv', 16, 32]],
  },
  {
    name: 'Orgulho e humildade',
    triggers: ['orgulh', 'humild', 'soberb', 'vaidad', 'arrogan'],
    verses: [['Tg', 4, 6], ['Pv', 16, 18], ['Fp', 2, 3], ['Mq', 6, 8], ['1Pe', 5, 6]],
  },
  {
    name: 'Proteção e batalha espiritual',
    triggers: ['proteg', 'proteca', 'perigo', 'inimig', 'batalha', 'guerra', 'maligno', 'ataque', 'livramento'],
    verses: [['Sl', 91, 1], ['Ef', 6, 10], ['Ef', 6, 11], ['Sl', 121, 7], ['2Ts', 3, 3]],
  },
  {
    name: 'Vitória e superação',
    triggers: ['vitori', 'vencer', 'venci', 'super', 'conquist'],
    verses: [['Rm', 8, 37], ['1Co', 15, 57], ['Fp', 4, 13], ['1Jo', 5, 4], ['Jo', 16, 33]],
  },
  {
    name: 'Evangelismo e missão',
    triggers: ['evangel', 'pregar', 'missao', 'missoes', 'testemunh', 'almas'],
    verses: [['Mc', 16, 15], ['Mt', 28, 19], ['Rm', 1, 16], ['At', 1, 8], ['Mt', 5, 16]],
  },
  {
    name: 'Fidelidade de Deus e promessas',
    triggers: ['fidelid', 'fiel', 'promess', 'cumpri'],
    verses: [['Lm', 3, 23], ['Nm', 23, 19], ['2Tm', 2, 13], ['Hb', 10, 23], ['Dt', 7, 9]],
  },
  {
    name: 'Perseguição e provação',
    triggers: ['persegu', 'provac', 'prova ', 'luta', 'dificuldad', 'crise', 'passando por um deserto', 'estou num deserto'],
    verses: [['Tg', 1, 2], ['Rm', 8, 28], ['1Pe', 4, 12], ['2Co', 4, 17], ['Mt', 5, 10]],
  },
  {
    name: 'Juventude',
    triggers: ['jovem', 'jovens', 'juventud', 'adolesc', 'escola', 'faculdad', 'vestibular', 'enem'],
    verses: [['1Tm', 4, 12], ['Ec', 12, 1], ['Sl', 119, 9], ['2Tm', 2, 22], ['Pv', 1, 7]],
  },
  {
    name: 'Generosidade e dízimo',
    triggers: ['dizimo', 'oferta', 'generos', 'doar', 'ajudar', 'contribu'],
    verses: [['Ml', 3, 10], ['2Co', 9, 7], ['At', 20, 35], ['Pv', 11, 25], ['Lc', 6, 38]],
  },
  {
    name: 'Paz',
    triggers: ['paz', 'calma', 'tranquil', 'descans', 'sossego'],
    verses: [['Jo', 14, 27], ['Fp', 4, 7], ['Is', 26, 3], ['Sl', 4, 8], ['Mt', 11, 29]],
  },
];
