const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  // 1. Get the deployed contract
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const provider = new hre.ethers.providers.JsonRpcProvider("http://localhost:8545");
  
  // 2. Get the signer (first account from hardhat node)
  const [signer] = await provider.listAccounts();
  const signerWithProvider = provider.getSigner(signer);
  
  // 3. Get the contract ABI
  const contractArtifact = require('../artifacts/contracts/CrowdFunding.sol/CrowdFunding.json');
  const contract = new hre.ethers.Contract(contractAddress, contractArtifact.abi, signerWithProvider);
  
  console.log("Connected to contract at:", contractAddress);
  console.log("Using signer:", await signerWithProvider.getAddress());
  
  // 4. Test basic contract functionality
  try {
    // Test numberOfCampaigns
    const numCampaigns = await contract.numberOfCampaigns();
    console.log("Number of campaigns:", numCampaigns.toString());
    
    // Test getCampaigns
    const campaigns = await contract.getCampaigns();
    console.log("Campaigns:", JSON.stringify(campaigns, null, 2));
    
    // Test creating a campaign
    console.log("\nCreating a test campaign...");
    const tx = await contract.createCampaign(
      await signerWithProvider.getAddress(),
      "Test Campaign",
      "This is a test campaign",
      hre.ethers.utils.parseEther("1"),
      Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      "QmTestHash1234567890",
      { gasLimit: 1000000 }
    );
    
    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);
    
    // Check updated campaign count
    const newCount = await contract.numberOfCampaigns();
    console.log("New number of campaigns:", newCount.toString());
    
  } catch (error) {
    console.error("Error testing contract:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
