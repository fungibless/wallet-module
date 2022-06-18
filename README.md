# wallet-module

A library that provides a programming model for input, output, and event handling through a unified interface for various Ethereum-based wallet providers on a web browser. Compatible with Metamask, Binance and Coinbase wallets.

## Getting started

```bash
npm install --save @fungibless/wallet-module
```

## Multiple Wallet Support

- Choose one below. single walletModule should be initialized only one time with WalletKind

```javascript
walletModule.initialize(WalletKind.MetaMask); // MetaMask Wallet
//walletModule.initialize(WalletKind.Binance); // Binance Wallet
//walletModule.initialize(WalletKind.Coinbase); // Coinbase Wallet
```

## Usage

### Usage in React

```javascript
import { WalletModule, WalletKind } from '@fungibless/wallet-module';

const [walletInstalled, setWalletInstalled] = React.useState(false);
const [chainConnected, setChainConnected] = React.useState(false);
const [walletConnected, setWalletConnected] = React.useState(false);
const [walletAddress, setWalletAddress] = React.useState("");
const [walletChainId, setWalletChainId] = React.useState("");
const [walletBalance, setWalletBalance] = React.useState('0');

React.useEffect(() => {
  walletModule
    .addOnWalletInstalledListeners(({ installed, kind }) => {
      console.log(`wallet installed: ${installed} kind: ${WalletKind[kind]}`);
      setWalletInstalled(true);
    })
    .addOnChainConnectedListeners(({ chainId, name }) => {
      console.log("chain connected chainId:", chainId, " name:", name);
      setChainConnected(true);
      setWalletChainId(chainId);
    })
    .addOnChainChangedListeners(({ chainId }) => {
      console.log("chain changed chainId:", chainId);
      window.location.reload();
    })
    .addOnAccountChangedListeners(({ account }) => {
      console.log("account changed", account);
      setWalletConnected(true);
      setWalletAddress(account);
    })
    .addOnAccountConnectCanceledListeners(() => {
      console.log("user canceled");
    })
    .addOnBalanceChangedListeners((amount) => {
      console.log(`this is amount : ${amount}`);
      setWalletBalance(amount.toString());
    })
    .addOnDisconnectedListeners(() => {
      console.log("disconnected");
      setWalletConnected(false);
      setWalletBalance("0");
      setWalletAddress("");
    })
    .initialize(WalletKind.MetaMask);
}, [
  setWalletInstalled,
  setWalletBalance,
  setChainConnected,
  setWalletConnected,
  setWalletAddress,
  setWalletChainId,
]);

function connect() {
  walletModule.connect();
}

function disconnect() {
  walletModule.disconnect();
}

function getBalance() {
  walletModule.getBalance().then(console.log); // get balance directly.
  walletModule.loadBalance(); // get balance from event listener.
}

function getAddress() {
  console.log(walletModule.address);
  console.log(walletModule.shortenAddress);
}

function switchNetwork(chainId) {
  walletModule.switchNetwork(chainId, {
    chainId: "0x" + Number(chainId).toString(16),
    chainName: "Polygon Mainnet",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: ["https://polygon-rpc.com/"],
    blockExplorerUrls: ["https://polygonscan.com/"],
  });
}
```
