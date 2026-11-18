import {
  Code2,
  ExternalLink,
  Figma,
  Globe2,
  Linkedin,
  MessageCircle,
  Slack,
  Send,
} from "lucide-react";
import type { IconName } from "./types";
import SiGithub from "@icons-pack/react-simple-icons/icons/SiGithub";
import SiBehance from "@icons-pack/react-simple-icons/icons/SiBehance";
import SiBluesky from "@icons-pack/react-simple-icons/icons/SiBluesky";
import SiBuymeacoffee from "@icons-pack/react-simple-icons/icons/SiBuymeacoffee";
import SiDiscord from "@icons-pack/react-simple-icons/icons/SiDiscord";
import SiDribbble from "@icons-pack/react-simple-icons/icons/SiDribbble";
import SiDevdotto from "@icons-pack/react-simple-icons/icons/SiDevdotto";
import SiFacebook from "@icons-pack/react-simple-icons/icons/SiFacebook";
import SiFlickr from "@icons-pack/react-simple-icons/icons/SiFlickr";
import SiGitlab from "@icons-pack/react-simple-icons/icons/SiGitlab";
import SiHashnode from "@icons-pack/react-simple-icons/icons/SiHashnode";
import SiInstagram from "@icons-pack/react-simple-icons/icons/SiInstagram";
import SiKickstarter from "@icons-pack/react-simple-icons/icons/SiKickstarter";
import SiLine from "@icons-pack/react-simple-icons/icons/SiLine";
import SiLinktree from "@icons-pack/react-simple-icons/icons/SiLinktree";
import SiMastodon from "@icons-pack/react-simple-icons/icons/SiMastodon";
import SiMedium from "@icons-pack/react-simple-icons/icons/SiMedium";
import SiMessenger from "@icons-pack/react-simple-icons/icons/SiMessenger";
import SiPatreon from "@icons-pack/react-simple-icons/icons/SiPatreon";
import SiPinterest from "@icons-pack/react-simple-icons/icons/SiPinterest";
import SiProducthunt from "@icons-pack/react-simple-icons/icons/SiProducthunt";
import SiQuora from "@icons-pack/react-simple-icons/icons/SiQuora";
import SiReddit from "@icons-pack/react-simple-icons/icons/SiReddit";
import SiSnapchat from "@icons-pack/react-simple-icons/icons/SiSnapchat";
import SiSoundcloud from "@icons-pack/react-simple-icons/icons/SiSoundcloud";
import SiSpotify from "@icons-pack/react-simple-icons/icons/SiSpotify";
import SiStackoverflow from "@icons-pack/react-simple-icons/icons/SiStackoverflow";
import SiSubstack from "@icons-pack/react-simple-icons/icons/SiSubstack";
import SiThreads from "@icons-pack/react-simple-icons/icons/SiThreads";
import SiTelegram from "@icons-pack/react-simple-icons/icons/SiTelegram";
import SiTiktok from "@icons-pack/react-simple-icons/icons/SiTiktok";
import SiTumblr from "@icons-pack/react-simple-icons/icons/SiTumblr";
import SiTwitch from "@icons-pack/react-simple-icons/icons/SiTwitch";
import SiVimeo from "@icons-pack/react-simple-icons/icons/SiVimeo";
import SiWeibo from "@icons-pack/react-simple-icons/icons/SiSinaweibo";
import SiWechat from "@icons-pack/react-simple-icons/icons/SiWechat";
import SiWhatsapp from "@icons-pack/react-simple-icons/icons/SiWhatsapp";
import SiWordpress from "@icons-pack/react-simple-icons/icons/SiWordpress";
import SiX from "@icons-pack/react-simple-icons/icons/SiX";
import SiYoutube from "@icons-pack/react-simple-icons/icons/SiYoutube";

export const socialIconOptions: { name: IconName; label: string }[] = [
  { name: "Globe2", label: "Website" },
  { name: "Instagram", label: "Instagram" },
  { name: "Github", label: "GitHub" },
  { name: "Linkedin", label: "LinkedIn" },
  { name: "Facebook", label: "Facebook" },
  { name: "X", label: "X" },
  { name: "Tiktok", label: "TikTok" },
  { name: "Youtube", label: "YouTube" },
  { name: "Threads", label: "Threads" },
  { name: "Discord", label: "Discord" },
  { name: "Whatsapp", label: "WhatsApp" },
  { name: "Telegram", label: "Telegram" },
  { name: "Messenger", label: "Messenger" },
  { name: "Reddit", label: "Reddit" },
  { name: "Pinterest", label: "Pinterest" },
  { name: "Snapchat", label: "Snapchat" },
  { name: "Twitch", label: "Twitch" },
  { name: "Mastodon", label: "Mastodon" },
  { name: "Bluesky", label: "Bluesky" },
  { name: "Wechat", label: "WeChat" },
  { name: "Line", label: "LINE" },
  { name: "Spotify", label: "Spotify" },
  { name: "Soundcloud", label: "SoundCloud" },
  { name: "Medium", label: "Medium" },
  { name: "Devto", label: "DEV Community" },
  { name: "Hashnode", label: "Hashnode" },
  { name: "Stackoverflow", label: "Stack Overflow" },
  { name: "Gitlab", label: "GitLab" },
  { name: "Behance", label: "Behance" },
  { name: "Dribbble", label: "Dribbble" },
  { name: "Flickr", label: "Flickr" },
  { name: "Vimeo", label: "Vimeo" },
  { name: "Tumblr", label: "Tumblr" },
  { name: "Wordpress", label: "WordPress" },
  { name: "Slack", label: "Slack" },
  { name: "Substack", label: "Substack" },
  { name: "Patreon", label: "Patreon" },
  { name: "Linktree", label: "Linktree" },
  { name: "Producthunt", label: "Product Hunt" },
  { name: "Quora", label: "Quora" },
  { name: "Kickstarter", label: "Kickstarter" },
  { name: "Buymeacoffee", label: "Buy Me a Coffee" },
  { name: "Figma", label: "Figma" },
  { name: "Send", label: "Send / Telegram" },
  { name: "MessageCircle", label: "Chat / X" },
  { name: "Code2", label: "Code profile" },
  { name: "ExternalLink", label: "Portfolio link" },
  { name: "Weibo", label: "Weibo" },
];

export function socialIconForUrl(value: string): IconName | null {
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const matchesDomain = (domain: string) =>
      hostname === domain || hostname.endsWith(`.${domain}`);
    if (matchesDomain("instagram.com")) return "Instagram";
    if (matchesDomain("github.com")) return "Github";
    if (matchesDomain("linkedin.com")) return "Linkedin";
    if (matchesDomain("facebook.com") || matchesDomain("fb.com")) return "Facebook";
    if (matchesDomain("x.com") || matchesDomain("twitter.com")) return "X";
    const socialDomains: [string, IconName][] = [
      ["tiktok.com", "Tiktok"], ["youtube.com", "Youtube"], ["youtu.be", "Youtube"],
      ["threads.net", "Threads"], ["discord.com", "Discord"], ["discord.gg", "Discord"],
      ["whatsapp.com", "Whatsapp"], ["wa.me", "Whatsapp"], ["telegram.org", "Telegram"],
      ["t.me", "Telegram"], ["messenger.com", "Messenger"], ["reddit.com", "Reddit"],
      ["pinterest.com", "Pinterest"], ["snapchat.com", "Snapchat"], ["twitch.tv", "Twitch"],
      ["mastodon.social", "Mastodon"], ["bsky.app", "Bluesky"], ["wechat.com", "Wechat"],
      ["line.me", "Line"], ["spotify.com", "Spotify"], ["soundcloud.com", "Soundcloud"],
      ["medium.com", "Medium"], ["dev.to", "Devto"], ["hashnode.dev", "Hashnode"],
      ["stackoverflow.com", "Stackoverflow"], ["gitlab.com", "Gitlab"],
      ["behance.net", "Behance"], ["dribbble.com", "Dribbble"], ["flickr.com", "Flickr"],
      ["vimeo.com", "Vimeo"], ["tumblr.com", "Tumblr"], ["wordpress.com", "Wordpress"],
      ["slack.com", "Slack"], ["substack.com", "Substack"], ["patreon.com", "Patreon"],
      ["linktr.ee", "Linktree"], ["producthunt.com", "Producthunt"], ["quora.com", "Quora"],
      ["kickstarter.com", "Kickstarter"], ["buymeacoffee.com", "Buymeacoffee"],
      ["weibo.com", "Weibo"],
    ];
    return socialDomains.find(([domain]) => matchesDomain(domain))?.[1] ?? null;
  } catch {
    return null;
  }
}

const brandIcons: Partial<Record<IconName, typeof SiInstagram>> = {
  Behance: SiBehance,
  Bluesky: SiBluesky,
  Buymeacoffee: SiBuymeacoffee,
  Code2,
  Discord: SiDiscord,
  Devto: SiDevdotto,
  Dribbble: SiDribbble,
  Facebook: SiFacebook,
  ExternalLink,
  Figma,
  Flickr: SiFlickr,
  Gitlab: SiGitlab,
  Github: SiGithub,
  Globe2,
  Hashnode: SiHashnode,
  Instagram: SiInstagram,
  Kickstarter: SiKickstarter,
  Line: SiLine,
  Linktree: SiLinktree,
  Linkedin,
  Mastodon: SiMastodon,
  Medium: SiMedium,
  Messenger: SiMessenger,
  MessageCircle,
  Patreon: SiPatreon,
  Pinterest: SiPinterest,
  Producthunt: SiProducthunt,
  Quora: SiQuora,
  Reddit: SiReddit,
  Slack,
  Snapchat: SiSnapchat,
  Soundcloud: SiSoundcloud,
  Spotify: SiSpotify,
  Stackoverflow: SiStackoverflow,
  Substack: SiSubstack,
  Threads: SiThreads,
  Telegram: SiTelegram,
  Tiktok: SiTiktok,
  Tumblr: SiTumblr,
  Twitch: SiTwitch,
  Vimeo: SiVimeo,
  Weibo: SiWeibo,
  Wechat: SiWechat,
  Whatsapp: SiWhatsapp,
  Wordpress: SiWordpress,
  Send,
  X: SiX,
  Youtube: SiYoutube,
};

const socialBrandColors: Partial<Record<IconName, string>> = {
  Behance: "#1769FF",
  Bluesky: "#0085FF",
  Buymeacoffee: "#FFDD00",
  Discord: "#5865F2",
  Devto: "#0A0A0A",
  Dribbble: "#EA4C89",
  Facebook: "#0866FF",
  Figma: "#F24E1E",
  Flickr: "#0063DC",
  Gitlab: "#FC6D26",
  Github: "#181717",
  Hashnode: "#2962FF",
  Instagram: "#FFFFFF",
  Kickstarter: "#05CE78",
  Line: "#06C755",
  Linktree: "#43E55E",
  Linkedin: "#0A66C2",
  Mastodon: "#6364FF",
  Medium: "#000000",
  Messenger: "#0866FF",
  Patreon: "#FF424D",
  Pinterest: "#E60023",
  Producthunt: "#DA552F",
  Quora: "#B92B27",
  Reddit: "#FF4500",
  Slack: "#611F69",
  Snapchat: "#111111",
  Soundcloud: "#FF5500",
  Spotify: "#1DB954",
  Stackoverflow: "#F48024",
  Substack: "#FF6719",
  Threads: "#101010",
  Telegram: "#26A5E4",
  Tiktok: "#FFFFFF",
  Tumblr: "#35465C",
  Twitch: "#9146FF",
  Vimeo: "#1AB7EA",
  Weibo: "#E6162D",
  Wechat: "#07C160",
  Whatsapp: "#25D366",
  Wordpress: "#21759B",
  X: "#000000",
  Youtube: "#FF0033",
};

export function socialBrandColor(name: IconName): string {
  return socialBrandColors[name] ?? "#6B716D";
}

export function SocialBrandIcon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const Icon = brandIcons[name];
  return Icon ? <Icon aria-hidden="true" color={socialBrandColor(name)} size={size} /> : null;
}
