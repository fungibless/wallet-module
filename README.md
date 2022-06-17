# wallet-module

A library that provides a programming model for input, output, and event handling through a unified interface for various Ethereum-based wallet providers on a web browser. Compatible with Metamask, Binance and Coinbase wallets.

## Getting Started

```javascript
const walletModule = new WalletModule();

walletModule
    .addOnWalletInstalledListeners(({ installed, kind }) => {
      console.log(`wallet installed: ${installed} kind: ${WalletKind[kind]}`);
    })
    .addOnChainConnectedListeners(({ chainId, name }) => {
      console.log('chain connected chainId:', chainId, " name:", name);
    })
    .addOnChainChangedListeners(({ chainId }) => {
      console.log('chain changed chainId:', chainId );
    })
    .addOnAccountChangedListeners(({account}) => {
      console.log('account changed', account);
    })
    .addOnAccountConnectCanceledListeners(() => {
      console.log("user canceled");
    })
    .addOnBalanceChangedListeners((amount) => {
      console.log(`this is amount : ${amount}`);
    })
    .addOnDisconnectedListeners(() => {
      console.log('disconnected');
    })
    .initialize(WalletKind.MetaMask);

function connect() {
  walletModule.connect();
}
```
