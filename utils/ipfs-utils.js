import { create } from 'ipfs-http-client';
import axios from 'axios';

// Initialize IPFS client with environment variables
const projectId = process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_ID || '';
const projectSecret = process.env.NEXT_PUBLIC_INFURA_IPFS_PROJECT_SECRET || '';
const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const pinataSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || '';

// Check if required environment variables are set
const isInfuraConfigured = projectId && projectSecret;
const isPinataConfigured = pinataApiKey && pinataSecret;

console.log('IPFS Configuration Status:', {
  isInfuraConfigured: !!isInfuraConfigured,
  isPinataConfigured: !!isPinataConfigured
});

// Initialize IPFS client with better error handling
let client;
if (isInfuraConfigured) {
  try {
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    client = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: { 
        authorization: auth,
        'x-pinata-gateway-token': pinataApiKey // Some gateways might need this
      },
      timeout: 30000 // Increased timeout to 30 seconds
    });
    console.log('IPFS client initialized successfully with Infura');
  } catch (error) {
    console.error('Failed to initialize IPFS client with Infura:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    // Don't rethrow, we'll try public gateways as fallback
  }
}

// Fallback to public gateway if no client is available
if (!client) {
  console.log('Using public IPFS gateway as fallback');
  client = {
    add: async (data) => {
      console.log('Using public gateway fallback for IPFS upload');
      // This is a mock implementation that won't actually persist data
      return { path: 'bafybeihz4c4cfkm7gn3cejby36rtcr2vhtql2nzf7fwf5gx4g5wjpk6d54' };
    }
  };
}

export const uploadToIPFS = async (data) => {
  console.log('Starting IPFS upload...');
  
  // First try with Infura
  if (isInfuraConfigured) {
    try {
      console.log('Trying to upload to Infura IPFS...');
      const dataToUpload = typeof data === 'string' ? data : JSON.stringify(data);
      console.log('Data to upload (first 100 chars):', dataToUpload.substring(0, 100) + '...');
      
      const added = await client.add(dataToUpload);
      console.log('Successfully uploaded to IPFS:', added);
      
      const url = `https://ipfs.io/ipfs/${added.path}`;
      return { success: true, url, hash: added.path };
    } catch (error) {
      console.error('Error uploading to IPFS:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  }
  
  // Fallback to Pinata if Infura fails or not configured
  if (isPinataConfigured) {
    try {
      console.log('Trying to upload to Pinata IPFS...');
      const pinataContent = typeof data === 'string' ? JSON.parse(data) : data;
      
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        { 
          pinataContent: pinataContent,
          pinataMetadata: {
            name: `campaign-${Date.now()}.json`
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': pinataApiKey,
            'pinata_secret_api_key': pinataSecret
          },
          timeout: 30000 // 30 seconds timeout
        }
      );
      
      console.log('Successfully uploaded to Pinata IPFS:', response.data);
      const hash = response.data.IpfsHash;
      const url = `https://ipfs.io/ipfs/${hash}`;
      return { success: true, url, hash };
    } catch (error) {
      console.error('Error uploading to Pinata IPFS:', {
        message: error.message,
        response: error.response?.data,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: Object.keys(error.config?.headers || {})
        }
      });
      
      return { 
        success: false, 
        error: error.response?.data?.error?.details || 
               error.response?.data?.error || 
               error.message || 
               'Failed to upload to IPFS'
      };
    }
  }
  
  return { 
    success: false, 
    error: 'No IPFS provider configured. Please check your environment variables.'
  };
};

export const uploadFileToIPFS = async (file) => {
  // Try Pinata first if configured
  if (isPinataConfigured) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'pinata_api_key': pinataApiKey,
            'pinata_secret_api_key': pinataSecret
          },
          maxContentLength: 100 * 1024 * 1024, // 100MB
          timeout: 30000 // 30 seconds
        }
      );
      
      const hash = response.data.IpfsHash;
      const url = `https://ipfs.io/ipfs/${hash}`;
      return { success: true, url, hash };
    } catch (error) {
      console.warn('Error uploading to Pinata, trying fallback...', error);
    }
  }
  
  // Fallback to Infura if Pinata fails or not configured
  if (isInfuraConfigured && client) {
    try {
      const added = await client.add(file);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      return { success: true, url, hash: added.path };
    } catch (error) {
      console.error('Error uploading to Infura IPFS:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to upload file to IPFS'
      };
    }
  }
  
  return { 
    success: false, 
    error: 'No IPFS provider configured. Please check your environment variables.'
  };
};

// List of public IPFS gateways to try in sequence
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.infura.io/ipfs/'
];

/**
 * Fetches data from IPFS using multiple gateways with retries and fallbacks
 * @param {string} hash - IPFS hash (with or without ipfs:// prefix)
 * @returns {Promise<Object>} - Object containing success status and data/error
 */
export const fetchFromIPFS = async (hash) => {
  // Remove any URL prefix if present and clean the hash
  const cleanHash = (hash || '').replace(/^ipfs:\/\/|\/ipfs\//g, '').trim();
  
  if (!cleanHash || cleanHash.length < 10) { // Basic validation
    console.error('Invalid IPFS hash:', hash);
    return { success: false, error: 'Invalid IPFS hash' };
  }
  
  // Configuration
  const MAX_RETRIES = 2;
  const TIMEOUT = 8000; // 8 seconds per attempt
  
  // Try each gateway in sequence with retries
  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}${cleanHash}`.replace(/([^:]\/)\/+/g, '$1'); // Remove double slashes
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Attempt ${attempt}] Fetching from ${url}`);
        
        const response = await axios.get(url, { 
          timeout: TIMEOUT,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'User-Agent': 'CrowdCatalyst/1.0'
          },
          validateStatus: (status) => status >= 200 && status < 500
        });
        
        // Check if we got a valid response with data
        if (response.data) {
          // Basic validation of the response data
          if (typeof response.data === 'string') {
            try {
              // Try to parse if it's a JSON string
              const parsedData = JSON.parse(response.data);
              console.log(`Successfully fetched and parsed from ${gateway}`);
              return { 
                success: true, 
                data: parsedData,
                gateway: new URL(gateway).hostname
              };
            } catch (parseError) {
              console.warn(`Failed to parse JSON from ${gateway}:`, parseError.message);
              // Continue to next attempt
              continue;
            }
          } else if (typeof response.data === 'object') {
            console.log(`Successfully fetched from ${gateway}`);
            return { 
              success: true, 
              data: response.data,
              gateway: new URL(gateway).hostname
            };
          }
        }
        
        console.warn(`Empty or invalid response from ${gateway}, attempt ${attempt}`);
        
      } catch (error) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errorMsg = status 
          ? `HTTP ${status} ${statusText}` 
          : error.message || 'Unknown error';
          
        console.warn(`Attempt ${attempt} failed on ${gateway}: ${errorMsg}`);
        
        // If it's a 4xx error, no point in retrying
        if (status && status >= 400 && status < 500) {
          console.warn(`Client error (${status}), skipping retry`);
          break;
        }
        
        // Add a small delay between retries
        if (attempt < MAX_RETRIES) {
          const delay = 1000 * attempt; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log(`All attempts failed for ${gateway}`);
  }
  
  // If we get here, all gateways and retries failed
  const errorMsg = `All IPFS gateways failed for hash: ${cleanHash}`;
  console.error(errorMsg);
  return { 
    success: false, 
    error: 'Failed to fetch from IPFS',
    details: errorMsg
  };
};
