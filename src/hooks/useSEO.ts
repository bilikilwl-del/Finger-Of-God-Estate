import { useEffect } from 'react';

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalPath?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_SITE_NAME = 'Finger of God Estate';
const DEFAULT_BRAND_SUFFIX = ' — Finger of God Estate';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

/**
 * Helper to update or create a <meta> tag by name or property attribute.
 */
function setMetaTag(attributeName: 'name' | 'property', attributeValue: string, content: string | null | undefined) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;

  if (!content) {
    if (element) {
      element.remove();
    }
    return;
  }

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * Helper to update or create a <link rel="canonical"> tag.
 */
function setCanonicalUrl(url: string | null | undefined) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!url) {
    if (element) {
      element.remove();
    }
    return;
  }

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', url);
}

/**
 * Helper to update or create a JSON-LD structured data script tag.
 */
function setStructuredData(data: Record<string, unknown> | Array<Record<string, unknown>> | undefined) {
  if (typeof document === 'undefined') return;

  const SCRIPT_ID = 'seo-structured-data';
  let element = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

  if (!data) {
    if (element) {
      element.remove();
    }
    return;
  }

  if (!element) {
    element = document.createElement('script');
    element.id = SCRIPT_ID;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

/**
 * React hook to set dynamic meta titles, descriptions, open-graph, twitter cards,
 * canonical URLs, and Schema.org structured data for each page component.
 */
export function useSEO({
  title,
  description,
  keywords,
  canonicalPath,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  twitterCard = 'summary_large_image',
  noIndex = false,
  publishedTime,
  modifiedTime,
  author,
  structuredData
}: SEOProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 1. Format document title
    const fullTitle = title.includes(DEFAULT_SITE_NAME) 
      ? title 
      : `${title}${DEFAULT_BRAND_SUFFIX}`;
    document.title = fullTitle;

    // 2. Resolve Canonical URL
    const origin = window.location.origin;
    const currentPath = canonicalPath 
      ? (canonicalPath.startsWith('http') ? canonicalPath : `${origin}${canonicalPath}`)
      : window.location.href;

    // 3. Set standard meta tags
    setMetaTag('name', 'description', description);
    
    if (keywords && keywords.length > 0) {
      setMetaTag('name', 'keywords', keywords.join(', '));
    }

    setMetaTag('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    setMetaTag('name', 'googlebot', noIndex ? 'noindex, nofollow' : 'index, follow');

    // 4. OpenGraph Tags
    setMetaTag('property', 'og:site_name', DEFAULT_SITE_NAME);
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', currentPath);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:locale', 'en_NG');

    if (publishedTime) {
      setMetaTag('property', 'article:published_time', publishedTime);
    }
    if (modifiedTime) {
      setMetaTag('property', 'article:modified_time', modifiedTime);
    }
    if (author) {
      setMetaTag('property', 'article:author', author);
    }

    // 5. Twitter Card Tags
    setMetaTag('name', 'twitter:card', twitterCard);
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 6. Canonical Link
    setCanonicalUrl(currentPath);

    // 7. Structured Data (JSON-LD)
    if (structuredData) {
      setStructuredData(structuredData);
    } else {
      // Default WebPage Schema
      setStructuredData({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': fullTitle,
        'description': description,
        'url': currentPath,
        'isPartOf': {
          '@type': 'WebSite',
          'name': DEFAULT_SITE_NAME,
          'url': origin
        }
      });
    }

    // Cleanup on unmount or tab change
    return () => {
      // Keep site name as fallback
      document.title = `${DEFAULT_SITE_NAME} — Asaba, Delta State`;
    };
  }, [
    title,
    description,
    keywords,
    canonicalPath,
    ogType,
    ogImage,
    twitterCard,
    noIndex,
    publishedTime,
    modifiedTime,
    author,
    structuredData
  ]);
}
