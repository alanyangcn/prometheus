// Client schemes: sing-box.sagernet.org/clients/general/, nsloon.uk/tutorial/advanced_EN/URL_Schemes_EN.html, github.com/crossutility/Quantumult-X/blob/master/url-scheme.md
export interface SubscriptionLink { id: string; label: string; url: string; importUrl?: string; filename: string }
export function subscriptionLinks(origin: string, token: string, name: string): SubscriptionLink[] {
  const base = `${origin.replace(/\/$/, '')}/sub?token=${encodeURIComponent(token)}`;
  return [['auto', '自适应订阅', ''], ['b64', 'Base64', 'b64'], ['clash', 'Clash', 'clash'], ['sb', 'Sing-box', 'sb'], ['surge', 'Surge', 'surge'], ['loon', 'Loon', 'loon'], ['quanx', 'Quantumult X', 'quanx']].map(([id, label, flag]) => {
    const url = base + (flag ? `&${flag}` : ''); const encoded = encodeURIComponent(url);
    const importUrl = id === 'clash' ? `clash://install-config?url=${encoded}&name=${encodeURIComponent(name)}`
      : id === 'sb' ? `sing-box://import-remote-profile?url=${encoded}#${encodeURIComponent(name)}`
      : id === 'surge' ? `surge:///install-config?url=${encoded}`
      : id === 'loon' ? `loon://import?sub=${encoded}`
      : id === 'quanx' ? `quantumult-x:///update-configuration?remote-resource=${encodeURIComponent(JSON.stringify({ server_remote: [url + ', tag=' + name] }))}`
      : id === 'b64' || id === 'auto' ? `shadowrocket://add/sub://${btoa(url)}#${encodeURIComponent(name)}` : undefined;
    return { id: id!, label: label!, url, importUrl, filename: `subscription-${id}.${id === 'clash' ? 'yaml' : id === 'sb' ? 'json' : 'txt'}` };
  });
}
