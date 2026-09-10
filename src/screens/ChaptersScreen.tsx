import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BibleStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<BibleStackParamList, 'Chapters'>;

export function ChaptersScreen({ route, navigation }: Props) {
  const { bookAbbrev, bookName, chapterCount } = route.params;
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  useLayoutEffect(() => {
    navigation.setOptions({ title: bookName });
  }, [navigation, bookName]);

  return (
    <View style={styles.container}>
      <FlatList
        data={chapters}
        keyExtractor={(n) => String(n)}
        numColumns={5}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Pressable
            style={styles.cell}
            onPress={() => navigation.navigate('Reading', { bookAbbrev, bookName, chapter: item })}
          >
            <Text style={styles.cellText}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  grid: { padding: 12 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 17, fontWeight: '600', color: colors.primaryDark },
});
