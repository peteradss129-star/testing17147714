import React, { useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanQR'>;

// A wallet address embedded in a QR code sometimes carries a URI scheme
// prefix (e.g. "ethereum:0xabc...", "bitcoin:bc1..."). Strip it so the
// recipient field gets just the address.
function extractAddress(scanned: string): string {
  const colonIndex = scanned.indexOf(':');
  if (colonIndex === -1) return scanned.trim();
  return scanned.slice(colonIndex + 1).split('?')[0].trim();
}

export default function ScanQRScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScanned = useRef(false);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScanned.current) return;
    hasScanned.current = true;
    navigation.navigate('Send', { scannedAddress: extractAddress(result.data) });
  };

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>
            Camera access is needed to scan QR codes.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant camera access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Point your camera at a wallet address QR code</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#627EEA',
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionText: { color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  button: {
    backgroundColor: '#627EEA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
