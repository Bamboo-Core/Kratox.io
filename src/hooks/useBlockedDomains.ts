import { useEffect, useState } from 'react';

interface BlockedDomain {
  blockedAt: string | number | Date;
  id: string;
  domain: string;
}

const useBlockedDomains = () => {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Simulate fetching initial data
  useEffect(() => {
    setIsLoading(true);
    // Simulate an API call
    setTimeout(() => {
      try {
        const initialDomains: BlockedDomain[] = [
          { id: '1', domain: 'example.com', blockedAt: new Date() },
          { id: '2', domain: 'test.org', blockedAt: new Date() },
        ];
        setBlockedDomains(initialDomains);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, []);

  const addBlockedDomain = async (domain: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate an API call to add a domain
      await new Promise(resolve => setTimeout(resolve, 500));
      const newDomain: BlockedDomain = {
        id: crypto.randomUUID(),
        domain,
        blockedAt: new Date(),
      };
      setBlockedDomains(prevDomains => [...prevDomains, newDomain]);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeBlockedDomain = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate an API call to remove a domain
      await new Promise(resolve => setTimeout(resolve, 500));
      setBlockedDomains(prevDomains => prevDomains.filter(domain => domain.id !== id));
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    blockedDomains,
    isLoading,
    error,
    addBlockedDomain,
    removeBlockedDomain,
  };
};

export default useBlockedDomains;
