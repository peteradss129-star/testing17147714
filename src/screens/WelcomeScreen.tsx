import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.logo}>◎</Text>
        <Text style={styles.title}>MyWallet</Text>
        <Text style={styles.subtitle}>Your keys, your crypto. Non-custodial multi-chain wallet.</Text>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CreateWallet')}
        >
          <Text style={styles.primaryButtonText}>Create a new wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ImportWallet')}
        >
          <Text style={styles.secondaryButtonText}>I already have a wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between', padding: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logo: { fontSize: 64, color: colors.primary, marginBottom: 12 },
    title: { fontSize: 32, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
    buttons: { gap: 12, marginBottom: 24 },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    secondaryButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    secondaryButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  });
}
