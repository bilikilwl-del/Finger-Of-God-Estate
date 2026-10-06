/**
 * Finger of God Estate Resident Portal
 * Global Tawk.to Live Chat & Visitor Support Integration Component
 */

import React, { useEffect } from 'react';
import { Resident } from '../../types/database';

declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      setAttributes?: (attributes: Record<string, any>, callback?: (error?: any) => void) => void;
      maximize?: () => void;
      minimize?: () => void;
      toggle?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      popup?: () => void;
      getStatus?: () => 'online' | 'away' | 'offline';
    };
    Tawk_LoadStart?: Date;
  }
}

interface TawkToWidgetProps {
  currentResident?: Resident | null;
  currentTab?: string;
  isAdminPage?: boolean;
}

// Maps internal navigation tab codes to human-readable Portal Area labels for support agents
function getPortalAreaLabel(tab?: string): string {
  if (!tab) return 'Finger of God Estate Portal';
  switch (tab) {
    case 'home':
      return 'Public Website - Homepage';
    case 'resident_portal':
      return 'Resident Dashboard';
    case 'login':
      return 'Resident Portal Login';
    case 'activate':
      return 'Resident Account Activation';
    case 'estate_levy':
    case 'levy':
      return 'Security Levy Payment Desk';
    case 'road_project':
    case 'road':
      return 'Road Modernization Project';
    case 'contact':
    case 'support':
      return 'Contact & Support Secretariat';
    case 'security_public':
      return 'Gate Security Control';
    case 'announcements':
    case 'public_announcements':
      return 'Estate Announcements';
    case 'announcement_detail':
      return 'Estate Announcement Detail';
    case 'documents':
      return 'Estate Bylaws & Documents';
    case 'public_residents':
      return 'Public Resident Directory';
    case 'verify_receipt':
      return 'Digital Receipt Verification';
    case 'election':
      return 'Estate Election Ballot';
    default:
      if (tab.startsWith('admin_')) return 'Estate Admin Console';
      return `Section: ${tab}`;
  }
}

export const TawkToWidget: React.FC<TawkToWidgetProps> = ({
  currentResident,
  currentTab,
  isAdminPage = false
}) => {
  useEffect(() => {
    // 1. Check if Tawk.to script is already injected in document
    const existingScript = document.getElementById('tawkto-embed-script');
    
    // Resolve public property and widget IDs strictly from environment variables
    const propertyId = (import.meta.env.VITE_TAWKTO_PROPERTY_ID || '').trim();
    const widgetId = (import.meta.env.VITE_TAWKTO_WIDGET_ID || '').trim();
    const customEmbedUrl = (import.meta.env.VITE_TAWKTO_EMBED_URL || '').trim();
    
    // Determine target embed URL; if neither propertyId+widgetId nor customEmbedUrl exist, skip loading cleanly
    const embedUrl = customEmbedUrl || (propertyId && widgetId ? `https://embed.tawk.to/${propertyId}/${widgetId}` : '');

    if (!embedUrl) {
      // Configuration missing: do not attempt to load script and do not crash the portal
      return;
    }

    if (!existingScript) {
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();

      const s1 = document.createElement('script');
      s1.id = 'tawkto-embed-script';
      s1.async = true;
      s1.src = embedUrl;
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');

      s1.onerror = () => {
        console.warn('[Tawk.to Notice] Live chat script failed to load. Estate portal continues functioning normally.');
      };

      document.head.appendChild(s1);
    }
  }, []);

  // 2. Hide widget on sensitive Admin Console pages to prevent layout obstruction
  useEffect(() => {
    if (!window.Tawk_API) return;

    if (isAdminPage) {
      if (typeof window.Tawk_API.hideWidget === 'function') {
        try {
          window.Tawk_API.hideWidget();
        } catch {
          // Ignore
        }
      }
    } else {
      if (typeof window.Tawk_API.showWidget === 'function') {
        try {
          window.Tawk_API.showWidget();
        } catch {
          // Ignore
        }
      }
    }
  }, [isAdminPage]);

  // 3. Synchronize visitor and authenticated resident context whenever page tab or resident state updates
  useEffect(() => {
    if (isAdminPage) return;

    const areaLabel = getPortalAreaLabel(currentTab);

    const updateContext = () => {
      if (!window.Tawk_API || typeof window.Tawk_API.setAttributes !== 'function') return;

      const safeAttributes: Record<string, any> = {
        'Portal Area': areaLabel,
        'Site Name': 'Finger of God Estate'
      };

      if (currentResident) {
        // Authenticated Resident Identity (STRICT PRIVACY: NEVER send passwords, OTPs, session tokens, phone numbers, home addresses, or payment details)
        safeAttributes.name = currentResident.full_name;
        if (currentResident.email && currentResident.email.includes('@')) {
          safeAttributes.email = currentResident.email.trim();
        }
        safeAttributes['Resident Number'] = currentResident.resident_number;
      }

      try {
        window.Tawk_API.setAttributes(safeAttributes, (err) => {
          if (err) {
            console.warn('[Tawk.to Context Notice]', err);
          }
        });
      } catch {
        // Ignore API timing issues
      }
    };

    // If script is loaded, update attributes immediately; otherwise bind to onLoad
    if (window.Tawk_API && typeof window.Tawk_API.setAttributes === 'function') {
      updateContext();
    } else if (window.Tawk_API) {
      const prevOnLoad = window.Tawk_API.onLoad;
      window.Tawk_API.onLoad = function () {
        if (typeof prevOnLoad === 'function') prevOnLoad();
        updateContext();
      };
    }
  }, [currentResident, currentTab, isAdminPage]);

  return (
    <>
      {/* Mobile-responsive container positioning fix to prevent widget from covering mobile nav or payment action buttons */}
      <style>{`
        @media (max-width: 640px) {
          #tawk-default-container {
            bottom: 12px !important;
            right: 12px !important;
            z-index: 9999 !important;
          }
        }
      `}</style>
    </>
  );
};

// Helper function that can be exported and invoked from any component button (e.g. "Live Support Chat")
export function openTawkToChat() {
  if (window.Tawk_API) {
    if (typeof window.Tawk_API.maximize === 'function') {
      try {
        window.Tawk_API.maximize();
        return true;
      } catch {}
    } else if (typeof window.Tawk_API.toggle === 'function') {
      try {
        window.Tawk_API.toggle();
        return true;
      } catch {}
    }
  }
  return false;
}
