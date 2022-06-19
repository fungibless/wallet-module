import { DefaultWalletModule as WalletModule, WalletKind } from './wallet-module';
import { ethers } from 'ethers';
export { WalletModule, WalletKind, ethers };

export function shortenAddress(address: string, lengthToLeave: number) {
    if (address) {
        return `${address.substring(0, lengthToLeave + 1)}...${address.substring(address.length - lengthToLeave, address.length)}`;
    }
}