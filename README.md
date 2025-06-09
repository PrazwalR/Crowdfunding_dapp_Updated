# Crowdfunding dApp with Enhanced UI/UX & IPFS Integration

![Crowdfunding dApp Demo](https://github.com/PrazwalR/Crowdfunding_dapp_Updated/blob/main/screenshots/dapp-demo.gif?raw=true)

## Overview

A modern decentralized crowdfunding platform built on Ethereum with enhanced user experience and IPFS integration. This dApp allows creators to launch campaigns and receive contributions in cryptocurrency, with all campaign data securely stored on IPFS.

## Key Features ✨

- **Enhanced Modern UI/UX** - Beautiful, intuitive interface with smooth animations
- **IPFS Integration** - Campaign metadata stored decentralized on IPFS
- **Blockchain Foundation** - Powered by Ethereum smart contracts
- **Responsive Design** - Works flawlessly on desktop and mobile
- **Real-time Updates** - Instant campaign tracking and funding progress
- **Secure Transactions** - MetaMask integration for safe cryptocurrency handling
- **Campaign Analytics** - Visual funding progress and contributor statistics

## Technology Stack 🛠️

### Frontend
- React.js with Vite
- Tailwind CSS
- Framer Motion (animations)
- Web3.js (Ethereum interaction)

### Backend & Blockchain
- Solidity (Smart Contracts)
- Ethereum (Sepolia Testnet)
- Hardhat (Development environment)

### Storage
- IPFS (InterPlanetary File System)
- Pinata (IPFS pinning service)

## Screenshots 🖼️

| Home Page | Campaign Creation | Campaign Details |
|-----------|-------------------|------------------|
| ![Home Page](https://github.com/PrazwalR/Crowdfunding_dapp_Updated/blob/main/screenshots/home.png?raw=true) | ![Campaign Creation](https://github.com/PrazwalR/Crowdfunding_dapp_Updated/blob/main/screenshots/create-campaign.png?raw=true) | ![Campaign Details](https://github.com/PrazwalR/Crowdfunding_dapp_Updated/blob/main/screenshots/campaign-details.png?raw=true) |

## Getting Started 🚀

### Prerequisites
- Node.js (v16+)
- MetaMask wallet
- Sepolia ETH (for testing)

### Installation
1. Clone the repository:
```bash
git clone https://github.com/PrazwalR/Crowdfunding_dapp_Updated.git
cd Crowdfunding_dapp_Updated
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your Pinata API keys to .env
```

4. Start the development server:
```bash
npm run dev
```

### Deploy Smart Contracts
1. Navigate to the contracts directory:
```bash
cd hardhat
```

2. Install dependencies:
```bash
npm install
```

3. Compile contracts:
```bash
npx hardhat compile
```

4. Deploy to Sepolia testnet:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## IPFS Integration 🌐

Campaign data is stored on IPFS through the following process:

1. User creates campaign with details and image
2. Frontend packages metadata into JSON format
3. JSON file is uploaded to IPFS via Pinata API
4. IPFS hash (CID) is stored on blockchain
5. When viewing campaign, dApp retrieves metadata from IPFS

```javascript
// Example IPFS upload function
const uploadToIPFS = async (data) => {
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
    },
    body: JSON.stringify(data),
  });
  
  const resData = await response.json();
  return `ipfs://${resData.IpfsHash}`;
};
```

## Contributing 🤝

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support the Project ❤️

If you find this project useful, consider starring the repository on GitHub!

[![Star on GitHub](https://img.shields.io/github/stars/PrazwalR/Crowdfunding_dapp_Updated?style=social)](https://github.com/PrazwalR/Crowdfunding_dapp_Updated)
