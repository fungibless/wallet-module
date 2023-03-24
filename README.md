# wallet-module

A user-friendly library that offers seamless integration with various Ethereum-based wallet providers in web browsers, including Metamask, Binance, and Coinbase. The wallet-module provides a unified interface for input, output, and event handling, making it easy to manage your wallet within your web application.

## Demo Site

Visit the demo site at https://fungibless.xyz/ to explore wallet-module in action.

## Getting started

To install wallet-module in your project, run:

```bash
npm install --save @fungibless/wallet-module
or
yarn install @fungibless/wallet-module
```

## Multiple Wallet Support

Choose one wallet provider below. Remember to initialize the walletModule only once with the WalletKind of your choice.

```javascript
walletModule.initialize(WalletKind.MetaMask); // MetaMask Wallet
//walletModule.initialize(WalletKind.Binance); // Binance Wallet
//walletModule.initialize(WalletKind.Coinbase); // Coinbase Wallet
```

## Usage

### Usage in React
Here's an example of how to use wallet-module in a React application:

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

This code demonstrates how to use wallet-module to manage the connection, balance, and address of your wallet. It also shows how to handle various events, such as wallet installation, chain connection, and balance changes.

Remember to wrap the code blocks with backticks (`) to ensure proper formatting. This will make it easier for users to copy and paste the code into their projects.

## License
This project is licensed under the terms of the MIT license.
