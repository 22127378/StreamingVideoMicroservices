const { getSignedCookies, getSignedUrl } = require('@aws-sdk/cloudfront-signer');
const { AWS_CONFIG } = require('../../../shared/config/aws');

class CloudFrontService {
  generateSignedCookies(resourcePathPattern, expiresInHours = 6) {
    const { domainName, keyPairId, privateKeyPem } = AWS_CONFIG.cloudfront;
    if (!keyPairId || !privateKeyPem) {
      return { 'CloudFront-Policy': 'simulated', 'CloudFront-Signature': 'simulated', 'CloudFront-Key-Pair-Id': 'simulated', isSimulated: true };
    }
    const domain = domainName.startsWith('http') ? domainName : `https://${domainName}`;
    return getSignedCookies({
      url: resourcePathPattern || `${domain}/hls/vip/*`,
      keyPairId, privateKey: privateKeyPem,
      dateLessThan: new Date(Date.now() + expiresInHours * 3600000).toISOString()
    });
  }

  setSignedCookies(res, cookies) {
    if (!cookies) return;
    Object.keys(cookies).filter(k => k !== 'isSimulated').forEach(name => {
      res.cookie(name, cookies[name], { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none', path: '/hls' });
    });
  }
}

module.exports = new CloudFrontService();
