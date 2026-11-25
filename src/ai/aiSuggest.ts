import type { SQLiteDatabase } from 'expo-sqlite';
import type { SuggestionItem } from '../suggest/suggestVerses';
import { aiChat, type AiEngine } from './engine';
import { parseJsonLoose } from './ollama';
import { resolveReferences } from './outline';

const SYSTEM_PROMPT = `Você ajuda pregadores pentecostais a encontrar versículos bíblicos.
Leia a anotação e entenda o SENTIDO (não só as palavras). Indique versículos que realmente combinam com o assunto, a situação e a mensagem do texto.
Use apenas referências que existem, no formato "Livro capítulo:versículo". Não escreva o texto do versículo.
Responda SOMENTE com JSON: {"versiculos":[{"ref":"Livro cap:vers","motivo":"frase curta explicando por que combina"}]}`;

interface AiAnswer {
  versiculos?: { ref?: string; motivo?: string }[];
}

/** Versículos escolhidos pela IA para a anotação, conferidos na Bíblia do app. */
export async function aiSuggestVerses(
  db: SQLiteDatabase,
  engine: AiEngine,
  text: string,
  skip: Set<string>
): Promise<SuggestionItem[]> {
  const answer = await aiChat(
    engine,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Anotação:\n${text.slice(0, 3000)}\n\nIndique até 6 versículos.` },
    ],
    { json: true, temperature: 0.4 }
  );
  const data = parseJsonLoose<AiAnswer>(answer);
  const items: SuggestionItem[] = [];
  for (const entry of data?.versiculos ?? []) {
    if (!entry.ref) continue;
    const [verse] = await resolveReferences(db, [entry.ref]);
    if (!verse) continue; // referência inventada ou fora da Bíblia: fica de fora
    const key = `${verse.book_abbrev}:${verse.chapter}:${verse.verse}`;
    if (skip.has(key)) continue;
    skip.add(key);
    items.push({ verse, detail: entry.motivo?.trim() || undefined });
    if (items.length >= 6) break;
  }
  return items;
}
