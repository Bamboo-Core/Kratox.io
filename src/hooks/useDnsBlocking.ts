import { useState, useEffect, type FormEvent } from 'react';

interface BlockedDomain {
  id: string;
  domain: string;  
}

const useDnsBlocking = () => {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [domainToBlock, setDomainToBlock] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchBlockedDomains();
  }, []);

  const fetchBlockedDomains = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/dns/blocked-domains`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (Array.isArray(data.blockedDomains)) {
        const domains: BlockedDomain[] = data.blockedDomains.map((domain: string) => ({
          id: domain,
          domain: domain,
        }));
        setBlockedDomains(domains);
      } else {
        setBlockedDomains([]);
      }
    } catch (error) {
      console.error("Failed to fetch blocked domains:", error);
      setBlockedDomains([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = (e: FormEvent) => {
    e.preventDefault();
    const newDomainValue = domainToBlock.trim();
    if (!newDomainValue) return;

    if (blockedDomains.some(d => d.domain === newDomainValue)) {
        alert("This domain is already in the blocklist.");
        return;
    }

    const newDomain: BlockedDomain = {
        id: newDomainValue,
        domain: newDomainValue,
    };

    setBlockedDomains(prev => [newDomain, ...prev]);
    setDomainToBlock("");
  };

  const handleRemoveDomain = (idToRemove: string) => {
    setBlockedDomains(prev => prev.filter(d => d.id !== idToRemove));
  };

  return {
    blockedDomains,
    isLoading,
    domainToBlock,
    setDomainToBlock,
    handleAddDomain,
    handleRemoveDomain,
  };
};

export default useDnsBlocking;