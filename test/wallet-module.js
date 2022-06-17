const { WalletModule } = require("../dist");

const walletModule = new WalletModule();

walletModule
    .addOnWalletInstalledListeners(({ installed, kind }) => {
        console.log(`Wallet Installed: ${installed} Kind: ${kind}`);
    })
    .addOnBalanceChangedListeners((amount) => {
        console.log(`This is amount : ${amount}`);
    })
    .initialize();

    
walletModule.loadBalance();