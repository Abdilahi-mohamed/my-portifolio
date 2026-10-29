import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Award,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MapPin,
  MoveDown,
  MoveUp,
  Plus,
  Replace,
  Search,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { IconName, PortfolioContent } from "../types";
import { SocialBrandIcon, socialIconOptions } from "../socialIcons";
import { isProgrammingLanguageIcon, ProgrammingLanguageIcon, programmingIconOptions } from "../programmingIcons";
import { adminLogout, loadAdminPortfolio, saveAdminPortfolio, uploadImage } from "./adminApi";

type Project = PortfolioContent["projectsSection"]["projects"][number];
type Skill = PortfolioContent["skillsSection"]["skills"][number];
type Experience = PortfolioContent["experience"][number];
type Certificate = PortfolioContent["certificates"][number];
type EditorKind = "project" | "skill" | "experience" | "certificate";
type EditorState = { kind: EditorKind; index: number | null };
type Activity = { id: number; label: string; time: string };
type GalleryItem = { url: string; file?: File };
const skillGroups = ["Frontend", "Backend", "Databases", "Tools"] as const;
const builtInSections = [
  { id: "about", label: "About", title: "About me" },
  { id: "home", label: "Home", title: "Welcome" },
  { id: "projects", label: "Projects", title: "Projects" },
  { id: "languages", label: "Tech stack", title: "Skills" },
  { id: "contacts", label: "Social profiles", title: "Social profiles" },
] as const;
function socialIconForUrl(value: string): IconName {
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "Globe2";
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
    const platform = socialDomains.find(([domain]) => matchesDomain(domain));
    if (platform) return platform[1];
  } catch {
    return "Globe2";
  }
  return "Globe2";
}

const portfolioSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "PortfolioCMSManifest",
  type: "object",
  properties: {
    navigation: { type: "array", items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" } }, required: ["id", "label"] } },
    customSections: { type: "array", items: { type: "object" } },
    hero: { type: "object", properties: { brand: { type: "string" }, badge: { type: "string" }, title: { type: "string" }, titleAccent: { type: "string" }, description: { type: "string" }, stats: { type: "array" } }, required: ["brand", "title", "description"] },
    about: { type: "object", properties: { profileName: { type: "string" }, profileRole: { type: "string" }, location: { type: "string" }, bio: { type: "string" }, photo: { type: "string", format: "uri" }, coverPhoto: { type: "string" }, coverPhotoZoom: { type: "number", minimum: 1, maximum: 3 }, coverPhotoX: { type: "number", minimum: 0, maximum: 100 }, coverPhotoY: { type: "number", minimum: 0, maximum: 100 } }, required: ["profileName", "profileRole", "location", "bio"] },
    projectsSection: { type: "object", properties: { label: { type: "string" }, title: { type: "string" }, description: { type: "string" }, projects: { type: "array", items: { type: "object", properties: { category: { type: "string" }, title: { type: "string" }, description: { type: "string" }, image: { type: "string" }, tags: { type: "array", items: { type: "string" } }, liveUrl: { type: "string" }, githubUrl: { type: "string" } }, required: ["category", "title", "description"] } } }, required: ["projects"] },
    skillsSection: { type: "object", properties: { label: { type: "string" }, title: { type: "string" }, description: { type: "string" }, skills: { type: "array", items: { type: "object", properties: { name: { type: "string" }, level: { type: "string", pattern: "^(100|[1-9]?\\d)%$" }, icon: { type: "string" }, color: { type: "string", pattern: "^#[\\da-fA-F]{6}$" }, category: { type: "string" } }, required: ["name", "level", "icon", "color"] } } }, required: ["skills"] },
    experience: { type: "array", items: { type: "object", properties: { role: { type: "string" }, company: { type: "string" }, desc: { type: "string" }, year: { type: "string" }, location: { type: "string" }, image: { type: "string" } }, required: ["role", "desc", "year"] } },
    certificates: { type: "array", items: { type: "object", properties: { title: { type: "string" }, issuer: { type: "string" }, year: { type: "string" }, description: { type: "string" }, image: { type: "string" } }, required: ["title", "issuer", "year", "description", "image"] } },
    contact: { type: "object", properties: { email: { type: "string", format: "email" }, location: { type: "string" }, availabilityTitle: { type: "string" }, availabilityDescription: { type: "string" } } },
    footer: { type: "object", properties: { copyright: { type: "string" } } },
  },
  required: ["hero", "about", "projectsSection", "skillsSection", "experience", "certificates"],
};

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function makeDraft(kind: EditorKind, item?: Project | Skill | Experience | Certificate): Record<string, string> {
  if (kind === "project") {
    const project = item as Project | undefined;
    return {
      title: project?.title ?? "",
      id: project?.id ?? "",
      category: project?.category ?? "Fullstack",
      description: project?.description ?? "",
      fullDescription: project?.fullDescription ?? project?.description ?? "",
      image: project?.image ?? "",
      linkedinUrl: project?.linkedinUrl ?? "",
      liveUrl: project?.liveUrl ?? "",
      githubUrl: project?.githubUrl ?? "",
      tags: project?.tags.join(", ") ?? "",
      featured: String(project?.featured ?? false),
      visible: String(project?.visible ?? true),
    };
  }
  if (kind === "skill") {
    const skill = item as Skill | undefined;
    return {
      name: skill?.name ?? "",
      level: skill?.level.replace("%", "") ?? "85",
      category: skill?.category ?? "Frontend",
      color: skill?.color ?? "#2563eb",
      icon: skill?.icon ?? "Code2",
    };
  }
  if (kind === "certificate") {
    const certificate = item as Certificate | undefined;
    return {
      title: certificate?.title ?? "",
      issuer: certificate?.issuer ?? "",
      year: certificate?.year ?? "",
      description: certificate?.description ?? "",
      image: certificate?.image ?? "",
    };
  }
  const experience = item as Experience | undefined;
  return {
    role: experience?.role ?? "",
    company: experience?.company ?? "",
    year: experience?.year ?? "",
    location: experience?.location ?? "",
    desc: experience?.desc ?? "",
    image: experience?.image ?? "",
  };
}

export function AdminDashboard({
  authDisabled,
  onSignedOut,
  onUnauthorized,
}: {
  authDisabled: boolean;
  onSignedOut: () => void;
  onUnauthorized: () => void;
}) {
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [loadingError, setLoadingError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(true);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [skillFilter, setSkillFilter] = useState("All");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [certificateImage, setCertificateImage] = useState<GalleryItem | null>(null);
  const [experienceImage, setExperienceImage] = useState<GalleryItem | null>(null);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [skillIconPickerOpen, setSkillIconPickerOpen] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([]);
  const coverDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    zoom: number;
  } | null>(null);

  useEffect(() => {
    loadAdminPortfolio()
      .then((portfolio) => setContent({
        ...portfolio,
        navigation: portfolio.navigation.map((item) =>
          item.id === "contacts" ? { ...item, label: "Social profiles" } : item,
        ),
      }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not load portfolio.";
        setLoadingError(message);
        if (message.toLowerCase().includes("sign in")) onUnauthorized();
      });
  }, [onUnauthorized]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (iconPickerIndex === null && !skillIconPickerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIconPickerIndex(null);
        setSkillIconPickerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [iconPickerIndex, skillIconPickerOpen]);

  const projects = content?.projectsSection.projects ?? [];
  const skills = content?.skillsSection.skills ?? [];
  const experiences = content?.experience ?? [];
  const certificates = content?.certificates ?? [];
  const categories = useMemo(
    () => ["All", ...new Set(projects.map((project) => project.category))],
    [projects],
  );
  const skillCategories = ["All", ...skillGroups];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProjects = projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) =>
      (projectFilter === "All" || project.category === projectFilter) &&
      (!normalizedQuery || [project.title, project.description, project.category, ...project.tags]
        .some((value) => value.toLowerCase().includes(normalizedQuery))),
    );
  const visibleSkills = skills
    .map((skill, index) => ({ skill, index }))
    .filter(({ skill }) =>
      (skillFilter === "All" || (skill.category ?? "Other") === skillFilter) &&
      (!normalizedQuery || [skill.name, skill.category ?? "", skill.level]
        .some((value) => value.toLowerCase().includes(normalizedQuery))),
    );

  const updateContent = (updater: (current: PortfolioContent) => PortfolioContent) => {
    setContent((current) => current ? updater(current) : current);
    setSaved(false);
  };

  const updateCoverAdjustment = (
    field: "coverPhotoZoom" | "coverPhotoX" | "coverPhotoY",
    value: number,
  ) => {
    updateContent((current) => ({
      ...current,
      about: { ...current.about, [field]: value },
    }));
  };

  const updateSectionLabel = (id: string, label: string) => {
    updateContent((current) => ({
      ...current,
      navigation: current.navigation.map((item) => item.id === id ? { ...item, label } : item),
      customSections: current.customSections.map((section) => section.id === id ? { ...section, label } : section),
    }));
  };

  const updateSectionText = (id: string, field: "title" | "description", value: string) => {
    updateContent((current) => {
      if (id.startsWith("custom-")) {
        return {
          ...current,
          customSections: current.customSections.map((section) =>
            section.id === id ? { ...section, [field]: value } : section,
          ),
        };
      }
      if (field === "title") {
        if (id === "about") return { ...current, about: { ...current.about, title: value } };
        if (id === "home") return { ...current, hero: { ...current.hero, title: value } };
        if (id === "projects") return { ...current, projectsSection: { ...current.projectsSection, title: value } };
        if (id === "languages") return { ...current, skillsSection: { ...current.skillsSection, title: value } };
        return { ...current, contact: { ...current.contact, socialTitle: value } };
      }
      if (id === "home") return { ...current, hero: { ...current.hero, description: value } };
      if (id === "projects") return { ...current, projectsSection: { ...current.projectsSection, description: value } };
      if (id === "languages") return { ...current, skillsSection: { ...current.skillsSection, description: value } };
      return { ...current, contact: { ...current.contact, description: value } };
    });
  };

  const toggleSection = (id: string, label: string) => {
    updateContent((current) => current.navigation.some((item) => item.id === id)
      ? { ...current, navigation: current.navigation.filter((item) => item.id !== id) }
      : { ...current, navigation: [...current.navigation, { id, label }] });
  };

  const moveSection = (id: string, direction: -1 | 1) => {
    updateContent((current) => {
      const index = current.navigation.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.navigation.length) return current;
      if ((id === "home" && direction < 0 && current.navigation[target].id === "about") ||
        (id === "about" && direction > 0 && current.navigation[target].id === "home")) return current;
      const navigation = [...current.navigation];
      [navigation[index], navigation[target]] = [navigation[target], navigation[index]];
      return { ...current, navigation };
    });
  };

  const addCustomSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content) return;
    const label = newSectionLabel.trim();
    const title = newSectionTitle.trim();
    if (content.customSections.length >= 20) {
      setNotice("A portfolio can contain up to 20 custom sections.");
      return;
    }
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "section";
    let id = `custom-${slug}`;
    let suffix = 2;
    while (content.customSections.some((section) => section.id === id)) id = `custom-${slug}-${suffix++}`;
    const section = { id, label, title, description: newSectionDescription.trim(), tinted: false, cards: [] };
    updateContent((current) => ({
      ...current,
      customSections: [...current.customSections, section],
      navigation: [...current.navigation, { id, label }],
    }));
    setNewSectionLabel("");
    setNewSectionTitle("");
    setNewSectionDescription("");
    setNotice("Section added. Add its content in the section editor and save to publish.");
  };

  const removeCustomSection = (id: string) => {
    if (!window.confirm("Delete this section and its cards?")) return;
    updateContent((current) => ({
      ...current,
      customSections: current.customSections.filter((section) => section.id !== id),
      navigation: current.navigation.filter((item) => item.id !== id),
    }));
  };

  const updateCustomCard = (
    sectionId: string,
    cardIndex: number,
    field: "title" | "description" | "image" | "link" | "tags",
    value: string,
  ) => {
    updateContent((current) => ({
      ...current,
      customSections: current.customSections.map((section) => section.id === sectionId
        ? {
          ...section,
          cards: section.cards.map((card, index) => index === cardIndex
            ? { ...card, [field]: field === "tags" ? value.split(",").map((tag) => tag.trim()).filter(Boolean) : value }
            : card),
        }
        : section),
    }));
  };

  const addCustomCard = (sectionId: string) => {
    updateContent((current) => ({
      ...current,
      customSections: current.customSections.map((section) => section.id === sectionId
        ? { ...section, cards: section.cards.length >= 30 ? section.cards : [...section.cards, { title: "", description: "", image: "", tags: [], link: "" }] }
        : section),
    }));
  };

  const removeCustomCard = (sectionId: string, cardIndex: number) => {
    updateContent((current) => ({
      ...current,
      customSections: current.customSections.map((section) => section.id === sectionId
        ? { ...section, cards: section.cards.filter((_, index) => index !== cardIndex) }
        : section),
    }));
  };

  const save = async () => {
    if (!content || busy) return;
    const incompleteSocial = content.contact.socials.find((social) => {
      if (!social.name.trim()) return true;
      try {
        const url = new URL(social.url);
        return url.protocol !== "https:" && url.protocol !== "http:";
      } catch {
        return true;
      }
    });
    if (incompleteSocial) {
      setNotice("Add a name and a valid HTTP or HTTPS URL for every social profile before saving.");
      return;
    }
    setBusy(true);
    try {
      const message = await saveAdminPortfolio(content);
      setSaved(true);
      setNotice(message);
      setActivity((items) => [{ id: Date.now(), label: "Portfolio changes published", time: "Just now" }, ...items].slice(0, 5));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save changes.";
      setNotice(message);
      if (message.toLowerCase().includes("sign in")) onUnauthorized();
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (kind: EditorKind, index: number | null = null) => {
    const item = index === null
      ? undefined
      : kind === "project" ? projects[index]
        : kind === "skill" ? skills[index]
          : kind === "certificate" ? certificates[index]
            : experiences[index];
    setDraft(makeDraft(kind, item));
    setGalleryItems(kind === "project" && item && "gallery" in item
      ? item.gallery.map((url) => ({ url }))
      : []);
    setCertificateImage(kind === "certificate" && item && "image" in item && item.image
      ? { url: item.image }
      : null);
    setExperienceImage(kind === "experience" && item && "image" in item && item.image
      ? { url: item.image }
      : null);
    setEditor({ kind, index });
  };

  const closeEditor = () => {
    galleryItems.forEach((item) => {
      if (item.file) URL.revokeObjectURL(item.url);
    });
    if (certificateImage?.file) URL.revokeObjectURL(certificateImage.url);
    if (experienceImage?.file) URL.revokeObjectURL(experienceImage.url);
    setCertificateImage(null);
    setExperienceImage(null);
    setGalleryItems([]);
    setEditor(null);
  };

  const submitEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const { kind, index } = editor;
    if (kind === "project") {
      if (index === null && !galleryItems.some((item) => item.file)) {
        setNotice("Upload a project image from your device before adding the project.");
        return;
      }
      if (!draft.image.trim() && galleryItems.length === 0) {
        setNotice("Upload a project image and choose it as the thumbnail.");
        return;
      }
      setBusy(true);
      try {
      const uploadedItems = await Promise.all(galleryItems.map(async (item) => ({
        oldUrl: item.url,
        url: item.file ? await uploadImage(item.file) : item.url,
      })));
      const uploadedUrls = new Map(uploadedItems.map((item) => [item.oldUrl, item.url]));
      const project: Project = {
        id: draft.id || `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "project"}-${crypto.randomUUID().slice(0, 8)}`,
        title: draft.title.trim(),
        category: draft.category.trim() || "Fullstack",
        description: draft.description.trim(),
        fullDescription: draft.fullDescription.trim(),
        image: uploadedUrls.get(draft.image) ?? draft.image.trim(),
        gallery: uploadedItems.map((item) => item.url),
        liveUrl: draft.liveUrl.trim(),
        githubUrl: draft.githubUrl.trim(),
        linkedinUrl: draft.linkedinUrl.trim(),
        featured: draft.featured === "true",
        visible: draft.visible === "true",
        tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      };
      updateContent((current) => {
        const next = [...current.projectsSection.projects];
        if (index === null) next.unshift(project);
        else next[index] = project;
        return { ...current, projectsSection: { ...current.projectsSection, projects: next } };
      });
      setActivity((items) => [{ id: Date.now(), label: `${index === null ? "Added" : "Updated"} project`, time: "Just now" }, ...items].slice(0, 5));
      setNotice("Project updated. Save changes to publish it.");
      closeEditor();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Project images could not be uploaded.");
      } finally {
        setBusy(false);
      }
      return;
    } else if (kind === "skill") {
      const skill: Skill = {
        name: draft.name.trim(),
        level: `${Math.min(100, Math.max(0, Number(draft.level) || 0))}%`,
        category: skillGroups.includes(draft.category as typeof skillGroups[number]) ? draft.category : "Frontend",
        color: /^#[\da-fA-F]{6}$/.test(draft.color) ? draft.color : "#2563eb",
        icon: programmingIconOptions.find((option) => option.name === draft.icon)?.name ?? "Code2",
      };
      updateContent((current) => {
        const next = [...current.skillsSection.skills];
        if (index === null) next.push(skill);
        else next[index] = skill;
        return { ...current, skillsSection: { ...current.skillsSection, skills: next } };
      });
    } else if (kind === "certificate") {
      setBusy(true);
      try {
        const image = certificateImage?.file
          ? await uploadImage(certificateImage.file)
          : draft.image.trim();
        const certificate: Certificate = {
          title: draft.title.trim(),
          issuer: draft.issuer.trim(),
          year: draft.year.trim(),
          description: draft.description.trim(),
          image,
        };
        updateContent((current) => {
          const next = [...current.certificates];
          if (index === null) next.unshift(certificate);
          else next[index] = certificate;
          return { ...current, certificates: next };
        });
        const label = index === null ? "Added" : "Updated";
        setActivity((items) => [{ id: Date.now(), label: `${label} certificate`, time: "Just now" }, ...items].slice(0, 5));
        setNotice(`${label} certificate. Save to publish your changes.`);
        closeEditor();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "The certificate image could not be uploaded.");
      } finally {
        setBusy(false);
      }
      return;
    } else {
      setBusy(true);
      try {
        const image = experienceImage?.file
          ? await uploadImage(experienceImage.file)
          : draft.image.trim();
        const experience: Experience = {
          role: draft.role.trim(),
          company: draft.company.trim(),
          year: draft.year.trim(),
          location: draft.location.trim(),
          desc: draft.desc.trim(),
          image,
        };
        updateContent((current) => {
          const next = [...current.experience];
          if (index === null) next.unshift(experience);
          else next[index] = experience;
          return { ...current, experience: next };
        });
        const label = index === null ? "Added" : "Updated";
        setActivity((items) => [{ id: Date.now(), label: `${label} experience`, time: "Just now" }, ...items].slice(0, 5));
        setNotice(`${label} experience. Save to publish your changes.`);
        closeEditor();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "The workplace image could not be uploaded.");
      } finally {
        setBusy(false);
      }
      return;
    }
    const label = index === null ? "Added" : "Updated";
    setActivity((items) => [{ id: Date.now(), label: `${label} ${kind}`, time: "Just now" }, ...items].slice(0, 5));
    setNotice(`${label} ${kind}. Save to publish your changes.`);
    setEditor(null);
  };

  const addGalleryFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files);
    const invalid = accepted.find((file) =>
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) ||
      file.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setNotice(`${invalid.name}: choose PNG, JPEG, WebP, or GIF files up to 8 MB.`);
      return;
    }
    if (galleryItems.length + accepted.length > 30) {
      setNotice("A project can contain up to 30 gallery images.");
      return;
    }
    const newItems = accepted.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setGalleryItems((items) => [...items, ...newItems]);
    if (newItems[0]) {
      setDraft((current) => ({ ...current, image: current.image || newItems[0].url }));
    }
  };

  const replaceGalleryItem = (index: number, file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setNotice("Choose a PNG, JPEG, WebP, or GIF image up to 8 MB.");
      return;
    }
    const replacement = { file, url: URL.createObjectURL(file) };
    const previous = galleryItems[index];
    if (previous?.file) URL.revokeObjectURL(previous.url);
    setGalleryItems((items) => items.map((item, itemIndex) =>
      itemIndex === index ? replacement : item,
    ));
    if (draft.image === previous?.url) {
      setDraft((current) => ({ ...current, image: replacement.url }));
    }
  };

  const addCertificateImage = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setNotice("Choose a PNG, JPEG, WebP, or GIF certificate image up to 8 MB.");
      return;
    }
    if (certificateImage?.file) URL.revokeObjectURL(certificateImage.url);
    const image = { file, url: URL.createObjectURL(file) };
    setCertificateImage(image);
    setDraft((current) => ({ ...current, image: image.url }));
  };

  const addExperienceImage = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setNotice("Choose a PNG, JPEG, WebP, or GIF workplace image up to 8 MB.");
      return;
    }
    if (experienceImage?.file) URL.revokeObjectURL(experienceImage.url);
    const image = { file, url: URL.createObjectURL(file) };
    setExperienceImage(image);
    setDraft((current) => ({ ...current, image: image.url }));
  };

  const removeGalleryItem = (index: number) => {
    const removed = galleryItems[index];
    if (removed?.file) URL.revokeObjectURL(removed.url);
    const remaining = galleryItems.filter((_, itemIndex) => itemIndex !== index);
    setGalleryItems(remaining);
    if (draft.image === removed?.url) {
      setDraft((current) => ({ ...current, image: remaining[0]?.url ?? "" }));
    }
  };

  const moveGalleryItem = (index: number, direction: -1 | 1) => {
    setGalleryItems((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const uploadProfileImage = async (field: "photo" | "coverPhoto", file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setNotice("Choose a PNG, JPEG, WebP, or GIF image up to 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const image = await uploadImage(file);
      updateContent((current) => ({
        ...current,
        about: {
          ...current.about,
          [field]: image,
          ...(field === "coverPhoto" ? { coverPhotoZoom: 1, coverPhotoX: 50, coverPhotoY: 50 } : {}),
        },
      }));
      setNotice(`${field === "photo" ? "Profile picture" : "Cover photo"} uploaded. Save changes to publish it.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The profile image could not be uploaded.");
    } finally {
      setBusy(false);
    }
  };

  const updateContact = <K extends keyof PortfolioContent["contact"]>(
    key: K,
    value: PortfolioContent["contact"][K],
  ) => {
    updateContent((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value },
    }));
  };

  const updateSocial = (
    index: number,
    key: "name" | "url" | "icon",
    value: PortfolioContent["contact"]["socials"][number][typeof key],
  ) => {
    updateContent((current) => ({
      ...current,
      contact: {
        ...current.contact,
        socials: current.contact.socials.map((social, socialIndex) =>
          socialIndex === index
            ? key === "url" && typeof value === "string"
              ? { ...social, url: value, icon: socialIconForUrl(value) }
              : { ...social, [key]: value }
            : social,
        ),
      },
    }));
  };

  const removeSocial = (index: number) => {
    updateContent((current) => ({
      ...current,
      contact: { ...current.contact, socials: current.contact.socials.filter((_, socialIndex) => socialIndex !== index) },
    }));
  };

  const addSocial = () => {
    if (content && content.contact.socials.length >= 30) {
      setNotice("A maximum of 30 social links is supported.");
      return;
    }
    updateContent((current) => ({
      ...current,
      contact: {
        ...current.contact,
        socials: [...current.contact.socials, { name: "Website", url: "", icon: "Globe2" }],
      },
    }));
  };

  const removeItem = (kind: EditorKind, index: number) => {
    if (!window.confirm(`Delete this ${kind}?`)) return;
    updateContent((current) => {
      if (kind === "project") return { ...current, projectsSection: { ...current.projectsSection, projects: current.projectsSection.projects.filter((_, itemIndex) => itemIndex !== index) } };
      if (kind === "skill") return { ...current, skillsSection: { ...current.skillsSection, skills: current.skillsSection.skills.filter((_, itemIndex) => itemIndex !== index) } };
      if (kind === "certificate") return { ...current, certificates: current.certificates.filter((_, itemIndex) => itemIndex !== index) };
      return { ...current, experience: current.experience.filter((_, itemIndex) => itemIndex !== index) };
    });
    setActivity((items) => [{ id: Date.now(), label: `Removed ${kind}`, time: "Just now" }, ...items].slice(0, 5));
    setNotice(`Removed ${kind}. Save to publish your changes.`);
  };

  const signOut = async () => {
    await adminLogout();
    onSignedOut();
  };

  if (!content) {
    return <main className="cms-loading">{loadingError || "Loading admin workspace..."}</main>;
  }

  const editorTitle = editor ? `${editor.index === null ? "Add" : "Edit"} ${editor.kind}` : "";
  const coverZoom = content.about.coverPhotoZoom ?? 1;
  const coverPositionX = content.about.coverPhotoX ?? 50;
  const coverPositionY = content.about.coverPhotoY ?? 50;
  const sectionRows = [
    ...builtInSections.map(({ id, label }) => {
      const navigationItem = content.navigation.find((item) => item.id === id);
      const custom = content.customSections.find((section) => section.id === id);
      const sectionTitle = id === "about" ? content.about.title
        : id === "home" ? content.hero.title
          : id === "projects" ? content.projectsSection.title
            : id === "languages" ? content.skillsSection.title
              : content.contact.socialTitle;
      const description = id === "home" ? content.hero.description
        : id === "projects" ? content.projectsSection.description
          : id === "languages" ? content.skillsSection.description
            : id === "contacts" ? content.contact.description
              : "";
      return { id, label: navigationItem?.label ?? custom?.label ?? label, title: sectionTitle, description, enabled: Boolean(navigationItem), customSection: custom };
    }),
    ...content.customSections.filter((section) => !builtInSections.some((builtIn) => builtIn.id === section.id))
      .map((section) => ({ id: section.id, label: section.label, title: section.title, description: section.description, enabled: content.navigation.some((item) => item.id === section.id), customSection: section })),
  ];

  return (
    <div className="cms-app">
      <header className="cms-global-nav">
        <a className="cms-brand" href="#dashboard" aria-label="Portfolio CMS home">
          <span className="cms-brand-mark"><Sparkles size={17} /></span>
          <span><strong>Studio / CMS</strong><small>PORTFOLIO WORKSPACE</small></span>
        </a>
        <nav className="cms-nav" aria-label="Admin sections">
          <a href="#profile-picture"><UserRound size={16} /> Profile & cover</a>
          <a href="#configuration"><Settings2 size={16} /> Profile details</a>
          <a href="#manifest"><FolderKanban size={16} /> Projects <span>{projects.length}</span></a>
          <a href="#skills"><Code2 size={16} /> Skills <span>{skills.length}</span></a>
          <a href="#certificates"><Award size={16} /> Certificates <span>{certificates.length}</span></a>
          <a href="#experience"><BriefcaseBusiness size={16} /> Experience</a>
          <a href="#contact-editor"><ExternalLink size={16} /> Social profiles</a>
          <a href="#sections"><LayoutDashboard size={16} /> Sections</a>
        </nav>
        <div className="cms-global-actions">
          <a className="cms-top-site-link" href="/"><ExternalLink size={15} /> View portfolio</a>
          {!authDisabled && <button aria-label="Sign out" className="cms-icon-button" onClick={signOut} title="Sign out" type="button"><LogOut size={16} /></button>}
        </div>
      </header>

      <main className="cms-main" id="dashboard">
        <header className="cms-topbar">
          <label className="cms-search"><Search size={17} /><input aria-label="Search projects and skills" onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, skills..." value={query} />{query && <button aria-label="Clear search" onClick={() => setQuery("")} type="button"><X size={14} /></button>}<kbd>⌘ K</kbd></label>
          <div className="cms-top-actions">
            <span className={`cms-sync ${saved ? "is-saved" : "is-unsaved"}`}><i />{saved ? "All changes saved" : "Unsaved changes"}</span>
            <button className="cms-icon-button cms-help" aria-label="Help" title="Portfolio CMS" type="button"><CircleHelp size={17} /></button>
            <button className="cms-outline-btn" onClick={() => downloadJson("portfolio-manifest.json", content)} type="button"><ArrowDownToLine size={15} /> Export JSON</button>
            <button className="cms-save-btn" disabled={saved || busy} onClick={save} type="button">{busy ? "Saving..." : saved ? <><Check size={15} /> Saved</> : "Save changes"}</button>
          </div>
        </header>

        <div className="cms-content">
          <section className="cms-welcome">
            <div>
              <div className="cms-eyebrow"><span /> CONTENT CONTROL CENTER</div>
              <h1>Good to see you, {content.about.profileName.split(" ")[0]}<span>.</span></h1>
              <p>Shape your portfolio, keep your story current, and publish when it feels right.</p>
            </div>
            <div className="cms-welcome-actions">
              <button className="cms-quiet-btn" onClick={() => downloadJson("portfolio-schema.json", portfolioSchema)} type="button"><FileJson2 size={16} /> Export schema</button>
              <button className="cms-primary-btn" onClick={() => openEditor("project")} type="button"><Plus size={16} /> New project</button>
            </div>
          </section>

          <div className="cms-dashboard-grid">
            <div className="cms-primary-column">
              <section className="cms-panel" id="manifest">
                <div className="cms-panel-heading">
                  <div><span className="cms-section-index">01 / MANIFEST</span><h2>Selected work</h2><p>Your published projects and case studies.</p></div>
                  <button className="cms-add-link" onClick={() => openEditor("project")} type="button"><Plus size={15} /> Add project</button>
                </div>
                <div className="cms-tabs" role="tablist" aria-label="Project categories">{categories.map((category) => <button aria-selected={projectFilter === category} className={projectFilter === category ? "is-active" : ""} key={category} onClick={() => setProjectFilter(category)} role="tab" type="button">{category}</button>)}</div>
                {visibleProjects.length ? <div className="cms-project-grid">{visibleProjects.map(({ project, index }) => <article className={`cms-project-card${project.visible ? "" : " is-hidden"}`} key={`${project.id}-${index}`}>
                  <div className="cms-project-image">{project.image ? <img alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} src={project.image} /> : <div className="cms-image-placeholder"><Code2 size={25} /></div>}<span className="cms-project-category">{project.category}</span>{project.featured && <span className="cms-featured-badge"><Star size={11} /> Featured</span>}<div className="cms-card-actions"><button aria-label={`Move ${project.title} up`} disabled={index === 0} onClick={() => updateContent((current) => { const next = [...current.projectsSection.projects]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return { ...current, projectsSection: { ...current.projectsSection, projects: next } }; })} title="Move up" type="button"><MoveUp size={14} /></button><button aria-label={`Move ${project.title} down`} disabled={index === projects.length - 1} onClick={() => updateContent((current) => { const next = [...current.projectsSection.projects]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return { ...current, projectsSection: { ...current.projectsSection, projects: next } }; })} title="Move down" type="button"><MoveDown size={14} /></button><button aria-label={`Edit ${project.title}`} onClick={() => openEditor("project", index)} title="Edit project" type="button"><Settings2 size={14} /></button><button aria-label={`Duplicate ${project.title}`} onClick={() => { updateContent((current) => { const next = [...current.projectsSection.projects]; next.splice(index + 1, 0, { ...project, id: `${project.id}-${crypto.randomUUID().slice(0, 6)}`, title: `${project.title} (Copy)` }); return { ...current, projectsSection: { ...current.projectsSection, projects: next } }; }); setNotice("Project duplicated. Save to publish your changes."); }} title="Duplicate project" type="button"><Plus size={14} /></button><button aria-label={`${project.visible ? "Unpublish" : "Publish"} ${project.title}`} onClick={() => updateContent((current) => { const next = [...current.projectsSection.projects]; next[index] = { ...next[index], visible: !next[index].visible }; return { ...current, projectsSection: { ...current.projectsSection, projects: next } }; })} title={project.visible ? "Unpublish" : "Publish"} type="button">{project.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button aria-label={`Delete ${project.title}`} onClick={() => removeItem("project", index)} title="Delete project" type="button"><Trash2 size={14} /></button></div></div>
                  <div className="cms-project-copy"><div className="cms-project-title"><h3>{project.title}</h3><button aria-label={`${project.featured ? "Remove featured status from" : "Feature"} ${project.title}`} className="cms-feature-toggle" onClick={() => updateContent((current) => { const next = [...current.projectsSection.projects]; next[index] = { ...next[index], featured: !next[index].featured }; return { ...current, projectsSection: { ...current.projectsSection, projects: next } }; })} title={project.featured ? "Remove featured" : "Mark featured"} type="button"><Star size={13} fill={project.featured ? "currentColor" : "none"} /></button></div><p>{project.description}</p><div className="cms-tag-list">{project.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}{project.tags.length > 4 && <span>+{project.tags.length - 4}</span>}</div><div className="cms-project-footer"><span><i /> {project.visible ? "Published" : "Hidden"}</span><a aria-label={`Preview ${project.title}`} href={`/projects/${project.id}`} rel="noreferrer" target="_blank" title="Preview project"><Eye size={14} /></a>{project.liveUrl && <a aria-label={`Open ${project.title} live project`} href={project.liveUrl} rel="noreferrer" target="_blank"><ArrowUpRight size={15} /></a>}</div></div>
                </article>)}</div> : <div className="cms-empty">No projects match this view.</div>}
              </section>

              <section className="cms-panel" id="skills">
                <div className="cms-panel-heading"><div><span className="cms-section-index">02 / STACKS & FLUENCY</span><h2>Technical skills</h2><p>Manage skills across Frontend, Backend, Databases, and Tools.</p></div><button className="cms-add-link" onClick={() => openEditor("skill")} type="button"><Plus size={15} /> Add skill</button></div>
                <div className="cms-tabs" role="tablist" aria-label="Skill categories">{skillCategories.map((category) => <button aria-selected={skillFilter === category} className={skillFilter === category ? "is-active" : ""} key={category} onClick={() => setSkillFilter(category)} role="tab" type="button">{category}</button>)}</div>
                <div className="cms-skills-grid">{visibleSkills.map(({ skill, index }) => <article className="cms-skill-row" key={`${skill.name}-${index}`}><span className="cms-skill-symbol" style={{ color: skill.color }}>{isProgrammingLanguageIcon(skill.icon) ? <ProgrammingLanguageIcon name={skill.icon} size={17} /> : <Code2 size={17} />}</span><div className="cms-skill-main"><div className="cms-skill-label"><strong>{skill.name}</strong><span>{skill.level}</span></div><div className="cms-meter"><i style={{ width: skill.level }} /></div><small>{skill.category ?? "Other"}</small></div><div className="cms-skill-actions"><button aria-label={`Edit ${skill.name}`} onClick={() => openEditor("skill", index)} type="button"><Settings2 size={14} /></button><button aria-label={`Delete ${skill.name}`} onClick={() => removeItem("skill", index)} type="button"><Trash2 size={14} /></button></div></article>)}<button className="cms-skill-add" onClick={() => openEditor("skill")} type="button"><Plus size={18} /><span>Add a skill</span></button></div>
              </section>

              <section className="cms-panel" id="experience">
                <div className="cms-panel-heading"><div><span className="cms-section-index">03 / TRACK RECORD</span><h2>Career timeline</h2><p>Experience that brings your work into focus.</p></div><button className="cms-add-link" onClick={() => openEditor("experience")} type="button"><Plus size={15} /> Add role</button></div>
                <div className="cms-timeline">{experiences.map((item, index) => <article className="cms-experience" key={`${item.role}-${index}`}>{item.image ? <img alt={`${item.company || item.role} workplace preview`} className="cms-experience-image" src={item.image} /> : <span className="cms-company-mark">{(item.company || item.role).slice(0, 2).toUpperCase()}</span>}<div className="cms-experience-copy"><div className="cms-experience-title"><div><h3>{item.role}</h3><strong>{item.company || "Independent"}</strong></div><span>{item.year}</span></div><p>{item.desc}</p>{item.location && <small><MapPin size={12} /> {item.location}</small>}</div><div className="cms-experience-actions"><button aria-label={`Edit ${item.role}`} onClick={() => openEditor("experience", index)} type="button"><Settings2 size={14} /></button><button aria-label={`Delete ${item.role}`} onClick={() => removeItem("experience", index)} type="button"><Trash2 size={14} /></button></div></article>)}</div>
              </section>

              <section className="cms-panel" id="certificates">
                <div className="cms-panel-heading">
                  <div><span className="cms-section-index">04 / CERTIFICATIONS</span><h2>Certificates</h2><p>Upload a certificate image and add its details to your public profile.</p></div>
                  <button className="cms-add-link" onClick={() => openEditor("certificate")} type="button"><Plus size={15} /> Add certificate</button>
                </div>
                {certificates.length > 0 ? (
                  <div className="cms-certificate-list">
                    {certificates.map((certificate, index) => (
                      <article className="cms-certificate-row" key={`${certificate.title}-${index}`}>
                        {certificate.image
                          ? <img alt={`${certificate.title} certificate preview`} src={certificate.image} />
                          : <span className="cms-certificate-placeholder"><Award size={19} /></span>}
                        <div className="cms-certificate-copy">
                          <strong>{certificate.title}</strong>
                          <span>{[certificate.issuer, certificate.year].filter(Boolean).join(" · ")}</span>
                          {certificate.description && <small>{certificate.description}</small>}
                        </div>
                        <div className="cms-certificate-actions">
                          <button aria-label={`Edit ${certificate.title}`} onClick={() => openEditor("certificate", index)} type="button"><Settings2 size={14} /></button>
                          <button aria-label={`Delete ${certificate.title}`} onClick={() => removeItem("certificate", index)} type="button"><Trash2 size={14} /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cms-empty">No certificates yet. Add one to show it on your public profile.</div>
                )}
              </section>
            </div>

            <aside className="cms-aside-column">
              <section className="cms-panel cms-config-panel" id="configuration"><div className="cms-aside-heading"><span className="cms-section-index">CONFIGURATION</span><button className="cms-icon-button" aria-label="Save profile" disabled={saved || busy} onClick={save} title="Save changes" type="button"><Check size={16} /></button></div><h2>Profile identity</h2><p>Edit the name, title, and short bio shown on your public profile.</p>
                <label className="cms-input-label">Display name<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, profileName: event.target.value }, hero: { ...current.hero, brand: `${event.target.value} Portfolio` } }))} value={content.about.profileName} /></label>
                <label className="cms-input-label">Professional title<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, profileRole: event.target.value } }))} value={content.about.profileRole} /></label>
                <label className="cms-input-label">Location<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, location: event.target.value }, contact: { ...current.contact, location: event.target.value } }))} value={content.about.location} /></label>
                <label className="cms-input-label">Public profile bio<textarea maxLength={300} onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, bio: event.target.value, profileDescription: event.target.value }, hero: { ...current.hero, description: event.target.value } }))} rows={4} value={content.about.bio} /><small className="cms-char-count">{content.about.bio.length} / 300</small></label>
              </section>

              <section className="cms-panel cms-profile-picture-panel" id="profile-picture">
                <div className="cms-panel-heading"><div><span className="cms-section-index">PROFILE IMAGES</span><h2>Profile and cover photos</h2><p>Upload or replace the images shown on your public profile.</p></div></div>
                <div className="cms-profile-picture-preview">
                  {content.about.photo
                    ? <img alt="Current profile picture" src={content.about.photo} />
                    : <span>{content.about.profileName.slice(0, 1).toUpperCase()}</span>}
                </div>
                <label className="cms-input-label">Profile photo<span className="cms-file-choice">Choose profile photo from files<input accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { void uploadProfileImage("photo", event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" /></span></label>
                <small className="cms-upload-help">PNG, JPEG, WebP, or GIF · max 8 MB. Upload, then save your changes.</small>
                <label className="cms-input-label">Image URL<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, photo: event.target.value } }))} type="text" value={content.about.photo} /></label>
                {content.about.photo && <button className="cms-quiet-btn cms-remove-photo" onClick={() => updateContent((current) => ({ ...current, about: { ...current.about, photo: "" } }))} type="button"><Trash2 size={13} /> Remove picture</button>}
                <div
                  className={`cms-cover-picture-preview${content.about.coverPhoto && coverZoom > 1 ? " is-draggable" : ""}`}
                  onPointerDown={(event) => {
                    if (!content.about.coverPhoto || coverZoom <= 1) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    coverDrag.current = {
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                      positionX: coverPositionX,
                      positionY: coverPositionY,
                      width: bounds.width,
                      height: bounds.height,
                      zoom: coverZoom,
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const drag = coverDrag.current;
                    if (!drag || drag.pointerId !== event.pointerId) return;
                    updateCoverAdjustment(
                      "coverPhotoX",
                      Math.max(0, Math.min(100, drag.positionX -
                        ((event.clientX - drag.startX) / (drag.width * (drag.zoom - 1))) * 100)),
                    );
                    updateCoverAdjustment(
                      "coverPhotoY",
                      Math.max(0, Math.min(100, drag.positionY -
                        ((event.clientY - drag.startY) / (drag.height * (drag.zoom - 1))) * 100)),
                    );
                  }}
                  onPointerUp={() => { coverDrag.current = null; }}
                  onPointerCancel={() => { coverDrag.current = null; }}
                >
                  {content.about.coverPhoto
                    ? <>
                      <img alt="" aria-hidden="true" className="cms-cover-picture-backdrop" src={content.about.coverPhoto} />
                      <img
                        alt="Current cover photo"
                        className="cms-cover-picture-image"
                        src={content.about.coverPhoto}
                        style={{
                          left: `${(1 - coverZoom) * coverPositionX}%`,
                          top: `${(1 - coverZoom) * coverPositionY}%`,
                          transform: `scale(${coverZoom})`,
                        }}
                      />
                    </>
                    : <span>Cover photo preview</span>}
                </div>
                <small className="cms-upload-help">Drag the image to reposition it. Use zoom for a closer crop.</small>
                <label className="cms-input-label cms-cover-adjustment">Zoom · {coverZoom.toFixed(2)}×<input aria-label="Cover photo zoom" max="3" min="1" onChange={(event) => updateCoverAdjustment("coverPhotoZoom", Number(event.target.value))} step="0.05" type="range" value={coverZoom} /></label>
                <div className="cms-cover-position-controls">
                  <label className="cms-input-label">Horizontal position<input aria-label="Cover photo horizontal position" disabled={coverZoom <= 1} max="100" min="0" onChange={(event) => updateCoverAdjustment("coverPhotoX", Number(event.target.value))} type="range" value={coverPositionX} /></label>
                  <label className="cms-input-label">Vertical position<input aria-label="Cover photo vertical position" disabled={coverZoom <= 1} max="100" min="0" onChange={(event) => updateCoverAdjustment("coverPhotoY", Number(event.target.value))} type="range" value={coverPositionY} /></label>
                </div>
                <button
                  className="cms-quiet-btn cms-remove-photo"
                  onClick={() => {
                    updateCoverAdjustment("coverPhotoZoom", 1);
                    updateCoverAdjustment("coverPhotoX", 50);
                    updateCoverAdjustment("coverPhotoY", 50);
                  }}
                  type="button"
                >Reset crop</button>
                <label className="cms-input-label">Cover photo<span className="cms-file-choice">Choose cover photo from files<input accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { void uploadProfileImage("coverPhoto", event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" /></span></label>
                <small className="cms-upload-help">Choose an image from your device (PNG, JPEG, WebP, or GIF, up to 8 MB). Upload, then save your changes.</small>
                <label className="cms-input-label">Cover photo URL<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, coverPhoto: event.target.value, coverPhotoZoom: 1, coverPhotoX: 50, coverPhotoY: 50 } }))} type="url" value={content.about.coverPhoto ?? ""} /></label>
                {content.about.coverPhoto && <button className="cms-quiet-btn cms-remove-photo" onClick={() => updateContent((current) => ({ ...current, about: { ...current.about, coverPhoto: "" } }))} type="button"><Trash2 size={13} /> Remove cover photo</button>}
              </section>

              <section className="cms-panel cms-contact-editor" id="contact-editor">
                <div className="cms-panel-heading"><div><span className="cms-section-index">PUBLIC SOCIAL PROFILES</span><h2>Social profiles</h2><p>Manage the links displayed on your portfolio. This section contains social profiles only.</p></div></div>
                <label className="cms-input-label">Social profiles heading<input onChange={(event) => updateContact("socialTitle", event.target.value)} value={content.contact.socialTitle} /></label>
                <div className="cms-social-editor-heading"><span><strong>Social profiles</strong><small>Name and valid HTTP(S) URL are required.</small></span><button className="cms-add-link" onClick={addSocial} type="button"><Plus size={14} /> Add profile</button></div>
                {content.contact.socials.map((social, index) => {
                  const selectedIcon = socialIconOptions.find((option) => option.name === social.icon);
                  return <div className="cms-social-editor-row" key={`social-${index}`}>
                    <div className="cms-social-icon-field"><span>Social platform</span><button aria-label={`Choose icon for ${social.name || "social profile"}`} className="cms-social-icon-trigger" onClick={() => { setIconSearch(""); setIconPickerIndex(index); }} type="button"><SocialBrandIcon name={social.icon} size={17} /><span>{selectedIcon?.label ?? "Choose icon"}</span><Search size={14} /></button><small>Detected from profile URL when available.</small></div>
                    <label className="cms-input-label">Profile name<input onChange={(event) => updateSocial(index, "name", event.target.value)} value={social.name} /></label>
                    <label className="cms-input-label">Profile URL<input onChange={(event) => updateSocial(index, "url", event.target.value)} placeholder="https://instagram.com/your-profile" type="url" value={social.url} /><small>Logo updates automatically when you paste a supported profile URL.</small></label>
                    <button aria-label={`Remove ${social.name || "social profile"}`} className="cms-managed-card-delete" onClick={() => removeSocial(index)} type="button"><Trash2 size={13} /></button>
                  </div>;
                })}
              </section>

              <section className="cms-panel cms-section-manager" id="sections">
                <div className="cms-panel-heading"><div><span className="cms-section-index">PORTFOLIO STRUCTURE</span><h2>Sections</h2><p>Reorder, rename, show or hide each public section.</p></div></div>
                <div className="cms-section-list">
                  {sectionRows.map((section) => {
                    const navigationIndex = content.navigation.findIndex((item) => item.id === section.id);
                    return <article className="cms-managed-section" key={section.id}>
                      <div className="cms-managed-section-head">
                        <label><input checked={section.enabled} onChange={() => toggleSection(section.id, section.label)} type="checkbox" /><span>{section.enabled ? "Visible" : "Hidden"}</span></label>
                        <strong>{section.id}</strong>
                        <div>
                          <button aria-label={`Move ${section.label} up`} disabled={navigationIndex <= 0} onClick={() => moveSection(section.id, -1)} type="button"><MoveUp size={13} /></button>
                          <button aria-label={`Move ${section.label} down`} disabled={navigationIndex < 0 || navigationIndex >= content.navigation.length - 1} onClick={() => moveSection(section.id, 1)} type="button"><MoveDown size={13} /></button>
                          {section.customSection && <button aria-label={`Delete ${section.label}`} onClick={() => removeCustomSection(section.id)} type="button"><Trash2 size={13} /></button>}
                        </div>
                      </div>
                      <label className="cms-input-label">Navigation label<input onChange={(event) => updateSectionLabel(section.id, event.target.value)} value={section.label} /></label>
                      <label className="cms-input-label">Section title<input onChange={(event) => updateSectionText(section.id, "title", event.target.value)} value={section.title} /></label>
                      {(section.description || ["home", "projects", "languages", "contacts"].includes(section.id)) && <label className="cms-input-label">Section description<textarea maxLength={240} onChange={(event) => updateSectionText(section.id, "description", event.target.value)} rows={2} value={section.description} /><small className="cms-char-count">{section.description.length} / 240</small></label>}
                      {section.customSection && <div className="cms-custom-cards">
                        <div className="cms-managed-cards-heading"><strong>Section cards</strong><button className="cms-add-link" onClick={() => addCustomCard(section.id)} type="button"><Plus size={13} /> Add card</button></div>
                        {section.customSection.cards.map((card, cardIndex) => <div className="cms-managed-card" key={`${section.id}-${cardIndex}`}>
                          <button aria-label={`Delete ${card.title || "section card"}`} className="cms-managed-card-delete" onClick={() => removeCustomCard(section.id, cardIndex)} type="button"><Trash2 size={13} /></button>
                          <label className="cms-input-label">Card title<input onChange={(event) => updateCustomCard(section.id, cardIndex, "title", event.target.value)} value={card.title} /></label>
                          <label className="cms-input-label">Card description<textarea onChange={(event) => updateCustomCard(section.id, cardIndex, "description", event.target.value)} rows={2} value={card.description} /></label>
                          <label className="cms-input-label">Image URL<input onChange={(event) => updateCustomCard(section.id, cardIndex, "image", event.target.value)} type="url" value={card.image} /></label>
                          <label className="cms-input-label">Tags<input onChange={(event) => updateCustomCard(section.id, cardIndex, "tags", event.target.value)} value={card.tags.join(", ")} /></label>
                          <label className="cms-input-label">Link URL<input onChange={(event) => updateCustomCard(section.id, cardIndex, "link", event.target.value)} type="url" value={card.link} /></label>
                        </div>)}
                      </div>}
                    </article>;
                  })}
                </div>
                <form className="cms-new-section" onSubmit={addCustomSection}>
                  <strong>Add a custom section</strong>
                  <label className="cms-input-label">Navigation label<input onChange={(event) => setNewSectionLabel(event.target.value)} required value={newSectionLabel} /></label>
                  <label className="cms-input-label">Section title<input onChange={(event) => setNewSectionTitle(event.target.value)} required value={newSectionTitle} /></label>
                  <label className="cms-input-label">Description<textarea onChange={(event) => setNewSectionDescription(event.target.value)} rows={2} value={newSectionDescription} /></label>
                  <button className="cms-primary-btn" type="submit"><Plus size={14} /> Add section</button>
                </form>
              </section>

              <section className="cms-preview-panel"><div className="cms-aside-heading"><span className="cms-section-index">LIVE VISITOR PREVIEW</span><span className="cms-preview-live"><i /> LIVE</span></div><div className="cms-preview-card"><div className="cms-preview-top"><span className="cms-preview-avatar">{content.about.profileName.slice(0, 1).toUpperCase()}</span><span className="cms-preview-online"><i /> Portfolio profile</span></div><h3>{content.about.profileName || "Your name"}</h3><strong>{content.about.profileRole || "Your professional title"}</strong><p>{content.about.bio || "Your bio will appear here as you write."}</p><span className="cms-preview-location"><MapPin size={12} /> {content.about.location}</span><div className="cms-preview-rule" /><span className="cms-preview-hint">PORTFOLIO PROFILE <ArrowUpRight size={12} /></span></div></section>

              <section className="cms-panel cms-activity-panel"><div className="cms-aside-heading"><span className="cms-section-index">RECENT CMS ACTIVITY</span><span className="cms-activity-count">{activity.length.toString().padStart(2, "0")}</span></div><div className="cms-activity-list">{activity.length ? activity.map((item) => <div className="cms-activity-item" key={item.id}><span className="cms-activity-mark"><Check size={12} /></span><span><strong>{item.label}</strong><small>{item.time}</small></span></div>) : <div className="cms-activity-item"><span className="cms-activity-mark"><Sparkles size={12} /></span><span><strong>Workspace is ready</strong><small>Your recent edits will appear here.</small></span></div>}</div></section>
            </aside>
            <section aria-label="Portfolio summary" className="cms-kpis">
              <article><span className="cms-kpi-icon kpi-blue"><FolderKanban size={17} /></span><span className="cms-kpi-label">PROJECTS</span><strong>{projects.length.toString().padStart(2, "0")}</strong><small>Projects in your portfolio</small></article>
              <article><span className="cms-kpi-icon kpi-green"><Code2 size={17} /></span><span className="cms-kpi-label">TECH STACK & LANGUAGES</span><strong>{skills.length.toString().padStart(2, "0")}</strong><small>Frontend, Backend, Databases & Tools</small></article>
              <article><span className="cms-kpi-icon kpi-amber"><Award size={17} /></span><span className="cms-kpi-label">CERTIFICATES</span><strong>{certificates.length.toString().padStart(2, "0")}</strong><small>Certificates in your profile</small></article>
              <article><span className="cms-kpi-icon kpi-coral"><BriefcaseBusiness size={17} /></span><span className="cms-kpi-label">EXPERIENCE</span><strong>{experiences.length.toString().padStart(2, "0")}</strong><small>Workplaces in your timeline</small></article>
              <article><span className="cms-kpi-icon kpi-green"><ExternalLink size={17} /></span><span className="cms-kpi-label">SOCIAL PROFILES</span><strong>{content.contact.socials.length.toString().padStart(2, "0")}</strong><small>Profiles in your portfolio</small></article>
            </section>
          </div>

          <footer className="cms-footer"><span>Portfolio CMS <span>·</span> Private workspace</span><a href="/">View live site <ExternalLink size={13} /></a></footer>
        </div>
      </main>

      {notice && <div className="cms-toast" role="status"><Check size={16} /> {notice}<button aria-label="Dismiss" onClick={() => setNotice("")} type="button"><X size={15} /></button></div>}

      {editor && <div className="cms-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}><section aria-labelledby="cms-modal-title" aria-modal="true" className="cms-modal" role="dialog"><div className="cms-modal-heading"><div><span className="cms-section-index">CONTENT EDITOR</span><h2 id="cms-modal-title">{editorTitle}</h2></div><button aria-label="Close editor" className="cms-icon-button" onClick={closeEditor} type="button"><X size={18} /></button></div><form onSubmit={submitEditor}>
        {editor.kind === "project" && <>
          <label className="cms-input-label">Project title<input autoFocus onChange={(event) => setDraft({ ...draft, title: event.target.value })} required value={draft.title} /></label>
          <label className="cms-input-label">Short description<textarea onChange={(event) => setDraft({ ...draft, description: event.target.value })} required rows={2} value={draft.description} /></label>
          <div className="cms-gallery-upload">
            <span><strong>System screenshots</strong><br />Add at least one image for a new project. Select several at once, or add and replace images later. PNG, JPEG, WebP, or GIF · up to 8 MB each · 30 images per project.</span>
            <label className="cms-file-choice">Add project images<input accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={(event) => { addGalleryFiles(event.currentTarget.files); event.currentTarget.value = ""; }} type="file" /></label>
          </div>
          {galleryItems.length > 0 && <div className="cms-gallery-editor" aria-label="Project image gallery">
            {galleryItems.map((item, imageIndex) => <div className={`cms-gallery-item${draft.image === item.url ? " is-thumbnail" : ""}`} key={`${item.url}-${imageIndex}`}>
              <img alt={`Project gallery image ${imageIndex + 1}`} src={item.url} />
              <button className="cms-gallery-thumbnail" onClick={() => setDraft((current) => ({ ...current, image: item.url }))} type="button">{draft.image === item.url ? "Thumbnail" : "Set thumbnail"}</button>
              <div className="cms-gallery-controls"><label aria-label={`Replace image ${imageIndex + 1}`} className="cms-gallery-replace" title="Replace image"><Replace size={13} /><input accept="image/png,image/jpeg,image/webp,image/gif" aria-label={`Choose replacement image ${imageIndex + 1}`} onChange={(event) => { replaceGalleryItem(imageIndex, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" /></label><button aria-label="Move image left" disabled={imageIndex === 0} onClick={() => moveGalleryItem(imageIndex, -1)} type="button"><MoveUp size={13} /></button><button aria-label="Move image right" disabled={imageIndex === galleryItems.length - 1} onClick={() => moveGalleryItem(imageIndex, 1)} type="button"><MoveDown size={13} /></button><button aria-label="Remove image" onClick={() => removeGalleryItem(imageIndex)} type="button"><Trash2 size={13} /></button></div>
            </div>)}
          </div>}
          <label className="cms-input-label">GitHub repository URL<input onChange={(event) => setDraft({ ...draft, githubUrl: event.target.value })} type="url" value={draft.githubUrl} /></label>
          <label className="cms-input-label">LinkedIn post or project URL<input onChange={(event) => setDraft({ ...draft, linkedinUrl: event.target.value })} type="url" value={draft.linkedinUrl} /></label>
        </>}
        {editor.kind === "skill" && <><label className="cms-input-label">Skill name<input autoFocus onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} /></label><div className="cms-skill-icon-field"><span>Language, framework, or database icon</span><button aria-label="Choose technology icon" className="cms-social-icon-trigger" onClick={() => { setIconSearch(""); setSkillIconPickerOpen(true); }} type="button">{isProgrammingLanguageIcon(draft.icon) ? <ProgrammingLanguageIcon name={draft.icon} size={18} /> : <Code2 size={18} />}<span>{programmingIconOptions.find((option) => option.name === draft.icon)?.label ?? "Choose an icon"}</span><Search size={14} /></button><small>Search and select the matching technology logo.</small></div><div className="cms-form-row"><label className="cms-input-label">Proficiency (%)<input max="100" min="0" onChange={(event) => setDraft({ ...draft, level: event.target.value })} required type="number" value={draft.level} /></label><label className="cms-input-label">Category<select onChange={(event) => setDraft({ ...draft, category: event.target.value })} required value={draft.category}><option value="Frontend">Frontend</option><option value="Backend">Backend</option><option value="Databases">Databases</option><option value="Tools">Tools</option></select></label></div><label className="cms-input-label">Accent color<input onChange={(event) => setDraft({ ...draft, color: event.target.value })} type="color" value={draft.color} /></label></>}
        {editor.kind === "experience" && <>
          <label className="cms-input-label">Role or title<input autoFocus onChange={(event) => setDraft({ ...draft, role: event.target.value })} required value={draft.role} /></label>
          <div className="cms-form-row"><label className="cms-input-label">Company<input onChange={(event) => setDraft({ ...draft, company: event.target.value })} required value={draft.company} /></label><label className="cms-input-label">Date range<input onChange={(event) => setDraft({ ...draft, year: event.target.value })} required value={draft.year} /></label></div>
          <label className="cms-input-label">Location<input onChange={(event) => setDraft({ ...draft, location: event.target.value })} value={draft.location} /></label>
          <label className="cms-input-label">Description<textarea onChange={(event) => setDraft({ ...draft, desc: event.target.value })} required rows={4} value={draft.desc} /></label>
          <label className="cms-input-label">Workplace photo URL <small>Optional if uploading an image from your files.</small><input onChange={(event) => setDraft({ ...draft, image: event.target.value })} type="url" value={draft.image.startsWith("blob:") ? "" : draft.image} /></label>
          <label className="cms-input-label">Upload workplace photo<span className="cms-file-choice">Choose workplace photo<input accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { addExperienceImage(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" /></span><small>PNG, JPEG, WebP, or GIF · max 8 MB</small></label>
          {experienceImage && <div className="cms-certificate-upload-preview"><img alt="Workplace photo preview" src={experienceImage.url} /><span>Workplace photo ready</span></div>}
        </>}
        {editor.kind === "certificate" && <>
          <label className="cms-input-label">Certificate title<input autoFocus onChange={(event) => setDraft({ ...draft, title: event.target.value })} required value={draft.title} /></label>
          <div className="cms-form-row">
            <label className="cms-input-label">Issued by<input onChange={(event) => setDraft({ ...draft, issuer: event.target.value })} required value={draft.issuer} /></label>
            <label className="cms-input-label">Year or date<input onChange={(event) => setDraft({ ...draft, year: event.target.value })} required value={draft.year} /></label>
          </div>
          <label className="cms-input-label">Short description<textarea maxLength={500} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} value={draft.description} /></label>
          <label className="cms-input-label">Certificate image URL <small>Optional when uploading a file.</small><input onChange={(event) => setDraft({ ...draft, image: event.target.value })} type="url" value={draft.image.startsWith("blob:") ? "" : draft.image} /></label>
          <label className="cms-input-label">Upload certificate from your files<span className="cms-file-choice">Choose certificate image<input accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { addCertificateImage(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" /></span><small>PNG, JPEG, WebP, or GIF · max 8 MB</small></label>
          {certificateImage && <div className="cms-certificate-upload-preview"><img alt="Certificate upload preview" src={certificateImage.url} /><span>Ready to save</span></div>}
        </>}
        <div className="cms-modal-actions"><button className="cms-quiet-btn" onClick={closeEditor} type="button">Cancel</button><button className="cms-primary-btn" disabled={busy} type="submit">{busy ? "Uploading..." : editor.index === null ? "Add to portfolio" : "Save item"}</button></div>
      </form></section></div>}
      {iconPickerIndex !== null && <div className="cms-modal-backdrop cms-social-icon-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIconPickerIndex(null); }}><section aria-labelledby="cms-social-icon-title" aria-modal="true" className="cms-modal cms-social-icon-dialog" role="dialog"><div className="cms-modal-heading"><div><span className="cms-section-index">SOCIAL PROFILE ICON</span><h2 id="cms-social-icon-title">Choose a platform</h2></div><button aria-label="Close icon picker" className="cms-icon-button" onClick={() => setIconPickerIndex(null)} type="button"><X size={18} /></button></div><label className="cms-social-icon-search"><Search aria-hidden="true" size={17} /><input autoFocus onChange={(event) => setIconSearch(event.target.value)} placeholder="Search social media..." type="search" value={iconSearch} /></label><div aria-label="Available social platforms" className="cms-social-icon-grid">{socialIconOptions.filter((option) => option.label.toLowerCase().includes(iconSearch.trim().toLowerCase())).map((option) => <button aria-pressed={content.contact.socials[iconPickerIndex]?.icon === option.name} className={content.contact.socials[iconPickerIndex]?.icon === option.name ? "is-selected" : ""} key={option.name} onClick={() => { updateSocial(iconPickerIndex, "icon", option.name); setIconPickerIndex(null); }} type="button"><SocialBrandIcon name={option.name} size={20} /><span>{option.label}</span></button>)}</div>{socialIconOptions.filter((option) => option.label.toLowerCase().includes(iconSearch.trim().toLowerCase())).length === 0 && <p className="cms-social-icon-empty">No icons match your search.</p>}</section></div>}
      {skillIconPickerOpen && <div className="cms-modal-backdrop cms-social-icon-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSkillIconPickerOpen(false); }}><section aria-labelledby="cms-skill-icon-title" aria-modal="true" className="cms-modal cms-social-icon-dialog" role="dialog"><div className="cms-modal-heading"><div><span className="cms-section-index">TECHNICAL SKILL ICON</span><h2 id="cms-skill-icon-title">Choose a technology</h2></div><button aria-label="Close skill icon picker" className="cms-icon-button" onClick={() => setSkillIconPickerOpen(false)} type="button"><X size={18} /></button></div><label className="cms-social-icon-search"><Search aria-hidden="true" size={17} /><input autoFocus onChange={(event) => setIconSearch(event.target.value)} placeholder="Search languages, frameworks, and databases..." type="search" value={iconSearch} /></label><div aria-label="Available technology icons" className="cms-social-icon-grid">{programmingIconOptions.filter((option) => option.label.toLowerCase().includes(iconSearch.trim().toLowerCase())).map((option) => <button aria-pressed={draft.icon === option.name} className={draft.icon === option.name ? "is-selected" : ""} key={option.name} onClick={() => { setDraft((current) => ({ ...current, icon: option.name })); setSkillIconPickerOpen(false); }} type="button">{isProgrammingLanguageIcon(option.name) ? <ProgrammingLanguageIcon name={option.name} size={20} /> : <Code2 size={20} />}<span>{option.label}</span></button>)}</div>{programmingIconOptions.filter((option) => option.label.toLowerCase().includes(iconSearch.trim().toLowerCase())).length === 0 && <p className="cms-social-icon-empty">No icons match your search.</p>}</section></div>}
    </div>
  );
}