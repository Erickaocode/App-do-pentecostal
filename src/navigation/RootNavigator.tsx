import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { BooksScreen } from '../screens/BooksScreen';
import { ChaptersScreen } from '../screens/ChaptersScreen';
import { FavoritesListScreen } from '../screens/FavoritesListScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';
import { NotesListScreen } from '../screens/NotesListScreen';
import { ReadingScreen } from '../screens/ReadingScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { useTheme } from '../context/ThemeContext';
import type {
  BibleStackParamList,
  FavoritesStackParamList,
  HomeStackParamList,
  NotesStackParamList,
  RootTabParamList,
} from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const BibleStack = createNativeStackNavigator<BibleStackParamList>();
const NotesStack = createNativeStackNavigator<NotesStackParamList>();
const FavoritesStack = createNativeStackNavigator<FavoritesStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

/** Opções de cabeçalho compartilhadas pelas pilhas, recriadas só quando o tema muda. */
function useStackScreenOptions() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: { fontWeight: '700' as const },
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors]
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function BibleStackNavigator() {
  const stackScreenOptions = useStackScreenOptions();
  return (
    <BibleStack.Navigator screenOptions={stackScreenOptions}>
      <BibleStack.Screen name="Books" component={BooksScreen} options={{ title: 'Bíblia' }} />
      <BibleStack.Screen name="Chapters" component={ChaptersScreen} />
      <BibleStack.Screen name="Reading" component={ReadingScreen} />
      <BibleStack.Screen name="Search" component={SearchScreen} options={{ title: 'Buscar' }} />
    </BibleStack.Navigator>
  );
}

function NotesStackNavigator() {
  const stackScreenOptions = useStackScreenOptions();
  return (
    <NotesStack.Navigator screenOptions={stackScreenOptions}>
      <NotesStack.Screen
        name="NotesList"
        component={NotesListScreen}
        options={{ title: 'Anotações' }}
      />
      <NotesStack.Screen name="NoteEditor" component={NoteEditorScreen} />
    </NotesStack.Navigator>
  );
}

function FavoritesStackNavigator() {
  const stackScreenOptions = useStackScreenOptions();
  return (
    <FavoritesStack.Navigator screenOptions={stackScreenOptions}>
      <FavoritesStack.Screen
        name="FavoritesList"
        component={FavoritesListScreen}
        options={{ title: 'Favoritos' }}
      />
    </FavoritesStack.Navigator>
  );
}

export function RootNavigator() {
  const { colors } = useTheme();
  const tabScreenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    }),
    [colors]
  );

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="InicioTab"
        component={HomeStackNavigator}
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="BibliaTab"
        component={BibleStackNavigator}
        options={{
          title: 'Bíblia',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AnotacoesTab"
        component={NotesStackNavigator}
        options={{
          title: 'Anotações',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="FavoritosTab"
        component={FavoritesStackNavigator}
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
