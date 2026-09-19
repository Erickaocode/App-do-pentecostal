import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserDb } from '../db/UserDbProvider';
import { listFavorites, removeFavorite } from '../db/userQueries';
import type { FavoritesStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme';
import type { Favorite } from '../types';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'FavoritesList'>;

export function FavoritesListScreen({ navigation }: Props) {
  const db = useUserDb();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const reload = useCallback(() => {
    listFavorites(db).then(setFavorites);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleRemove(fav: Favorite) {
    await removeFavorite(db, fav.book_abbrev, fav.chapter, fav.verse);
    reload();
  }

  function openInBible(fav: Favorite) {
    navigation.getParent<any>()?.navigate('BibliaTab', {
      screen: 'Reading',
      params: {
        bookAbbrev: fav.book_abbrev,
        bookName: fav.book_name,
        chapter: fav.chapter,
        focusVerse: fav.verse,
      },
    });
  }

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <Text style={styles.empty}>
          Nenhum versículo favoritado ainda. Toque no ícone de coração em qualquer versículo na
          aba Bíblia para salvá-lo aqui.
        </Text>
      ) : null}

      <FlatList
        data={favorites}
        keyExtractor={(f) => String(f.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openInBible(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardRef}>
                {item.book_name} {item.chapter}:{item.verse}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Remover favorito', 'Deseja remover este versículo dos favoritos?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Remover', style: 'destructive', onPress: () => handleRemove(item) },
                  ])
                }
              >
                <Ionicons name="heart" size={20} color={colors.danger} />
              </Pressable>
            </View>
            <Text style={styles.cardText}>{item.verse_text}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    empty: {
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 32,
      marginTop: 24,
      lineHeight: 20,
    },
    listContent: { padding: 16, gap: 10 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardRef: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    cardText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 21,
    },
  });
}
