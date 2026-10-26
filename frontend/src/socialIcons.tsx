import {
  Code2,
  ExternalLink,
  Figma,
  Globe2,
  Github,
  Linkedin,
  MessageCircle,
  Slack,
  Send,
} from "lucide-react";
import type { IconName } from "./types";
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
  Github,
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

export function SocialBrandIcon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const Icon = brandIcons[name];
  return Icon ? <Icon aria-hidden="true" size={size} /> : null;
}
