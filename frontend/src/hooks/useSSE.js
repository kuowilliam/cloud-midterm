import { useState, useEffect } from 'react';
import sseService from '../services/sseService';

/**
 * Custom hook for using Server-Sent Events (SSE) in React components
 * @param {string} type - The type of SSE data to subscribe to ('status', 'workerStatus', or 'monitorEvents')
 * @param {any} initialData - Initial data to use before SSE connection is established
 * @returns {Object} - An object containing the data, loading state, and error state
 */
function useSSE(type, initialData = null) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reset states when the type changes
    setIsLoading(true);
    setError(null);

    // Add a listener for the specified type
    const removeListener = sseService.addListener(type, (newData) => {
      setData(newData);
      setIsLoading(false);
    });

    // Clean up the listener when the component unmounts or the type changes
    return () => {
      removeListener();
    };
  }, [type]);

  return { data, isLoading, error };
}

export default useSSE;
