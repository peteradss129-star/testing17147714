import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17', justifyContent: 'space-between', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 64, color: '#627EEA', marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9AA3B2', textAlign: 'center', paddingHorizontal: 20 },
  buttons: { gap: 12, marginBottom: 24 },
  primaryButton: { backgroundColor: '#627EEA', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { borderColor: '#2A2F3D', borderWidth: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
