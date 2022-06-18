import { providers, BigNumber, ethers } from 'ethers';

declare global {
    interface Window {
        ethereum?: any;
        BinanceChain?: any;
        coinbaseWalletExtension?: any;
    }
}

export enum WalletKind {
    MetaMask = 1,
    Binance = 2,
    Coinbase = 3,
    Unknown = 99
}

type OnAccountChangedResult = {
    account: string
}

type OnChainChangedResult = {
    chainId: number,
}

type OnChainConnectedResult = {
    chainId: number,
    name: string
}

type OnWalletInstalledResult = {
    installed: boolean,
    kind: WalletKind
}

type AddNetworkParam = {
    chainId: string,
    chainName: string,
    nativeCurrency: {
        name: string,
        symbol: string,
        decimals: number,
    },
    rpcUrls: Array<string>,
    blockExplorerUrls: Array<string>
}

interface WalletModuleCallbackFunction<T1> {
    (param: T1): void;
}

interface WalletModule {

    get address(): string;
    get shortenAddress(): string;
    get provider(): providers.BaseProvider;
    get connected(): boolean;
    get installed(): boolean;

    initialize(walletKind: WalletKind): void;
    initializeWithWeb3Provider(provider: providers.Web3Provider): void;
    connect(): Promise<void>;
    disconnect(): void;
    switchNetwork(chainId: number, addNetworkIfNotExists?: AddNetworkParam): Promise<void>;

    getBalance(inEther?: boolean): Promise<string>;

    loadBalance(): void;

    bindOnWalletInstalledListeners(listener: WalletModuleCallbackFunction<OnWalletInstalledResult>): this;
    bindOnChainConnectedListeners(listener: WalletModuleCallbackFunction<OnChainConnectedResult>): this;
    bindOnChainChangedListeners(listener: WalletModuleCallbackFunction<OnChainChangedResult>): this;
    bindOnAccountChangedListeners(listener: WalletModuleCallbackFunction<OnAccountChangedResult>): this;
    bindOnAccountConnectCanceledListeners(listener: WalletModuleCallbackFunction<void>): this;
    bindOnDisconnectedListeners(listener: WalletModuleCallbackFunction<void>): this;
    bindOnBalanceChangedListeners(listener: WalletModuleCallbackFunction<BigNumber>): this;
}

enum WalletModuleEvent {
    WalletInstalled,
    BalanceChanged,
    ChainConnected,
    ChainChanged,
    AccountChanged,
    AccountConnectCanceled,
    Disconnected
}

export class DefaultWalletModule implements WalletModule {

    private _initialized: boolean = false;
    private _address!: string;
    private _web3Provider!: providers.Web3Provider;

    private _walletInstalled: boolean = false;
    private _walletConnected: boolean = false;

    private _listeners: Map<WalletModuleEvent, WalletModuleCallbackFunction<any>>;

    constructor() {
        this._listeners = new Map();
    }

    get provider(): providers.BaseProvider {
        return this._web3Provider;
    }

    get address(): string {
        if (this._address) {
            return this._address;
        }
        throw new Error("Wallet not connected.");
    }

    get shortenAddress(): string {
        if (this._address) {
            return `${this._address.substring(0, 4 + 1)}...${this._address.substring(this._address.length - 4, this._address.length)}`;
        }
        throw new Error("Wallet not connected.");
    }

    get connected(): boolean {
        return this._walletConnected;
    }

    get installed(): boolean {
        return this._walletInstalled;
    }

    initialize(walletKind: WalletKind): void {
        if (this._initialized) {
            console.warn("you're trying to initialize WalletModule twice. Initialization is allowed just one time with specific provider. If runtime environment is under React. It could be occured because of StrictMode.");
            return;
        }
        let web3Provider;

        switch (walletKind) {
            case WalletKind.MetaMask:
                if (window.ethereum.providers) {
                    for (let p of window.ethereum.providers) {
                        if (p.isMetaMask) {
                            web3Provider = new ethers.providers.Web3Provider(p);
                            break;
                        }
                    }
                    if (typeof web3Provider === 'undefined') {
                        throw new Error("Can't find MetaMask Wallet.");
                    }
                } else {
                    web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                }
                break;
            case WalletKind.Binance:
                if(!window.BinanceChain) { throw new Error("Can't find Binance Wallet."); }
                web3Provider = new ethers.providers.Web3Provider(window.BinanceChain);
                break;
            case WalletKind.Coinbase:
                if(!window.coinbaseWalletExtension) { throw new Error("Can't find Coinbase Wallet."); }
                web3Provider = new ethers.providers.Web3Provider(window.coinbaseWalletExtension);
                break;
            default:
                throw new Error('Unknown is not supported at this method. Please use connectWithProvider instead.');
        }

        this.initializeWithWeb3Provider(web3Provider);
    }

    initializeWithWeb3Provider(web3Provider: providers.Web3Provider): void {
        if (web3Provider && web3Provider._isProvider) {
            this._web3Provider = web3Provider;
            this._initialized = true;
            this._emitWalletInstalled({ installed: true, kind: this._determineWalletKind(web3Provider) });

            (web3Provider.provider as any).on('chainChanged', (chainId: string) => {
                this._emitListener(WalletModuleEvent.ChainChanged, { chainId: parseInt(chainId, 16) });
            });

            web3Provider.getNetwork().then((network) => {
                this._emitListener(WalletModuleEvent.ChainConnected, { chainId: network.chainId, name: network.name });
            });
        } else {
            this._emitListener(WalletModuleEvent.WalletInstalled, { installed: false, kind: WalletKind.Unknown });
        }
    }

    async getBalance(inEther?: boolean): Promise<string> {
        if (!this._walletConnected) {
            throw new Error("Wallet not connected.");
        }
        const balance = await this._web3Provider.getBalance(this._address);
        if (inEther) {
            return ethers.utils.formatEther(balance);
        }
        return balance.toString();
    }

    _emitListener<Type>(event: WalletModuleEvent, param: Type): void {
        this._listeners.get(event)?.call(this, param);
    }

    _emitWalletInstalled(param: OnWalletInstalledResult) {
        this._emitListener(WalletModuleEvent.WalletInstalled, { installed: param.installed, kind: param.kind });
        this._walletInstalled = param.installed;
    }

    _emitAccountChanged(param: OnAccountChangedResult) {
        this._emitListener(WalletModuleEvent.AccountChanged, param);
        this._walletConnected = (param.account.length > 0);
    }

    private _determineWalletKind(provider: providers.Web3Provider): WalletKind {
        if (provider.provider.isMetaMask) {
            return WalletKind.MetaMask;
        } else {
            type providerProperty = keyof typeof provider.provider;
            const isCoinbaseWallet = 'isCoinbaseWallet' as providerProperty;

            if (provider.provider[isCoinbaseWallet]) {
                return WalletKind.Coinbase;
            }

            const bnbSign = 'bnbSign' as providerProperty;
            if (provider.provider[bnbSign]) {
                return WalletKind.Binance;
            }
        }

        return WalletKind.Unknown;
    }

    async connect(): Promise<void> {
        try {
            const accounts = await this._web3Provider.send('eth_requestAccounts', []);
            if (accounts.length > 0) {
                this._address = accounts[0];

                (this._web3Provider.provider as any).on('accountsChanged', (accountArray: Array<string>) => {
                    // If wallet is not connected, do not fire on account change result callback.                        
                    if (this._walletConnected) {
                        this._address = accountArray[0];
                        this._emitListener(WalletModuleEvent.AccountChanged, { account: accountArray[0] });
                    }
                });

                this._emitAccountChanged({ account: accounts[0] });
            }

            return Promise.resolve();
        } catch (err) {
            console.log(err);
            this._emitListener(WalletModuleEvent.AccountConnectCanceled, undefined);
        }
    }

    disconnect(): void {
        this._walletConnected = false;        
        this._emitListener(WalletModuleEvent.Disconnected, undefined);
    }

    async switchNetwork(chainId: number, addNetworkIfNotExists?: AddNetworkParam): Promise<void> {
        try {
            await this._web3Provider.send('wallet_switchEthereumChain', [{ chainId: '0x' + chainId.toString(16) }]);
        } catch (err) {
            if (addNetworkIfNotExists) {
                await this._web3Provider.send('wallet_addEthereumChain', [addNetworkIfNotExists]);
            }
        }
    }

    async loadBalance() {
        const balance = await this._web3Provider.getBalance(this._address);
        this._emitListener(WalletModuleEvent.BalanceChanged, balance);
    }

    _bindEventListners<Type>(event: WalletModuleEvent, listener: WalletModuleCallbackFunction<Type>): this {       
        this._listeners.set(event, listener);
        return this;
    }

    bindOnWalletInstalledListeners(listener: WalletModuleCallbackFunction<OnWalletInstalledResult>): this {
        return this._bindEventListners(WalletModuleEvent.WalletInstalled, listener);
    }

    bindOnBalanceChangedListeners(listener: WalletModuleCallbackFunction<BigNumber>): this {
        return this._bindEventListners(WalletModuleEvent.BalanceChanged, listener);
    }

    bindOnChainConnectedListeners(listener: WalletModuleCallbackFunction<OnChainConnectedResult>): this {
        return this._bindEventListners(WalletModuleEvent.ChainConnected, listener);
    }

    bindOnChainChangedListeners(listener: WalletModuleCallbackFunction<OnChainChangedResult>): this {
        return this._bindEventListners(WalletModuleEvent.ChainChanged, listener);
    }

    bindOnAccountChangedListeners(listener: WalletModuleCallbackFunction<OnAccountChangedResult>): this {
        return this._bindEventListners(WalletModuleEvent.AccountChanged, listener);
    }

    bindOnAccountConnectCanceledListeners(listener: WalletModuleCallbackFunction<void>): this {
        return this._bindEventListners(WalletModuleEvent.AccountConnectCanceled, listener);
    }

    bindOnDisconnectedListeners(listener: WalletModuleCallbackFunction<void>): this {
        return this._bindEventListners(WalletModuleEvent.Disconnected, listener);
    }
}