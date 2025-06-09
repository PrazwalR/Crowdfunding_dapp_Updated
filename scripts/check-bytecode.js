const hre = require("hardhat");

async function main() {
  const provider = new hre.ethers.providers.JsonRpcProvider("http://localhost:8545");
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Get the bytecode
  const bytecode = await provider.getCode(contractAddress);
  console.log("Contract bytecode length:", bytecode.length);
  
  // Get the function selector for createCampaign
  const createCampaignSig = "createCampaign(address,string,string,uint256,uint256,string)";
  const selector = hre.ethers.utils.id(createCampaignSig).slice(0, 10);
  console.log("Expected selector for createCampaign:", selector);
  
  // Check if the selector exists in the bytecode
  if (bytecode.includes(selector)) {
    console.log("✓ createCampaign with 6 parameters found in bytecode");
  } else {
    console.log("✗ createCampaign with 6 parameters NOT found in bytecode");
    
    // Check for the old signature (5 parameters)
    const oldSig = "createCampaign(address,string,string,uint256,uint256)";
    const oldSelector = hre.ethers.utils.id(oldSig).slice(0, 10);
    console.log("Checking for old selector:", oldSelector);
    
    if (bytecode.includes(oldSelector)) {
      console.log("✓ Found old createCampaign with 5 parameters");
      console.log("\n⚠️  The deployed contract doesn't match the ABI!");
      console.log("   Please recompile and redeploy the contract.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
