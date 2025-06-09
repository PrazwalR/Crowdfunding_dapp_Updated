"use client";

import "../styles/globals.css";
import { NavBar, Footer } from "../Components";
import { CrowdFundingProvider } from "../Context/CrowdFunding";
import { Web3ProviderWrapper } from "../context/Web3Provider";

export default function App({ Component, pageProps }) {
  return (
    <Web3ProviderWrapper>
      <CrowdFundingProvider>
        <div className="min-h-screen flex flex-col">
          <NavBar />
          <main className="flex-grow">
            <Component {...pageProps} />
          </main>
          <Footer />
        </div>
      </CrowdFundingProvider>
    </Web3ProviderWrapper>
  );
}
