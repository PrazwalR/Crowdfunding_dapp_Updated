"use client";

import React, { useEffect, useContext, useState, useCallback } from "react";

// Components
import Hero from "../Components/Hero";
import CampaignCard from "../Components/CampaignCard";
import CreateCampaignForm from "../Components/CreateCampaignForm";
import { CrowdFundingContext } from "../Context/CrowdFunding";
import { useWeb3 } from "../context/Web3Provider";

// Utils
import { fetchFromIPFS } from "../utils/ipfs-utils";

const HomePage = () => {
  const { web3Provider } = useWeb3();
  const { contract } = useContext(CrowdFundingContext);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load campaigns from the contract with improved error handling
  const loadCampaigns = useCallback(async () => {
    if (!contract || !web3Provider) {
      console.log('Contract or web3Provider not available');
      setIsLoading(false);
      return [];
    }
    
    try {
      console.log('Starting to load campaigns...');
      setIsLoading(true);
      setError('');
      
      // Get the signer's address
      const signer = await web3Provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log('Connected with address:', signerAddress);
      
      const contractWithSigner = contract.connect(signer);
      
      // Get campaign count safely
      let campaignCount = 0;
      try {
        campaignCount = await contractWithSigner.numberOfCampaigns();
        campaignCount = campaignCount.toNumber();
        console.log(`Found ${campaignCount} campaigns`);
      } catch (countErr) {
        console.error('Error getting campaign count:', countErr);
        setError('Failed to load campaign count. Please refresh the page.');
        setIsLoading(false);
        return [];
      }
      
      if (campaignCount === 0) {
        setCampaigns([]);
        setIsLoading(false);
        return [];
      }
      
      // Process campaigns in batches to avoid UI freeze
      const BATCH_SIZE = 3;
      const campaignsArray = [];
      
      // Process campaigns in batches
      for (let i = 0; i < campaignCount; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, campaignCount);
        console.log(`Loading campaigns ${i} to ${batchEnd - 1}`);
        
        // Process current batch in parallel
        const batchPromises = [];
        for (let j = i; j < batchEnd; j++) {
          batchPromises.push(loadSingleCampaign(j, contractWithSigner, web3Provider));
        }
        
        // Wait for all promises in batch to resolve
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            campaignsArray.push(result.value);
          }
        }
        
        // Update UI after each batch
        setCampaigns([...campaignsArray]);
        
        // Small delay between batches to prevent rate limiting
        if (batchEnd < campaignCount) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return campaignsArray;
      
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setError('Failed to load campaigns. Please try refreshing the page.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [contract, web3Provider]);
  
  // Helper function to load a single campaign with retry logic
  const loadSingleCampaign = async (campaignId, contractWithSigner, web3Provider) => {
    const MAX_RETRIES = 2;
    let retryCount = 0;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        console.log(`Loading campaign ${campaignId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        
        // Get campaign data
        const campaign = await contractWithSigner.campaigns(campaignId);
        
        // Get IPFS hash if available
        let ipfsHash = '';
        try {
          ipfsHash = await contractWithSigner.campaignIpfsHashes(campaignId);
          console.log(`Campaign ${campaignId} IPFS hash:`, ipfsHash);
        } catch (hashErr) {
          console.warn(`Error getting IPFS hash for campaign ${campaignId}:`, hashErr);
        }
        
        // Basic campaign data
        const campaignData = {
          id: campaignId,
          owner: campaign.owner || '0x0000000000000000000000000000000000000000',
          title: campaign.title || `Campaign ${campaignId + 1}`,
          description: campaign.description || 'No description provided',
          target: web3Provider ? web3Provider.utils.fromWei(campaign.target.toString(), 'ether') : '0',
          deadline: new Date(campaign.deadline * 1000).toLocaleDateString(),
          amountCollected: web3Provider ? web3Provider.utils.fromWei(campaign.amountCollected.toString(), 'ether') : '0',
          image: '/default-campaign.jpg',
          ipfsHash: ipfsHash || ''
        };
        
        // If there's a valid IPFS hash, fetch metadata
        if (ipfsHash && ipfsHash.startsWith('Qm')) {
          try {
            const metadata = await fetchFromIPFS(ipfsHash);
            if (metadata.success && metadata.data) {
              // Only update if we have valid data
              if (metadata.data.image) {
                campaignData.image = metadata.data.image.startsWith('http') 
                  ? metadata.data.image 
                  : `https://ipfs.io/ipfs/${metadata.data.image.replace('ipfs://', '')}`;
              }
              if (metadata.data.description) {
                campaignData.description = metadata.data.description;
              }
              if (metadata.data.title) {
                campaignData.title = metadata.data.title;
              }
            }
          } catch (ipfsError) {
            console.warn(`[Campaign ${campaignId}] IPFS fetch warning:`, ipfsError.message);
            // Continue with default data if IPFS fetch fails
          }
        }
        
        console.log(`Successfully loaded campaign ${campaignId}:`, campaignData);
        return campaignData;
        
      } catch (error) {
        retryCount++;
        if (retryCount > MAX_RETRIES) {
          console.error(`[Campaign ${campaignId}] Failed after ${MAX_RETRIES} retries:`, error);
          return null;
        }
        console.warn(`[Campaign ${campaignId}] Retry ${retryCount}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }
    
    return null;
  };

  // Handle donation
  const handleDonate = async (campaignId, amount) => {
    if (!contract || !web3Provider) {
      console.error('Contract or web3Provider not available');
      return false;
    }
    
    try {
      const signer = await web3Provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      const value = web3Provider.utils.parseEther(amount.toString());
      
      const tx = await contractWithSigner.donateToCampaign(campaignId, {
        value,
        gasLimit: 3000000 // Add gas limit to prevent out of gas errors
      });
      
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        await loadCampaigns();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Donation failed:', err);
      setError(err.message || 'Failed to process donation');
      return false;
    }
  };

  // Handle campaign creation
  const handleCreateCampaign = async (campaignData) => {
    if (!contract || !web3Provider) {
      console.error('Contract or web3Provider not available');
      setError('Please connect your wallet first');
      return false;
    }
    
    try {
      setError('');
      const signer = await web3Provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      // Convert target amount to wei
      const targetInWei = web3Provider.utils.parseEther(campaignData.target.toString());
      const deadlineTimestamp = Math.floor(new Date(campaignData.deadline).getTime() / 1000);
      const ipfsHash = campaignData.ipfsHash || '';
      
      console.log('Creating campaign with data:', {
        owner: await signer.getAddress(),
        title: campaignData.title,
        description: campaignData.description,
        target: targetInWei.toString(),
        deadline: deadlineTimestamp,
        ipfsHash: ipfsHash
      });
      
      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.estimateGas.createCampaign(
          await signer.getAddress(),
          campaignData.title || 'Untitled Campaign',
          campaignData.description || '',
          targetInWei,
          deadlineTimestamp,
          ipfsHash
        );
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (estimationError) {
        console.error('Error estimating gas:', estimationError);
        setError('Failed to estimate gas. Please try again.');
        return false;
      }
      
      // Send transaction with gas buffer
      try {
        const tx = await contractWithSigner.createCampaign(
          await signer.getAddress(),
          campaignData.title || 'Untitled Campaign',
          campaignData.description || '',
          targetInWei,
          deadlineTimestamp,
          ipfsHash,
          {
            gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
          }
        );
        
        console.log('Transaction sent, hash:', tx.hash);
        setError('Transaction sent. Waiting for confirmation...');
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        
        if (receipt.status === 1) {
          console.log('Transaction successful');
          setError('Transaction confirmed! Loading campaign details...');
          
          // Wait a moment for the blockchain to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Reload campaigns
          await loadCampaigns();
          
          // Wait a bit more to ensure the UI updates
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return true;
        } else {
          console.error('Transaction failed');
          setError('Transaction failed. Please try again.');
          return false;
        }
      } catch (txError) {
        console.error('Transaction error:', txError);
        setError(txError.message || 'Failed to create campaign. Please try again.');
        return false;
      }
      
    } catch (error) {
      console.error('Error in handleCreateCampaign:', error);
      setError(error.message || 'An unexpected error occurred');
      return false;
    }
  };

  
  // Load campaigns when contract or web3Provider changes
  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero onGetStarted={() => setShowCreateForm(true)} />
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            <span className="block">Discover Amazing Campaigns</span>
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Support innovative ideas and be part of something bigger.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDonate={handleDonate}
            />
          ))}
        </div>

        {campaigns.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
            <p className="mt-1 text-sm text-gray-500">Be the first to create a campaign!</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 01-1 1h-3a1 1 0 110-2h3V9a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Campaign
              </button>
            </div>
          </div>
        )}
      </main>

      <CreateCampaignForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCampaignCreated={loadCampaigns}
      />
    </div>
  );
};

export default HomePage;
