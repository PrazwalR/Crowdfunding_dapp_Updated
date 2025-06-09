import React, { useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

// INTERNAL IMPORT
import { CrowdFundingABI, CrowdFundingAddress } from "./contants"; 

//----FETCHING SMART CONTRACT
const fetchContract = (signerOrProvider) =>
  new ethers.Contract(CrowdFundingAddress, CrowdFundingABI, signerOrProvider);

export const CrowdFundingContext = React.createContext();

export const CrowdFundingProvider = ({ children }) => {
  const titleData = "Crowd Funding Contract";
  const [currentAccount, setCurrentAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  
  // Mumbai Testnet configuration
  const MUMBAI_TESTNET = {
    chainId: '0x13881', // 80001 in hex
    chainName: 'Mumbai Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com/']
  };
  
  // Function to switch to Mumbai Testnet
  const switchToMumbai = async () => {
    if (!window.ethereum) {
      throw new Error('No crypto wallet found. Please install MetaMask.');
    }
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MUMBAI_TESTNET.chainId }],
      });
      return true;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MUMBAI_TESTNET],
          });
          return true;
        } catch (addError) {
          console.error('Error adding Mumbai Testnet:', addError);
          throw new Error('Failed to add Mumbai Testnet to your wallet');
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        throw new Error('Please connect to Mumbai Testnet to continue');
      }
      console.error('Error switching to Mumbai:', switchError);
      throw new Error('Failed to switch to Mumbai Testnet');
    }
  };

  //----CREATE CAMPAIGN FUNCTION 
  const createCampaign = async (campaign) => {
    const { title, description, amount, deadline } = campaign;
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = fetchContract(signer);

    console.log(currentAccount);
    try {
      const transaction = await contract.createCampaign(
        currentAccount, // owner
        title, // title
        description, // description
        ethers.utils.parseUnits(amount, 18),
        new Date(deadline).getTime() // deadline
      );

      await transaction.wait();

      console.log("contract call success", transaction);
    } catch (error) {
      console.log("contract call failure", error);
    }
  };

  //----GET CAMPAIGNS FUNCTION
  const getCampaigns = async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = fetchContract(provider);
    const campaigns = await contract.getCampaigns();

    const parsedCampaigns = campaigns.map((campaign, i) => ({
      owner: campaign.owner,
      title: campaign.title,
      description: campaign.description,
      target: ethers.utils.formatEther(campaign.target.toString()),
      deadline: campaign.deadline.toNumber(),
      amountCollected: ethers.utils.formatEther(
        campaign.amountCollected.toString()
      ),
      pId: i,
    }));

    return parsedCampaigns;
  };

  //----GET USER CAMPAIGNS FUNCTION
  const getUserCampaigns = async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = fetchContract(provider);
    const allCampaigns = await contract.getCampaigns();

    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });
    const currentUser = accounts[0];

    const filteredCampaigns = allCampaigns.filter(
      (campaign) => campaign.owner === "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" // "0xaE0CCAC79AfFE82c8d736b1Eaa8351fe9E0f1A23" //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );

    const userData = filteredCampaigns.map((campaign, i) => ({
      owner: campaign.owner,
      title: campaign.title,
      description: campaign.description,
      target: ethers.utils.formatEther(campaign.target.toString()),
      deadline: campaign.deadline.toNumber(),
      amountCollected: ethers.utils.formatEther(
        campaign.amountCollected.toString()
      ),
      pId: i,
    }));

    return userData;
  };

  //----DONATE FUNCTION
  const donate = async (pId, amount) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = fetchContract(signer);

    const campaignData = await contract.donateToCampaign(pId, {
      value: ethers.utils.parseEther(amount),
    });

    await campaignData.wait();
    location.reload();

    return campaignData;
  };

  //----GET DONATIONS FUNCTION
  const getDonations = async (pId) => {
    const provider = new ethers.providers.JsonRpcProvider();
    const contract = fetchContract(provider);

    const donations = await contract.getDonators(pId);
    const numberOfDonations = donations[0].length;

    const parsedDonations = [];

    for (let i = 0; i < numberOfDonations; i++) {
      parsedDonations.push({
        donator: donations[0][i],
        donation: ethers.utils.formatEther(donations[1][i].toString()),
      });
    }

    return parsedDonations;
  };

  //----CHECK IF WALLET IS CONNECTED
  const checkIfWalletConnected = async () => {
    try {
      if (!window.ethereum) {
        return setOpenError(true), setError("Install MetaMask");
      }

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length) {
        setCurrentAccount(accounts[0]);
      } else {
        console.log("No Account Found");
      }
    } catch (error) {
      console.log("Something wrong while connecting to wallet");
    }
  };

  // useEffect to check wallet connection on mount
  useEffect(() => {
    checkIfWalletConnected();
  }, []);

  //----CONNECT WALLET FUNCTION
  const connectWallet = async () => {
    try {
      if (!window.ethereum) return console.log("Install MetaMask");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log("Error while connecting to wallet");
    }
  };

  // Initialize provider and contract when component mounts
  useEffect(() => {
    const init = async () => {
      try {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const contract = fetchContract(signer);
        
        setProvider(provider);
        setContract(contract);
        
        // Set up account and chain changed listeners
        if (window.ethereum) {
          window.ethereum.on('accountsChanged', (accounts) => {
            setCurrentAccount(accounts[0]);
          });
          
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        }
      } catch (error) {
        console.error("Error initializing Web3:", error);
      }
    };
    
    init();
    
    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Return the context provider
  return (
    <CrowdFundingContext.Provider
      value={{
        titleData,
        createCampaign,
        getCampaigns,
        getUserCampaigns,
        donate,
        getDonations,
        currentAccount,
        connectWallet,
        contract,
        provider,
        isWrongNetwork,
        switchToMumbai,
        switchNetwork: switchToMumbai // Alias for backward compatibility
      }}
    >
      {children}
    </CrowdFundingContext.Provider>
  );
};
