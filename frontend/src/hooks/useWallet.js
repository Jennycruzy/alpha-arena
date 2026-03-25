import { useState, useCallback } from "react";
import { ethers } from "ethers";

const XLAYER_CHAIN = {
  chainId: "0xC4", // 196
  chainName: "X Layer Mainnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: ["https://rpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/explorer/xlayer"],
};

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error("No wallet detected. Install MetaMask or OKX Wallet.");
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);

      // Switch to X Layer
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: XLAYER_CHAIN.chainId }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [XLAYER_CHAIN],
          });
        }
      }

      const s = await browserProvider.getSigner();
      setProvider(browserProvider);
      setSigner(s);
      setAddress(accounts[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
  }, []);

  return { address, provider, signer, connecting, error, connect, disconnect };
}
