import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  Home: undefined;
};

export type BibleStackParamList = {
  Books: undefined;
  Chapters: { bookAbbrev: string; bookName: string; chapterCount: number };
  Reading: { bookAbbrev: string; bookName: string; chapter: number; focusVerse?: number };
  Search: undefined;
};

export type NotesStackParamList = {
  NotesList: undefined;
  NoteEditor: {
    noteId?: number;
    prefill?: {
      bookAbbrev: string;
      bookName: string;
      chapter: number;
      verse: number;
      text: string;
    };
  };
};

export type FavoritesStackParamList = {
  FavoritesList: undefined;
};

export type RootTabParamList = {
  InicioTab: NavigatorScreenParams<HomeStackParamList>;
  BibliaTab: NavigatorScreenParams<BibleStackParamList>;
  AnotacoesTab: NavigatorScreenParams<NotesStackParamList>;
  FavoritosTab: NavigatorScreenParams<FavoritesStackParamList>;
};
