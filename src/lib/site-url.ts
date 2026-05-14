export const productionSiteUrl = "https://arthome-ks.com";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL ?? productionSiteUrl;
  const urlWithProtocol = /^https?:\/\//.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return urlWithProtocol.replace(/\/$/, "");
}
