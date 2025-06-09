"use client";
import { useState, useCallback, useContext } from 'react';
import { useWeb3 } from '../context/Web3Provider';
import { CrowdFundingContext } from '../Context/CrowdFunding';
import { uploadToIPFS } from '../utils/ipfs-utils';
import ImageUploader from './ImageUploader';

export default function CreateCampaignForm({ onCampaignCreated, onCancel, isOpen, onClose }) {
  const { 
    contract, 
    provider, 
    connectWallet, 
    currentAccount, 
    isWrongNetwork, 
    switchToMumbai 
  } = useContext(CrowdFundingContext);
  const { web3Provider } = useWeb3();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target: '',
    deadline: '',
    category: 'General',
    image: ''
  });
  const [ipfsHash, setIpfsHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState({});
  const [previewImage, setPreviewImage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = useCallback(async (file) => {
    if (!file) return;
    
    // Check file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setError('Image size should be less than 10MB');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('Uploading image...');
      setUploadProgress(10);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
      
      // Upload to IPFS using the file upload function
      const { success, hash, error: uploadError } = await uploadToIPFS(file);
      setUploadProgress(80);
      
      if (success && hash) {
        const imageUrl = `https://ipfs.io/ipfs/${hash}`;
        setFormData(prev => ({
          ...prev,
          image: imageUrl
        }));
        setIpfsHash(hash);
        setUploadProgress(100);
        setError('');
        return imageUrl;
      } else {
        throw new Error(uploadError || 'Failed to upload image to IPFS');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error.message || 'Failed to process image');
      // Fallback to default image
      setPreviewImage('/default-campaign.jpg');
      setFormData(prev => ({
        ...prev,
        image: '/default-campaign.jpg'
      }));
      return null;
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.target || isNaN(formData.target) || Number(formData.target) <= 0) {
      errors.target = 'Please enter a valid target amount';
    }
    
    if (!formData.deadline) {
      errors.deadline = 'Deadline is required';
    } else if (new Date(formData.deadline) < new Date()) {
      errors.deadline = 'Deadline must be in the future';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Reset states
      setError('');
      setIsLoading(true);
      
      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setIsLoading(false);
        return;
      }
      
      console.log('Starting form submission...');
      console.log('Form data:', formData);
      
      // Check if wallet is connected
      if (!currentAccount) {
        setError('Connecting wallet...');
        await connectWallet();
        // Wait a moment for the wallet to connect
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Check if we're on the right network
      if (isWrongNetwork) {
        setError('Switching to Mumbai Testnet...');
        try {
          await switchToMumbai();
          // Wait for network switch
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Reload the page to reinitialize the contract with the new network
          window.location.reload();
          return;
        } catch (error) {
          throw new Error('Please switch to Mumbai Testnet to continue');
        }
      }
      
      // Validate form data
      if (!formData.title || !formData.description || !formData.target || !formData.deadline) {
        throw new Error('Please fill in all required fields');
      }
      
      // Check if deadline is in the future
      const selectedDate = new Date(formData.deadline);
      if (selectedDate < new Date()) {
        throw new Error('Please select a future date for the deadline');
      }
      
      if (!contract) {
        throw new Error('Failed to connect to the contract. Please try again.');
      }
      
      if (!web3Provider?.provider?.selectedAddress) {
        throw new Error('Please connect your wallet first');
      }
    
      setIsLoading(true);
      setError('');
      
      // Ensure we have a signer
      const signer = provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      // Network check is now handled by the context
      // Use the signer we already have
      
      let imageUrl = formData.image;
      if (formData.image && typeof formData.image !== 'string') {
        setError('Uploading campaign image...');
        try {
          console.log('Starting image upload to IPFS...');
          const result = await uploadToIPFS(formData.image);
          console.log('Image upload result:', result);
          
          if (!result.success || !result.hash) {
            console.warn('Image upload may not have been successful, but continuing with fallback');
            // Use a fallback image URL if the upload fails
            imageUrl = '/default-campaign.jpg';
          } else {
            imageUrl = `https://ipfs.io/ipfs/${result.hash}`;
            console.log('Image uploaded successfully to:', imageUrl);
          }
        } catch (uploadError) {
          console.error('Error uploading image to IPFS:', uploadError);
          // Continue with a fallback image instead of failing the entire form
          imageUrl = '/default-campaign.jpg';
          setError('Using default image due to upload error. ' + (uploadError.message || ''));
        }
      }
      
      // Prepare metadata
      const metadata = {
        name: formData.title,
        description: formData.description,
        image: imageUrl || '/default-campaign.jpg',
        category: formData.category || 'General',
        createdAt: new Date().toISOString(),
        external_url: window.location.origin,
      };
      
      console.log('Uploading metadata to IPFS:', metadata);
      setError('Uploading campaign details to IPFS...');
      
      // Upload metadata to IPFS
      let metadataHash = '';
      try {
        setError('Uploading campaign details to IPFS...');
        console.log('Uploading metadata to IPFS:', metadata);
        
        const metadataResult = await uploadToIPFS(metadata);
        console.log('IPFS upload result:', metadataResult);
        
        if (metadataResult.success && metadataResult.hash) {
          metadataHash = metadataResult.hash;
          console.log('Metadata uploaded successfully, hash:', metadataHash);
        } else {
          console.warn('IPFS upload may not have been successful, but continuing with empty hash');
          // Continue with an empty hash if the upload fails
          metadataHash = '';
        }
      } catch (error) {
        console.error('Error uploading metadata to IPFS:', error);
        // Continue with an empty hash if the upload fails
        metadataHash = '';
        setError('Warning: Could not save metadata to IPFS. ' + (error.message || ''));
      }
      
      // Use ethers.utils to parse Ether values
      const { ethers } = await import('ethers');
      console.log('Parsing target amount:', formData.target);
      const targetInWei = ethers.utils.parseEther(formData.target);
      console.log('Target in wei:', targetInWei.toString());
      
      const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);
      console.log('Deadline timestamp:', deadlineTimestamp);
      
      const ipfsUrl = `ipfs://${metadataHash}`;
      console.log('IPFS URL:', ipfsUrl);
      
      setError('Creating campaign on blockchain...');
      try {
        console.log('Creating campaign with params:', {
          owner: currentAccount,
          title: formData.title,
          description: formData.description,
          ipfsHash: metadataHash,  // Just the hash, not the full URL
          target: targetInWei.toString(),
          deadline: deadlineTimestamp
        });
        
        console.log('Preparing to call createCampaign with params:', {
          owner: currentAccount,
          title: formData.title,
          description: formData.description,
          target: targetInWei.toString(),
          deadline: deadlineTimestamp
        });

        try {
          // The ABI expects: (owner, title, description, target, deadline)
          console.log('Creating campaign with params:', {
            owner: currentAccount,
            title: formData.title,
            description: formData.description,
            target: targetInWei.toString(),
            deadline: deadlineTimestamp
          });
          
          console.log('Estimating gas for createCampaign...');
          
          // First, estimate gas with IPFS hash
          const gasEstimate = await contractWithSigner.estimateGas.createCampaign(
            currentAccount,
            formData.title,
            formData.description,
            targetInWei,
            deadlineTimestamp,
            metadataHash || '' // Include IPFS hash (empty string if not available)
          );
          
          // Add 20% buffer to the gas estimate
          const gasLimit = Math.floor(gasEstimate.toNumber() * 1.2);
          console.log('Estimated gas:', gasEstimate.toString(), 'Using gas limit:', gasLimit);
          
          // Get current gas price and add a small buffer
          const gasPrice = await provider.getGasPrice();
          const bufferedGasPrice = gasPrice.mul(120).div(100); // 20% higher than current
          console.log('Current gas price:', gasPrice.toString(), 'Using gas price:', bufferedGasPrice.toString());
          
          // Step 1: Create the campaign
          setError('Sending transaction to create campaign...');
          console.log('Sending createCampaign transaction with:', {
            gasLimit,
            gasPrice: bufferedGasPrice.toString()
          });
          
          const createTx = await contractWithSigner.createCampaign(
            currentAccount,          // _owner
            formData.title,          // _title
            formData.description,    // _description
            targetInWei,             // _target (in wei)
            deadlineTimestamp,       // _deadline (timestamp)
            metadataHash || '',      // _ipfsHash (empty string if not available)
            { 
              gasLimit: gasLimit,
              gasPrice: bufferedGasPrice
            }
          );
          
          console.log('Transaction hash:', createTx.hash);
          setError('Waiting for transaction confirmation...');
          
          // Wait for the transaction to be mined
          const receipt = await createTx.wait();
          console.log('Transaction receipt:', receipt);
          
          if (receipt.status !== 1) {
            console.error('Transaction failed:', receipt);
            throw new Error('Transaction failed');
          }
          
          console.log('Transaction successful!');
          setError('Transaction confirmed! Fetching campaign details...');
          
          // Get the campaign ID from the transaction logs
          const campaignId = (await contractWithSigner.numberOfCampaigns()).toNumber() - 1;
          console.log('Campaign created with ID:', campaignId);
          
          // IPFS hash is now included in the createCampaign call, no need for separate transaction
          
          console.log('Campaign creation completed successfully');
          return { receipt, campaignId };
        } catch (txError) {
          console.error('Error in transaction:', txError);
          if (txError.data) {
            console.error('Transaction error data:', txError.data);
          }
          if (txError.message) {
            console.error('Transaction error message:', txError.message);
          }
          throw new Error(`Transaction failed: ${txError.message}`);
        }
      } catch (txError) {
        console.error('Transaction error:', txError);
        throw new Error(txError.message || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Error in form submission:', {
        error: err,
        message: err.message,
        stack: err.stack,
        formData: formData
      });
      
      // More user-friendly error messages
      let errorMessage = 'Failed to create campaign';
      if (err.message.includes('Failed to upload campaign metadata to IPFS')) {
        errorMessage = 'Failed to save campaign details. Please check your internet connection and try again.';
      } else if (err.message.includes('User denied')) {
        errorMessage = 'Transaction was rejected by your wallet';
      } else if (err.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Start a New Campaign</h2>
            <p className="text-gray-500 mt-1">Share your idea with the world</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-500 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Title
            </label>
            <div className="w-full">
              <input
                type="text"
                placeholder="Campaign Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-lg p-4"
              placeholder="Tell people more about your campaign..."
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="target" className="block text-sm font-medium text-gray-700 mb-1">
                Funding Goal (ETH)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  id="target"
                  name="target"
                  min="0.01"
                  step="0.01"
                  value={formData.target}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-4 pr-12 py-3 sm:text-sm border border-gray-300 rounded-lg"
                  placeholder="0.00"
                  required
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">ETH</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Deadline
              </label>
              <div className="w-full">
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.deadline ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
                {formErrors.deadline && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.deadline}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Image (Optional)
            </label>
            <div className="mt-1 flex items-center">
              <div className="mr-4">
                <img 
                  src={previewImage || '/default-campaign.jpg'} 
                  alt="Campaign preview" 
                  className="h-24 w-24 object-cover rounded-lg border-2 border-dashed border-gray-300" 
                />
              </div>
              <div>
                <ImageUploader 
                  onImageUpload={handleImageUpload} 
                  disabled={isLoading}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {previewImage ? 'Image selected' : 'No image selected. A default image will be used.'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-3 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
              disabled={isLoading}
            >
              <option value="Technology">Technology</option>
              <option value="Art">Art</option>
              <option value="Gaming">Gaming</option>
              <option value="Music">Music</option>
              <option value="Film">Film</option>
              <option value="Publishing">Publishing</option>
            </select>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 inline-flex items-center ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create Campaign
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
