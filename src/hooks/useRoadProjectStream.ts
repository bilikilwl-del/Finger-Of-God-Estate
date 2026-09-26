import { useEffect, useState, useRef, useCallback } from 'react';
import { RoadProjectTransaction, RoadProjectSummary } from '../types/database';

interface UseRoadProjectStreamOptions {
  onTransactionReceived?: (tx: RoadProjectTransaction, summary?: RoadProjectSummary, message?: string) => void;
  onExpenditureRecorded?: (tx: RoadProjectTransaction, summary?: RoadProjectSummary, message?: string) => void;
  onRefreshNeeded?: () => void;
}

export function useRoadProjectStream(options: UseRoadProjectStreamOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<{
    id: string;
    message: string;
    type: 'CREDIT' | 'DEBIT' | 'INFO';
    amount?: number;
    timestamp: string;
  } | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const dismissNotification = useCallback(() => {
    setLastNotification(null);
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/road-project/stream');

        eventSource.onopen = () => {
          if (!isSubscribed) return;
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (!isSubscribed || !event.data) return;
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'TRANSACTION_VERIFIED' && data.transaction) {
              setLastNotification({
                id: `notif-${Date.now()}`,
                message: data.message || `New verified contribution: ₦${data.transaction.amount?.toLocaleString()} from ${data.transaction.payer_or_vendor}!`,
                type: 'CREDIT',
                amount: data.transaction.amount,
                timestamp: new Date().toLocaleTimeString()
              });

              if (optionsRef.current.onTransactionReceived) {
                optionsRef.current.onTransactionReceived(data.transaction, data.summary, data.message);
              }
              if (optionsRef.current.onRefreshNeeded) {
                optionsRef.current.onRefreshNeeded();
              }
            } else if (data.type === 'EXPENDITURE_RECORDED' && data.transaction) {
              setLastNotification({
                id: `notif-${Date.now()}`,
                message: data.message || `Disbursement recorded: ₦${data.transaction.amount?.toLocaleString()} to ${data.transaction.payer_or_vendor}`,
                type: 'DEBIT',
                amount: data.transaction.amount,
                timestamp: new Date().toLocaleTimeString()
              });

              if (optionsRef.current.onExpenditureRecorded) {
                optionsRef.current.onExpenditureRecorded(data.transaction, data.summary, data.message);
              }
              if (optionsRef.current.onRefreshNeeded) {
                optionsRef.current.onRefreshNeeded();
              }
            } else if (data.type === 'RECONCILIATION_UPDATED') {
              if (optionsRef.current.onRefreshNeeded) {
                optionsRef.current.onRefreshNeeded();
              }
            }
          } catch {
            // Heartbeat comment or non-JSON
          }
        };

        eventSource.onerror = () => {
          if (!isSubscribed) return;
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Attempt reconnect after 5s
          setTimeout(() => {
            if (isSubscribed) connectSSE();
          }, 5000);
        };
      } catch {
        setIsConnected(false);
      }
    }

    connectSSE();

    // Fallback polling every 15s to guarantee fresh data even if SSE drops
    pollInterval = setInterval(() => {
      if (optionsRef.current.onRefreshNeeded) {
        optionsRef.current.onRefreshNeeded();
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  return {
    isConnected,
    lastNotification,
    dismissNotification
  };
}
