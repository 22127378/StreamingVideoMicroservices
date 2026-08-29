/**
 * CloudFront CDN Signer Service
 * Generates Signed Cookies and Signed URLs for Tier-gated Subscriber Playback.
 */

const { getSignedCookies, getSignedUrl } = require('@aws-sdk/cloudfront-signer');
const { AWS_CONFIG } = require('../config/aws');

class CloudFrontService {
  /**
   * Generates short-lived Signed Cookies for accessing tier-gated video streams.
   * @param {string} resourcePathPattern - e.g. "https://cdn.streamforge.net/hls/vip/*"
   * @param {number} expiresInHours - Validity duration (default: 6 hours)
   * @returns {object|null} Cookies object with CloudFront-Policy, CloudFront-Signature, CloudFront-Key-Pair-Id
   */
  generateSignedCookies(resourcePathPattern, expiresInHours = 6) {
    const { domainName, keyPairId, privateKeyPem } = AWS_CONFIG.cloudfront;

    if (!keyPairId || !privateKeyPem) {
      console.warn('[CloudFront Signer] KeyPairId or PrivateKeyPem not configured. Using development simulation mode.');
      return {
        'CloudFront-Policy': 'simulated-policy',
        'CloudFront-Signature': 'simulated-signature',
        'CloudFront-Key-Pair-Id': 'simulated-key-pair-id',
        isSimulated: true
      };
    }

    const domain = domainName.startsWith('http') ? domainName : `https://${domainName}`;
    const resourceUrl = resourcePathPattern || `${domain}/hls/vip/*`;
    const dateLessThan = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

    const signedCookies = getSignedCookies({
      url: resourceUrl,
      keyPairId: keyPairId,
      privateKey: privateKeyPem,
      dateLessThan: dateLessThan
    });

    return signedCookies;
  }

  /**
   * Sets signed cookies onto an Express Response object.
   */
  setSignedCookies(res, cookies) {
    if (!cookies) return;

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/hls'
    };

    Object.keys(cookies).forEach((cookieName) => {
      if (cookieName !== 'isSimulated') {
        res.cookie(cookieName, cookies[cookieName], cookieOptions);
      }
    });
  }

  /**
   * Generates a signed playback URL for a single resource.
   */
  generateSignedUrl(streamPath, expiresInHours = 4) {
    const { domainName, keyPairId, privateKeyPem } = AWS_CONFIG.cloudfront;
    const domain = domainName.startsWith('http') ? domainName : `https://${domainName || 'cdn.streamforge.net'}`;
    const fullUrl = `${domain}${streamPath.startsWith('/') ? streamPath : `/${streamPath}`}`;

    if (!keyPairId || !privateKeyPem) {
      return fullUrl;
    }

    const dateLessThan = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

    return getSignedUrl({
      url: fullUrl,
      keyPairId: keyPairId,
      privateKey: privateKeyPem,
      dateLessThan: dateLessThan
    });
  }
}

module.exports = new CloudFrontService();
