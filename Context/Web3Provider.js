import { createContext, useContext, useEffect, useState } from 'react';
import { Web3Provider } from '@ethersproject/providers';

const Web3Context = createContext(undefined);

export const Web3ProviderWrapper = ({ children }) => {
  const [web3Provider, setWeb3Provider] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const connect = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new Web3Provider(window.ethereum);
        setWeb3Provider(provider);
        return provider;
      } catch (error) {
        console.error('User denied account access');
        return null;
      }
    } else if (window.web3) {
      const provider = new Web3Provider(window.web3.currentProvider);
      setWeb3Provider(provider);
      return provider;
    } else {
      console.error('No Ethereum browser extension detected');
      return null;
    }
  };

  return (
    <Web3Context.Provider value={{ web3Provider, connect, isClient }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
