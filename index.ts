// bitcoinjs-lib and its dependencies (bip174, address encoding) call Buffer
// internally, which Hermes/React Native doesn't provide globally. Must load
// before any of those modules do.
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
