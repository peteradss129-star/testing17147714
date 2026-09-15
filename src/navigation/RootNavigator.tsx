import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWallet } from '../context/WalletContext';
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

export type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ConfirmMnemonic: { mnemonic: string };
  ImportWallet: undefined;
  SetPin: { mnemonic: string };
  Home: undefined;
  Receive: undefined;
  Send: { defaultChain?: ChainKey; isTestnet?: boolean; tokenAddress?: string } | undefined;
  AddToken: { defaultChain?: ChainKey; isTestnet?: boolean } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0B0E17', card: '#0B0E17' },
};

export default function RootNavigator() {
  const { isLoading, hasWallet, isUnlocked } = useWallet();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0E17', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#627EEA" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0B0E17' }, headerTintColor: '#fff' }}>
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
            <Stack.Screen name="Receive" component={ReceiveScreen} options={{ title: '' }} />
            <Stack.Screen name="Send" component={SendScreen} options={{ title: '' }} />
            <Stack.Screen name="AddToken" component={AddTokenScreen} options={{ title: '' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
