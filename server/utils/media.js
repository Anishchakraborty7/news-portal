function youtubeId(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "");
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
    const match = parsed.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return match ? match[2] : "";
  } catch {
    return "";
  }
}

function youtubeEmbed(url) {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

function imageFor(item) {
  if (item.thumbnail) return item.thumbnail;
  const id = youtubeId(item.youtubeUrl);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return "/assets/placeholder-news.svg";
}

module.exports = { youtubeId, youtubeEmbed, imageFor };
