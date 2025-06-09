import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Provider';
import { formatEther } from 'ethers/lib/utils';
import { FiHeart, FiShare2, FiClock, FiUser, FiDollarSign, FiExternalLink } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const CampaignCard = ({ campaign, id, onDonate }) => {
  const { account, web3Provider: library } = useWeb3();
  const [amount, setAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);

  const calculateTimeLeft = () => {
    const difference = new Date(campaign.deadline * 1000) - new Date();
    
    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      return `${days}d ${hours}h left`;
    }
    return 'Ended';
  };

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 3600000);

    return () => clearInterval(timer);
  }, [campaign.deadline]);

  const progress = Math.min((campaign.amountCollected / campaign.target) * 100, 100);
  const formattedAmountCollected = parseFloat(formatEther(campaign.amountCollected)).toFixed(2);
  const formattedTarget = parseFloat(formatEther(campaign.target)).toFixed(2);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    setIsDonating(true);
    try {
      const success = await onDonate(id, amount);
      if (success) {
        setAmount('');
        setShowDonateModal(false);
      }
    } catch (err) {
      console.error('Donation failed:', err);
    } finally {
      setIsDonating(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    },
    hover: {
      y: -5,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    }
  };

  const progressBarVariants = {
    initial: { width: 0 },
    animate: { 
      width: `${progress}%`,
      transition: { duration: 1, ease: 'easeInOut' }
    }
  };

  return (
    <>
      <motion.div
        className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <div className="relative">
          <div className="overflow-hidden h-56">
            <motion.img 
              src={campaign.image || '/default-campaign.jpg'} 
              alt={campaign.title}
              className="w-full h-full object-cover transform transition-transform duration-500"
              animate={{
                scale: isHovered ? 1.05 : 1
              }}
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
            <button 
              onClick={() => setShowDonateModal(true)}
              className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg transform transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              Support This Project
            </button>
          </div>
          
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
            >
              <FiHeart 
                className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} 
              />
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
              onClick={(e) => {
                e.stopPropagation();
                // Implement share functionality
                if (navigator.share) {
                  navigator.share({
                    title: campaign.title,
                    text: `Check out this campaign: ${campaign.title}`,
                    url: window.location.href,
                  });
                }
              }}
            >
              <FiShare2 className="w-5 h-5 text-gray-700" />
            </motion.button>
          </div>
          
          <div className="absolute top-4 left-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              timeLeft === 'Ended' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-indigo-100 text-indigo-800'
            }`}>
              <FiClock className="mr-1.5 h-4 w-4" />
              {timeLeft}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight">
              {campaign.title}
            </h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 ml-2 whitespace-nowrap">
              {campaign.category || 'General'}
            </span>
          </div>
          
          <p className="text-gray-600 mb-4 line-clamp-3 min-h-[60px] text-sm">
            {campaign.description}
          </p>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">{formattedAmountCollected} ETH</span>
              <span className="text-gray-500">of {formattedTarget} ETH</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                variants={progressBarVariants}
                initial="initial"
                animate="animate"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1.5">
              <span>{Math.round(progress)}% funded</span>
              <span>{campaign.donators?.length || 0} backers</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center">
              <div className="relative">
                <img 
                  className="h-10 w-10 rounded-full border-2 border-white shadow" 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${campaign.owner}`} 
                  alt="Owner"
                />
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {`${campaign.owner?.substring(0, 6)}...${campaign.owner?.substring(38)}`}
                </p>
                <p className="text-xs text-gray-500">Creator</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowDonateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center"
            >
              <FiDollarSign className="mr-1.5" />
              Donate
            </button>
          </div>
        </div>
      </motion.div>

      {/* Donation Modal */}
      <AnimatePresence>
        {showDonateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDonateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Support {campaign.title}
                    </h3>
                    <button
                      onClick={() => setShowDonateModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <form onSubmit={handleDonate} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Amount (ETH)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiDollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="0.1"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">ETH</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Your contribution will help bring this project to life. Every bit counts!
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isDonating}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ${
                          isDonating ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        {isDonating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <FiDollarSign className="mr-2 h-5 w-5" />
                            Donate Now
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">
                        Powered by Ethereum blockchain
                      </p>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CampaignCard;
