/**
 * Personagens bíblicos que, citados na anotação, trazem passagens-chave da história deles.
 *
 * `names` e `cues` são palavras já sem acento e em minúsculas. Nomes que também são comuns
 * hoje em dia (Davi, Pedro, Maria...) só contam se aparecer junto alguma `cue` da história,
 * senão "orei pelo meu amigo Pedro" sugeriria versículos sobre o apóstolo.
 */
export interface Person {
  name: string;
  names: string[];
  cues?: string[];
  verses: [book: string, chapter: number, verse: number][];
}

export const people: Person[] = [
  {
    name: 'Davi',
    names: ['davi', 'golias'],
    cues: ['golias', 'gigante', 'saul', 'rei', 'salmo', 'salmos', 'ungido', 'pastor', 'funda', 'betsabe', 'filisteu'],
    verses: [['1Sm', 17, 45], ['1Sm', 16, 7], ['Sl', 23, 1], ['At', 13, 22]],
  },
  {
    name: 'Moisés',
    names: ['moises'],
    verses: [['Êx', 14, 14], ['Êx', 33, 14], ['Êx', 16, 4], ['Hb', 11, 24]],
  },
  {
    name: 'Abraão',
    names: ['abraao', 'abrao'],
    verses: [['Gn', 12, 2], ['Gn', 15, 6], ['Gn', 22, 8], ['Hb', 11, 8]],
  },
  {
    name: 'Elias',
    names: ['elias'],
    cues: ['profeta', 'baal', 'carmelo', 'fogo', 'corvos', 'viuva', 'jezabel', 'eliseu', 'caverna'],
    verses: [['1Rs', 18, 38], ['1Rs', 19, 12], ['Tg', 5, 17]],
  },
  {
    name: 'Noé',
    names: ['noe'],
    verses: [['Gn', 6, 8], ['Gn', 9, 13], ['Hb', 11, 7]],
  },
  {
    name: 'Jonas',
    names: ['jonas'],
    cues: ['peixe', 'baleia', 'ninive', 'profeta', 'fugiu', 'fugir'],
    verses: [['Jn', 2, 2], ['Jn', 2, 9], ['Jn', 4, 2]],
  },
  {
    name: 'Sansão',
    names: ['sansao'],
    verses: [['Jz', 16, 28], ['Jz', 13, 24]],
  },
  {
    name: 'Gideão',
    names: ['gideao'],
    verses: [['Jz', 6, 12], ['Jz', 6, 14], ['Jz', 7, 7]],
  },
  {
    name: 'Salomão',
    names: ['salomao'],
    verses: [['1Rs', 3, 9], ['Pv', 1, 7], ['Ec', 12, 13]],
  },
  {
    name: 'Jacó',
    names: ['jaco'],
    verses: [['Gn', 28, 15], ['Gn', 32, 26], ['Gn', 32, 28]],
  },
  {
    name: 'José do Egito',
    names: ['jose'],
    cues: ['egito', 'irmaos', 'farao', 'sonho', 'sonhos', 'tunica', 'potifar', 'cisterna', 'jaco'],
    verses: [['Gn', 50, 20], ['Gn', 39, 2], ['Gn', 41, 52]],
  },
  {
    name: 'Jó',
    names: ['jo'],
    cues: ['sofrimento', 'perdeu', 'perdas', 'amigos', 'paciencia', 'provacao', 'satanas', 'cinzas'],
    verses: [['Jó', 1, 21], ['Jó', 19, 25], ['Jó', 42, 10]],
  },
  {
    name: 'Josué',
    names: ['josue'],
    verses: [['Js', 1, 9], ['Js', 24, 15], ['Js', 6, 20]],
  },
  {
    name: 'Daniel',
    names: ['daniel'],
    cues: ['leoes', 'cova', 'babilonia', 'profeta', 'dario', 'nabucodonosor', 'rei', 'fornalha'],
    verses: [['Dn', 6, 22], ['Dn', 1, 8], ['Dn', 3, 17]],
  },
  {
    name: 'Pedro',
    names: ['pedro'],
    cues: ['jesus', 'negou', 'negar', 'apostolo', 'pescador', 'galo', 'aguas', 'mar', 'pentecostes', 'discipulo'],
    verses: [['Mt', 14, 31], ['Lc', 22, 62], ['Jo', 21, 17], ['Mt', 16, 18]],
  },
  {
    name: 'Paulo',
    names: ['paulo'],
    cues: ['apostolo', 'damasco', 'carta', 'cartas', 'epistola', 'prisao', 'preso', 'naufragio', 'saulo', 'silas'],
    verses: [['Fp', 3, 14], ['2Tm', 4, 7], ['At', 16, 25], ['2Co', 12, 9]],
  },
  {
    name: 'Maria, mãe de Jesus',
    names: ['maria'],
    cues: ['jesus', 'anjo', 'gabriel', 'virgem', 'mae de jesus', 'nazare', 'magnificat', 'manjedoura'],
    verses: [['Lc', 1, 38], ['Lc', 1, 46], ['Lc', 2, 19]],
  },
  {
    name: 'Ester',
    names: ['ester'],
    cues: ['rainha', 'hama', 'mardoqueu', 'assuero', 'jejum'],
    verses: [['Et', 4, 14], ['Et', 4, 16]],
  },
  {
    name: 'Rute',
    names: ['rute'],
    cues: ['noemi', 'boaz', 'moabita', 'sogra'],
    verses: [['Rt', 1, 16], ['Rt', 2, 12]],
  },
  {
    name: 'Samuel',
    names: ['samuel'],
    cues: ['eli', 'ana', 'profeta', 'ungiu', 'saul', 'templo', 'chamou', 'chamado'],
    verses: [['1Sm', 3, 10], ['1Sm', 16, 7], ['1Sm', 15, 22]],
  },
  {
    name: 'Zaqueu',
    names: ['zaqueu'],
    verses: [['Lc', 19, 8], ['Lc', 19, 10]],
  },
  {
    name: 'Lázaro',
    names: ['lazaro'],
    verses: [['Jo', 11, 25], ['Jo', 11, 35], ['Jo', 11, 43]],
  },
  {
    name: 'Neemias',
    names: ['neemias'],
    verses: [['Ne', 8, 10], ['Ne', 2, 20], ['Ne', 1, 11]],
  },
  {
    name: 'Nicodemos',
    names: ['nicodemos'],
    verses: [['Jo', 3, 3], ['Jo', 3, 16]],
  },
  {
    name: 'Estêvão',
    names: ['estevao'],
    verses: [['At', 7, 55], ['At', 7, 60]],
  },
  {
    name: 'Sadraque, Mesaque e Abede-Nego',
    names: ['sadraque', 'mesaque', 'abede', 'abednego'],
    verses: [['Dn', 3, 17], ['Dn', 3, 18], ['Is', 43, 2]],
  },
];
