import { providers, BigNumber, utils, ethers } from 'ethers';

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

interface WalletModuleCallbackFunction<T1> {
    (param: T1): void;
}

interface WalletModule {

    get address(): string;
    get provider(): providers.BaseProvider;
    get connected(): boolean;
    get installed(): boolean;

    initialize(walletKind: WalletKind): void;
    initializeWithWeb3Provider(provider: providers.Web3Provider): void;
    connect(): Promise<void>;
    disconnect(): void;
    loadBalance(): void;
    switchNetwork(): void;

    addOnWalletInstalledListeners(listener: WalletModuleCallbackFunction<OnWalletInstalledResult>): this;
    addOnChainConnectedListeners(listener: WalletModuleCallbackFunction<OnChainConnectedResult>): this;
    addOnChainChangedListeners(listener: WalletModuleCallbackFunction<OnChainChangedResult>): this;
    addOnAccountChangedListeners(listener: WalletModuleCallbackFunction<OnAccountChangedResult>): this;
    addOnAccountConnectCanceledListeners(listener: WalletModuleCallbackFunction<void>): this;
    addOnDisconnectedListeners(listener: WalletModuleCallbackFunction<void>): this;
    addOnBalanceChangedListeners(listener: WalletModuleCallbackFunction<string>): this;

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

    private _balance: BigNumber;
    private _address!: string;
    private _web3Provider!: providers.Web3Provider;

    private _walletInstalled: boolean = false;
    private _walletConnected: boolean = false;

    private _listeners: Map<WalletModuleEvent, Array<WalletModuleCallbackFunction<any>>>;

    constructor() {
        this._balance = BigNumber.from(0);
        this._listeners = new Map();
    }

    get address(): string {
        throw new Error('Method not implemented.');
    }
    get connected(): boolean {
        throw new Error('Method not implemented.');
    }

    get installed(): boolean {
        return this._walletInstalled;
    }

    initialize(walletKind: WalletKind): void {
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
                        throw new Error("Couldn't find MetaMask.");
                    }
                } else {
                    web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                }
                break;
            case WalletKind.Binance:
                web3Provider = new ethers.providers.Web3Provider(window.BinanceChain);
                break;
            case WalletKind.Coinbase:
                web3Provider = new ethers.providers.Web3Provider(window.coinbaseWalletExtension);
                break;
            default:
                throw new Error('Unknown is not supported at this method. Please use connectWithProvider instead.');
        }

        this.initializeWithWeb3Provider(web3Provider);
    }

    _emitListener<Type>(event: WalletModuleEvent, param: Type): void {
        this._listeners.get(event)?.forEach(
            (callback: WalletModuleCallbackFunction<Type>) => {
                callback(param);
            }
        );
    }

    _emitWalletInstalled(param: OnWalletInstalledResult) {
        this._emitListener(WalletModuleEvent.WalletInstalled, { installed: param.installed, kind: param.kind });
        this._walletInstalled = param.installed;
    }

    _emitAccountChanged(param: OnAccountChangedResult) {
        this._emitListener(WalletModuleEvent.AccountChanged, param);
        this._walletConnected = (param.account.length > 0);
    }

    initializeWithWeb3Provider(web3Provider: providers.Web3Provider): void {
        if (web3Provider && web3Provider._isProvider) {
            this._web3Provider = web3Provider;
            this._emitWalletInstalled({ installed: true, kind: this._determineWalletKind(web3Provider) })
            this._listeners.get(WalletModuleEvent.ChainChanged)?.forEach(
                (callback: WalletModuleCallbackFunction<OnChainChangedResult>) => {
                    (web3Provider.provider as any).on('chainChanged', (chainId: string) => {
                        callback({ chainId: parseInt(chainId, 16) });
                    });
                }
            );
            web3Provider.getNetwork().then((network) => {
                this._emitListener(WalletModuleEvent.ChainConnected, { chainId: network.chainId, name: network.name });
            });
        } else {
            this._emitListener(WalletModuleEvent.WalletInstalled, { installed: false, kind: WalletKind.Unknown });
        }
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
                this._listeners.get(WalletModuleEvent.AccountChanged)?.forEach(
                    (callback: WalletModuleCallbackFunction<OnAccountChangedResult>) => {
                        (this._web3Provider.provider as any).on('accountsChanged',  (accountArray: Array<string>) => {
                            callback({ account: accountArray[0] });
                        });
                    }
                );

                this._emitAccountChanged({account: accounts[0]});
            }
            
            return Promise.resolve();
        } catch (err) {
            console.log(err);
            this._emitListener(WalletModuleEvent.AccountConnectCanceled, undefined);
        }
    }

    disconnect(): void {
        throw new Error('Method not implemented.');
    }

    switchNetwork(): void {
        throw new Error('Method not implemented.');
    }

    get provider(): providers.BaseProvider {
        return this._web3Provider;
    }

    async loadBalance() {
        return this._loadBalance(this._address);
    }

    async _loadBalance(address: string) {
        // const contractUserBalance = await this._provider.getBalance(address);
        // const amount = utils.formatEther(contractUserBalance);
        const amount = '1000';
        console.log(`${WalletModuleEvent.BalanceChanged} Amount:${amount}`);

        this._listeners.get(WalletModuleEvent.BalanceChanged)?.forEach(
            function (value: WalletModuleCallbackFunction<string>) {
                value(amount);
            }
        )
        return amount;
    }

    _addEventListners<Type>(event: WalletModuleEvent, listener: WalletModuleCallbackFunction<Type>): this {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }

        this._listeners.get(event)?.push(listener);
        return this;
    }

    addOnWalletInstalledListeners(listener: WalletModuleCallbackFunction<OnWalletInstalledResult>): this {
        return this._addEventListners(WalletModuleEvent.WalletInstalled, listener);
    }

    addOnBalanceChangedListeners(listener: WalletModuleCallbackFunction<string>): this {
        return this._addEventListners(WalletModuleEvent.BalanceChanged, listener);
    }

    addOnChainConnectedListeners(listener: WalletModuleCallbackFunction<OnChainConnectedResult>): this {
        return this._addEventListners(WalletModuleEvent.ChainConnected, listener);
    }

    addOnChainChangedListeners(listener: WalletModuleCallbackFunction<OnChainChangedResult>): this {
        return this._addEventListners(WalletModuleEvent.ChainChanged, listener);
    }

    addOnAccountChangedListeners(listener: WalletModuleCallbackFunction<OnAccountChangedResult>): this {
        return this._addEventListners(WalletModuleEvent.AccountChanged, listener);
    }

    addOnAccountConnectCanceledListeners(listener: WalletModuleCallbackFunction<void>): this {
        return this._addEventListners(WalletModuleEvent.AccountConnectCanceled, listener);
    }

    addOnDisconnectedListeners(listener: WalletModuleCallbackFunction<void>): this {
        return this._addEventListners(WalletModuleEvent.Disconnected, listener);
    }
}