# wallet-module

A library that provides a programming model for input, output, and event handling through a unified interface for various Ethereum-based wallet providers on a web browser. Compatible with Metamask, Binance and Coinbase wallets.

## Demo Site
https://fungibless.xyz/

## Getting started

```bash
npm install --save @fungibless/wallet-module
or
yarn install @fungibless/wallet-module
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
const [walletModule] = React.useState(new WalletModule());
const [walletInstalled, setWalletInstalled] = React.useState(false);
const [chainConnected, setChainConnected] = React.useState(false);
const [walletConnected, setWalletConnected] = React.useState(false);
const [walletAddress, setWalletAddress] = React.useState("");
const [walletChainId, setWalletChainId] = React.useState("");
const [walletBalance, setWalletBalance] = React.useState(
	ethers.BigNumber.from(0)
);

const initializeWallet = React.useCallback(
	(walletKind) => {
		walletModule
			.bindOnWalletInstalledListeners(({ installed, kind }) => {
				console.log(`wallet installed: ${installed} kind: ${WalletKind[kind]}`);
				setWalletInstalled(true);
			})
			.bindOnChainConnectedListeners(({ chainId, name }) => {
				console.log("chain connected chainId:", chainId, " name:", name);
				setChainConnected(true);
				setWalletChainId(chainId);
			})
			.bindOnChainChangedListeners(({ chainId }) => {
				console.log("chain changed chainId:", chainId);
				window.location.reload();
			})
			.bindOnAccountChangedListeners(({ account }) => {
				console.log("account changed", account);
				setWalletConnected(true);
				setWalletAddress(account);
			})
			.bindOnAccountConnectCanceledListeners(() => {
				console.log("user canceled");
			})
			.bindOnBalanceChangedListeners((amount) => {
				console.log(`this is amount : ${amount}`);
				setWalletBalance(amount);
			})
			.bindOnDisconnectedListeners(() => {
				console.log("disconnected");
				setWalletConnected(false);
				setWalletBalance(ethers.BigNumber.from(0));
				setWalletAddress("");
			})
			.initialize(walletKind);
	},
	[walletModule]
);

const balanceEther = React.useMemo(() => {
	return ethers.utils.formatEther(walletBalance);
}, [walletBalance]);

React.useEffect(() => {
	try {
		initializeWallet(WalletKind.Coinbase);
	} catch (err) {
		console.error(err);
	}
}, [initializeWallet]);

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
