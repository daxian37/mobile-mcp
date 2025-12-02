/**
 * Browser compatibility checker
 * Checks if the current browser meets minimum requirements
 */

interface BrowserInfo {
  name: string;
  version: number;
  isSupported: boolean;
}

const MIN_VERSIONS = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
};

export function checkBrowserCompatibility(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let browserName = 'unknown';
  let version = 0;

  // Chrome
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Edge
  else if (userAgent.includes('Edg')) {
    browserName = 'edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Firefox
  else if (userAgent.includes('Firefox')) {
    browserName = 'firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Safari
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }

  const minVersion = MIN_VERSIONS[browserName as keyof typeof MIN_VERSIONS];
  const isSupported = minVersion ? version >= minVersion : false;

  return {
    name: browserName,
    version,
    isSupported,
  };
}

export function getBrowserRequirementsMessage(): string {
  return `This application requires one of the following browsers:
  • Chrome 90+
  • Firefox 88+
  • Safari 14+
  • Edge 90+`;
}
