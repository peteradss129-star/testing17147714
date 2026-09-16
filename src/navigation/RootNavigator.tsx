import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { ChainKey } from '../lib/chains';
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateWalletScreen from '../screens/CreateWalletScreen';
import ConfirmMnemonicScreen from '../screens/ConfirmMnemonicScreen';
import ImportWalletScreen from '../screens/ImportWalletScreen';
import SetPinScreen from '../screens/SetPinScreen';
import UnlockScreen from '../screens/UnlockScreen';
import HomeScreen from '../screens/HomeScreen';
import ReceiveScreen from '../screens/ReceiveScreen';
import SendScreen from '../screens/SendScreen';
import AddTokenScreen from '../screens/AddTokenScreen';
import ScanQRScreen from '../screens/ScanQRScreen';
import AssetHistoryScreen from '../screens/AssetHistoryScreen';
import MarketScreen from '../screens/MarketScreen';

export type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ConfirmMnemonic: { mnemonic: string };
  ImportWallet: undefined;
  SetPin: { mnemonic: string };
  Home: undefined;
  Market: undefined;
  Receive: { isTestnet?: boolean } | undefined;
  Send:
    | { defaultChain?: ChainKey; isTestnet?: boolean; tokenAddress?: string; scannedAddress?: string }
    | undefined;
  AddToken: { defaultChain?: ChainKey; isTestnet?: boolean } | undefined;
  ScanQR: undefined;
  AssetHistory: { chainKey: ChainKey; isTestnet: boolean; tokenAddress?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isLoading, hasWallet, isUnlocked } = useWallet();
  const { mode, colors } = useTheme();

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.background,
    },
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary }}
      >
        {!hasWallet ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreen} options={{ title: '' }} />
            <Stack.Screen name="ConfirmMnemonic" component={ConfirmMnemonicScreen} options={{ title: '' }} />
            <Stack.Screen name="ImportWallet" component={ImportWalletScreen} options={{ title: '' }} />
            <Stack.Screen name="SetPin" component={SetPinScreen} options={{ title: '' }} />
          </>
        ) : !isUnlocked ? (
          <Stack.Screen name="Welcome" component={UnlockScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Market" component={MarketScreen} options={{ title: '' }} />
            <Stack.Screen name="Receive" component={ReceiveScreen} options={{ title: '' }} />
            <Stack.Screen name="Send" component={SendScreen} options={{ title: '' }} />
            <Stack.Screen name="AddToken" component={AddTokenScreen} options={{ title: '' }} />
            <Stack.Screen
              name="ScanQR"
              component={ScanQRScreen}
              options={{ title: 'Scan QR code', headerStyle: { backgroundColor: '#000' }, headerTintColor: '#fff' }}
            />
            <Stack.Screen name="AssetHistory" component={AssetHistoryScreen} options={{ title: '' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
