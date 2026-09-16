import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfirmMnemonic'>;

function pickCheckIndices(total: number, count: number): number[] {
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * total));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

export default function ConfirmMnemonicScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { mnemonic } = route.params;
  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);
  const checkIndices = useMemo(() => pickCheckIndices(words.length, 3), [words.length]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleConfirm = () => {
    const allCorrect = checkIndices.every(
      (i) => (answers[i] ?? '').trim().toLowerCase() === words[i].toLowerCase()
    );
    if (!allCorrect) {
      Alert.alert('Incorrect', 'One or more words don’t match. Please check your backup and try again.');
      return;
    }
    navigation.navigate('SetPin', { mnemonic });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Confirm your backup</Text>
      <Text style={styles.subtitle}>Enter the requested words from your recovery phrase.</Text>

      {checkIndices.map((i) => (
        <View key={i} style={styles.field}>
          <Text style={styles.label}>Word #{i + 1}</Text>
          <TextInput
            style={styles.input}
            value={answers[i] ?? ''}
            onChangeText={(text) => setAnswers((prev) => ({ ...prev, [i]: text }))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="word"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
    field: { marginBottom: 16 },
    label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 16,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
