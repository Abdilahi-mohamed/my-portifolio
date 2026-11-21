"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
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
import type { PortfolioContent, ProjectTechnology } from "../types";
import RichTextEditor, { countRichTextWords } from "../RichTextEditor";
import { isPortfolioContent } from "../../../../backend/src/lib/portfolioValidation";
import {
  isLinkedInProfile,
  isValidLinkedInUrl,
  SocialBrandIcon,
  socialIconForUrl,
  socialIconOptions,
} from "../socialIcons";
import {
  isProgrammingLanguageIcon,
  ProgrammingLanguageIcon,
  programmingIconBackground,
  programmingIconColor,
  programmingIconOptions,
  projectTechnologyOptions,
} from "../programmingIcons";
import {
  adminLogout,
  loadAdminPortfolio,
  saveAdminPortfolio,
  uploadImage,
  uploadProjectMedia,
  type AdminPortfolioSnapshot,
} from "./adminApi";
import { subscribeToPortfolioUpdates } from "../api";

type Project = PortfolioContent["projectsSection"]["projects"][number];
type Skill = PortfolioContent["skillsSection"]["skills"][number];
type Experience = PortfolioContent["experience"][number];
type Certificate = PortfolioContent["certificates"][number];
type EditorKind = "project" | "skill" | "experience" | "certificate";
type EditorState = { kind: EditorKind; index: number | null };
type GalleryItem = { url: string; file?: File };
type ProjectMediaItem = { type: "image" | "video"; url: string; file?: File };

function dashboardPortfolio(snapshot: AdminPortfolioSnapshot): PortfolioContent {
  return {
    ...snapshot.content,
    navigation: snapshot.content.navigation.map((item) =>
      item.id === "contacts" ? { ...item, label: "Social profiles" } : item,
    ),
  };
}

const skillGroups = ["Frontend", "Backend", "Databases", "Tools"] as const;
const builtInSections = [
  { id: "about", label: "About me", title: "About me" },
  { id: "home", label: "Home", title: "Welcome" },
  { id: "projects", label: "Projects", title: "Projects" },
  { id: "languages", label: "Tech stack", title: "Skills" },
  { id: "contacts", label: "Social profiles", title: "Social profiles" },
] as const;

function makeDraft(kind: EditorKind, item?: Project | Skill | Experience | Certificate): Record<string, string> {
  if (kind === "project") {
    const project = item as Project | undefined;
    return {
      title: project?.title ?? "",
      id: project?.id ?? "",
      category: project?.category ?? "Fullstack",
      ownershipLabel: project?.ownershipLabel ?? "Personal Project",
      description: project?.description ?? "",
      fullDescription: project?.fullDescription ?? project?.description ?? "",
      projectDescription: project?.projectDescription ?? "",
      problemStatement: project?.problemStatement ?? "",
      solution: project?.solution ?? "",
      howItWorks: project?.howItWorks ?? "",
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
  const contentRef = useRef<PortfolioContent | null>(null);
  const [revision, setRevision] = useState("");
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
  const [projectMediaItems, setProjectMediaItems] = useState<ProjectMediaItem[]>([]);
  const [selectedTechnologies, setSelectedTechnologies] = useState<ProjectTechnology[]>([]);
  const [technologySearch, setTechnologySearch] = useState("");
  const [certificateImage, setCertificateImage] = useState<GalleryItem | null>(null);
  const [experienceImage, setExperienceImage] = useState<GalleryItem | null>(null);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [skillIconPickerOpen, setSkillIconPickerOpen] = useState(false);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonEditorError, setJsonEditorError] = useState("");
  useEffect(() => {
    loadAdminPortfolio()
      .then((snapshot) => {
        const portfolio = dashboardPortfolio(snapshot);
        contentRef.current = portfolio;
        setRevision(snapshot.revision);
        setContent(portfolio);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not load portfolio.";
        setLoadingError(message);
        if (message.toLowerCase().includes("sign in")) onUnauthorized();
      });
  }, [onUnauthorized]);

  useEffect(() => subscribeToPortfolioUpdates(() => {
    const currentContent = contentRef.current;
    if (!currentContent) return;
    if (!saved) {
      setNotice("Another admin session saved newer content. Your unsaved edits were kept; reload only after copying anything you want to keep.");
      return;
    }
    loadAdminPortfolio()
      .then((snapshot) => {
        if (contentRef.current !== currentContent) {
          setNotice("Another admin session saved newer content. Your unsaved edits were kept; reload only after copying anything you want to keep.");
          return;
        }
        const portfolio = dashboardPortfolio(snapshot);
        contentRef.current = portfolio;
        setRevision(snapshot.revision);
        setContent(portfolio);
        setNotice("Portfolio refreshed from the database.");
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not refresh portfolio content.";
        setNotice(message);
        if (message.toLowerCase().includes("sign in")) onUnauthorized();
      });
  }), [onUnauthorized, saved]);

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
    const current = contentRef.current;
    if (!current) return;
    const next = updater(current);
    contentRef.current = next;
    setContent(next);
    setSaved(false);
  };

  const openJsonEditor = () => {
    if (!content) return;
    setJsonDraft(JSON.stringify(content, null, 2));
    setJsonEditorError("");
    setJsonEditorOpen(true);
  };

  const applyJsonChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let updatedContent: PortfolioContent;
    try {
      updatedContent = JSON.parse(jsonDraft) as PortfolioContent;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      setJsonEditorError("The JSON is invalid. Fix its syntax and try again.");
      return;
    }
    if (!isPortfolioContent(updatedContent)) {
      setJsonEditorError("The JSON does not match the portfolio format. Export the schema for the supported fields and values.");
      return;
    }
    updateContent(() => updatedContent);
    setJsonEditorOpen(false);
    setJsonEditorError("");
    setNotice("All portfolio data is ready to save. Select Save changes to publish it.");
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
        if (id === "about") return { ...current, about: { ...current.about, title: value, bioTitle: value } };
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
    const contentToSave = contentRef.current;
    if (!contentToSave || !revision || busy) return;
    const incompleteSocial = contentToSave.contact.socials.find((social) => {
      if (!social.name.trim()) return true;
      const url = typeof social.url === "string" ? social.url.trim() : "";
      const isLinkedIn = isLinkedInProfile(social);
      if (!url) return !isLinkedIn;
      try {
        const parsedUrl = new URL(url);
        return (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") ||
          (isLinkedIn && !isValidLinkedInUrl(url));
      } catch {
        return true;
      }
    });
    if (incompleteSocial) {
      setNotice("Add a name and valid HTTP(S) URLs to social profiles. The LinkedIn URL may be left blank.");
      return;
    }
    setBusy(true);
    try {
      const result = await saveAdminPortfolio(contentToSave, revision);
      setRevision(result.revision);
      const allChangesSaved = contentRef.current === contentToSave;
      setSaved(allChangesSaved);
      setNotice(allChangesSaved
        ? result.message
        : "The submitted changes were saved. Newer edits made during the save are still unsaved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save changes.";
      setNotice(message.includes("changed after it was loaded")
        ? `${message} Your local edits are still intact; reload only after copying any edits you want to keep.`
        : message);
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
    setProjectMediaItems(kind === "project" && item && "media" in item
      ? (item.media ?? []).map((media) => ({ ...media }))
      : []);
    setSelectedTechnologies(kind === "project" && item && "technologies" in item
      ? (item.technologies ?? []).map((technology) => ({ ...technology }))
      : []);
    setTechnologySearch("");
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
    projectMediaItems.forEach((item) => {
      if (item.file) URL.revokeObjectURL(item.url);
    });
    if (certificateImage?.file) URL.revokeObjectURL(certificateImage.url);
    if (experienceImage?.file) URL.revokeObjectURL(experienceImage.url);
    setCertificateImage(null);
    setExperienceImage(null);
    setGalleryItems([]);
    setProjectMediaItems([]);
    setSelectedTechnologies([]);
    setTechnologySearch("");
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
      const uploadedProjectMedia = await Promise.all(projectMediaItems.map(async (item) => ({
        type: item.type,
        url: item.file ? await uploadProjectMedia(item.file) : item.url,
      })));
      const project: Project = {
        id: draft.id || `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "project"}-${crypto.randomUUID().slice(0, 8)}`,
        title: draft.title.trim(),
        category: draft.category.trim() || "Fullstack",
        ownershipLabel: draft.ownershipLabel.trim() || "Personal Project",
        description: draft.description.trim(),
        fullDescription: draft.fullDescription.trim(),
        projectDescription: draft.projectDescription.trim(),
        problemStatement: draft.problemStatement.trim(),
        solution: draft.solution.trim(),
        howItWorks: draft.howItWorks.trim(),
        technologies: selectedTechnologies,
        media: uploadedProjectMedia,
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
      setNotice("Project updated. Save changes to publish it.");
      closeEditor();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Project media could not be uploaded.");
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

  const addProjectMediaFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files);
    const invalid = accepted.find((file) => {
      const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
      const isVideo = ["video/mp4", "video/webm"].includes(file.type);
      return (!isImage && !isVideo) || file.size > (isVideo ? 50 : 8) * 1024 * 1024;
    });
    if (invalid) {
      setNotice(`${invalid.name}: choose a supported image up to 8 MB or MP4/WebM video up to 50 MB.`);
      return;
    }
    if (projectMediaItems.length + accepted.length > 30) {
      setNotice("A project can contain up to 30 project media files.");
      return;
    }
    setProjectMediaItems((items) => [
      ...items,
      ...accepted.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" as const : "image" as const,
      })),
    ]);
  };

  const removeProjectMediaItem = (index: number) => {
    const removed = projectMediaItems[index];
    if (removed?.file) URL.revokeObjectURL(removed.url);
    setProjectMediaItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
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

  const uploadProfileImage = async (field: "photo", file: File | undefined) => {
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
        },
      }));
      setNotice("Profile picture uploaded. Save changes to publish it.");
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
              ? { ...social, url: value, icon: socialIconForUrl(value) ?? "Globe2" }
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
  const sectionRows = [
    ...builtInSections.map(({ id, label }) => {
      const navigationItem = content.navigation.find((item) => item.id === id);
      const custom = content.customSections.find((section) => section.id === id);
      const sectionTitle = id === "about" ? content.about.bioTitle || content.about.title
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
          <a href="#profile-picture"><UserRound size={16} /> Profile picture</a>
          <a href="#configuration"><Settings2 size={16} /> About me</a>
          <a href="#manifest"><FolderKanban size={16} /> Projects <span>{projects.length}</span></a>
          <a href="#skills"><Code2 size={16} /> Skills <span>{skills.length}</span></a>
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
            <button className="cms-outline-btn" onClick={openJsonEditor} type="button"><FileJson2 size={15} /> Edit all data</button>
            <button className="cms-save-btn" disabled={saved || busy} onClick={save} type="button">{busy ? "Saving..." : saved ? <><Check size={15} /> Saved</> : "Save changes"}</button>
          </div>
        </header>

        <div className="cms-content">
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
                <div className="cms-skills-grid">{visibleSkills.map(({ skill, index }) => <article className="cms-skill-row" key={`${skill.name}-${index}`}><span className="cms-skill-symbol" style={{ color: programmingIconColor(skill.icon, skill.color), backgroundColor: programmingIconBackground(skill.icon) ?? "#F9F8F6" }}>{isProgrammingLanguageIcon(skill.icon) ? <ProgrammingLanguageIcon name={skill.icon} size={19} color={programmingIconColor(skill.icon, skill.color)} /> : <Code2 size={19} />}</span><div className="cms-skill-main"><div className="cms-skill-label"><strong>{skill.name}</strong><span>{skill.level}</span></div><div className="cms-meter"><i style={{ width: skill.level }} /></div><small>{skill.category ?? "Other"}</small></div><div className="cms-skill-actions"><button aria-label={`Edit ${skill.name}`} onClick={() => openEditor("skill", index)} type="button"><Settings2 size={14} /></button><button aria-label={`Delete ${skill.name}`} onClick={() => removeItem("skill", index)} type="button"><Trash2 size={14} /></button></div></article>)}<button className="cms-skill-add" onClick={() => openEditor("skill")} type="button"><Plus size={18} /><span>Add a skill</span></button></div>
              </section>

            </div>

            <aside className="cms-aside-column">
              <section className="cms-panel cms-config-panel" id="configuration"><div className="cms-aside-heading"><span className="cms-section-index">PORTFOLIO PROFILE</span><button className="cms-icon-button" aria-label="Save profile" disabled={saved || busy} onClick={save} title="Save changes" type="button"><Check size={16} /></button></div><h2>About me</h2><p>Edit the About section and profile details shown on your portfolio.</p>
                <label className="cms-input-label">Section description<RichTextEditor label="Section description" value={content.projectsSection.description} onChange={(html) => updateContent((current) => ({ ...current, projectsSection: { ...current.projectsSection, description: html } }))} /></label>
                <label className="cms-input-label">Short About me text<RichTextEditor label="Short About me text" wordLimit={1000} value={content.about.bio} onChange={(html) => updateContent((current) => ({ ...current, about: { ...current.about, bio: html, profileDescription: html } }))} /><small className="cms-char-count cms-rich-word-count">{countRichTextWords(content.about.bio)} / 1000 words</small></label>
                <label className="cms-input-label">About section label<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, label: event.target.value } }))} value={content.about.label} /></label>
                <label className="cms-input-label">About me heading<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, title: event.target.value, bioTitle: event.target.value } }))} value={content.about.bioTitle || content.about.title} /></label>
                <label className="cms-input-label">Display name<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, profileName: event.target.value }, hero: { ...current.hero, brand: `${event.target.value} Portfolio` } }))} value={content.about.profileName} /></label>
                <label className="cms-input-label">Professional title<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, profileRole: event.target.value } }))} value={content.about.profileRole} /></label>
                <label className="cms-input-label">Location<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, location: event.target.value }, contact: { ...current.contact, location: event.target.value } }))} value={content.about.location} /></label>
                <div className="cms-form-row">
                  <label className="cms-input-label">Snapshot label<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, snapshotLabel: event.target.value } }))} value={content.about.snapshotLabel ?? ""} /></label>
                  <label className="cms-input-label">Snapshot title<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, snapshotTitle: event.target.value } }))} value={content.about.snapshotTitle ?? ""} /></label>
                </div>
                <label className="cms-input-label">Projects summary label<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, projectCountLabel: event.target.value } }))} value={content.about.projectCountLabel ?? ""} /></label>
                <label className="cms-input-label">Skills summary label<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, skillCountLabel: event.target.value } }))} value={content.about.skillCountLabel ?? ""} /></label>
                <label className="cms-input-label">Social summary label<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, socialCountLabel: event.target.value } }))} value={content.about.socialCountLabel ?? ""} /></label>
              </section>

              <section className="cms-panel cms-profile-picture-panel" id="profile-picture">
                <div className="cms-panel-heading"><div><span className="cms-section-index">PROFILE IMAGE</span><h2>Profile photo</h2><p>Upload or replace the image shown on your public profile.</p></div></div>
                <div className="cms-profile-picture-preview">
                  {content.about.photo
                    ? <img alt="Current profile picture" src={content.about.photo} />
                    : <span>{content.about.profileName.slice(0, 1).toUpperCase()}</span>}
                </div>
                <label className="cms-input-label">Profile photo<span className="cms-file-choice">Choose profile photo from files<input accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { void uploadProfileImage("photo", event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" /></span></label>
                <small className="cms-upload-help">PNG, JPEG, WebP, or GIF · max 8 MB. Upload, then save your changes.</small>
                <label className="cms-input-label">Image URL<input onChange={(event) => updateContent((current) => ({ ...current, about: { ...current.about, photo: event.target.value } }))} type="text" value={content.about.photo} /></label>
                {content.about.photo && <button className="cms-quiet-btn cms-remove-photo" onClick={() => updateContent((current) => ({ ...current, about: { ...current.about, photo: "" } }))} type="button"><Trash2 size={13} /> Remove picture</button>}
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
                      {(section.description || ["home", "languages", "contacts"].includes(section.id)) && <label className="cms-input-label">Section description<RichTextEditor label={`Section description: ${section.label}`} value={section.description} onChange={(html) => updateSectionText(section.id, "description", html)} /></label>}
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

            </aside>
            <section className="cms-panel cms-contact-editor cms-social-profiles-panel" id="contact-editor">
              <div className="cms-panel-heading"><div><span className="cms-section-index">PUBLIC SOCIAL PROFILES</span><h2>Social profiles</h2><p>Manage the links displayed on your portfolio. This section contains social profiles only.</p></div></div>
              <label className="cms-input-label">Social profiles heading<input onChange={(event) => updateContact("socialTitle", event.target.value)} value={content.contact.socialTitle} /></label>
              <label className="cms-input-label">Email address<input onChange={(event) => updateContact("email", event.target.value)} placeholder="you@example.com" type="email" value={content.contact.email} /><small>Shown on the public portfolio and used by the copy-email card.</small></label>
              <div className="cms-social-editor-heading"><span><strong>Social profiles</strong><small>Names and valid HTTP(S) URLs are required. LinkedIn URL is optional.</small></span><button className="cms-add-link" onClick={addSocial} type="button"><Plus size={14} /> Add profile</button></div>
              {content.contact.socials.map((social, index) => {
                const icon = socialIconForUrl(typeof social.url === "string" ? social.url : "") ?? social.icon;
                const selectedIcon = socialIconOptions.find((option) => option.name === icon);
                return <div className="cms-social-editor-row" key={`social-${index}`}>
                  <div className="cms-social-icon-field"><span>Social platform</span><button aria-label={`Choose icon for ${social.name || "social profile"}`} className="cms-social-icon-trigger" onClick={() => { setIconSearch(""); setIconPickerIndex(index); }} type="button"><SocialBrandIcon name={icon} size={17} /><span>{selectedIcon?.label ?? "Choose icon"}</span><Search size={14} /></button><small>Detected from profile URL when available.</small></div>
                  <label className="cms-input-label">Profile name<input onChange={(event) => updateSocial(index, "name", event.target.value)} value={social.name} /></label>
                  <label className="cms-input-label">Profile URL{isLinkedInProfile(social) ? " (optional)" : ""}<input onChange={(event) => updateSocial(index, "url", event.target.value)} placeholder={isLinkedInProfile(social) ? "https://linkedin.com/in/your-profile" : "https://instagram.com/your-profile"} type="url" value={social.url ?? ""} /><small>Logo updates automatically when you paste a supported profile URL.</small></label>
                  <button aria-label={`Remove ${social.name || "social profile"}`} className="cms-managed-card-delete" onClick={() => removeSocial(index)} type="button"><Trash2 size={13} /></button>
                </div>;
              })}
            </section>
          </div>

        </div>
      </main>

      {notice && <div className="cms-toast" role="status"><Check size={16} /> {notice}<button aria-label="Dismiss" onClick={() => setNotice("")} type="button"><X size={15} /></button></div>}

      {jsonEditorOpen && <div className="cms-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setJsonEditorOpen(false); }}><section aria-labelledby="cms-json-editor-title" aria-modal="true" className="cms-modal cms-json-modal" role="dialog"><div className="cms-modal-heading"><div><span className="cms-section-index">COMPLETE PORTFOLIO DATA</span><h2 id="cms-json-editor-title">Edit all data</h2></div><button aria-label="Close JSON editor" className="cms-icon-button" onClick={() => setJsonEditorOpen(false)} type="button"><X size={18} /></button></div><form onSubmit={applyJsonChanges}><label className="cms-input-label">Portfolio JSON<textarea aria-label="Portfolio JSON data" className="cms-json-editor" onChange={(event) => { setJsonDraft(event.target.value); setJsonEditorError(""); }} spellCheck={false} value={jsonDraft} /></label>{jsonEditorError && <p className="cms-json-error" role="alert">{jsonEditorError}</p>}<p className="cms-json-help">This includes every saved portfolio field. Applying validates the data; use Save changes to publish it.</p><div className="cms-modal-actions"><button className="cms-quiet-btn" onClick={() => setJsonEditorOpen(false)} type="button">Cancel</button><button className="cms-primary-btn" type="submit">Apply changes</button></div></form></section></div>}

      {editor && <div className="cms-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}><section aria-labelledby="cms-modal-title" aria-modal="true" className="cms-modal" role="dialog"><div className="cms-modal-heading"><div><span className="cms-section-index">CONTENT EDITOR</span><h2 id="cms-modal-title">{editorTitle}</h2></div><button aria-label="Close editor" className="cms-icon-button" onClick={closeEditor} type="button"><X size={18} /></button></div><form onSubmit={submitEditor}>
        {editor.kind === "project" && <>
          <label className="cms-input-label">Project title<input autoFocus onChange={(event) => setDraft({ ...draft, title: event.target.value })} required value={draft.title} /></label>
          <label className="cms-input-label">Ownership label <small>Shown below the title on your project card. Leave blank to use “Personal Project”.</small><input maxLength={80} onChange={(event) => setDraft({ ...draft, ownershipLabel: event.target.value })} placeholder="Personal Project" value={draft.ownershipLabel} /></label>
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
          <label className="cms-input-label">Live project URL <small>Optional. Add the public website URL if the project is online.</small><input onChange={(event) => setDraft({ ...draft, liveUrl: event.target.value })} placeholder="https://example.com" type="url" value={draft.liveUrl} /></label>
          <label className="cms-input-label">GitHub repository URL<input onChange={(event) => setDraft({ ...draft, githubUrl: event.target.value })} type="url" value={draft.githubUrl} /></label>
          <label className="cms-input-label">LinkedIn post or project URL<input onChange={(event) => setDraft({ ...draft, linkedinUrl: event.target.value })} type="url" value={draft.linkedinUrl} /></label>
          <section aria-label="Project details" className="cms-project-details-fields">
            <div className="cms-project-details-heading">
              <span className="cms-section-index">PROJECT CASE STUDY</span>
              <p>Document the project story visitors can explore from your portfolio.</p>
            </div>
            <label className="cms-input-label">1. Project Description<textarea maxLength={10000} onChange={(event) => setDraft({ ...draft, projectDescription: event.target.value })} placeholder="Describe the project, its purpose, and what it is designed to do." rows={4} value={draft.projectDescription} /></label>
            <label className="cms-input-label">2. Problem Statement<textarea maxLength={10000} onChange={(event) => setDraft({ ...draft, problemStatement: event.target.value })} placeholder="Explain the specific problem this project is intended to solve." rows={4} value={draft.problemStatement} /></label>
            <label className="cms-input-label">3. Solution<textarea maxLength={10000} onChange={(event) => setDraft({ ...draft, solution: event.target.value })} placeholder="Describe how the project solves the identified problem." rows={4} value={draft.solution} /></label>
            <label className="cms-input-label">4. How It Works<textarea maxLength={10000} onChange={(event) => setDraft({ ...draft, howItWorks: event.target.value })} placeholder="Explain the workflow and how users interact with the system." rows={4} value={draft.howItWorks} /></label>
            <section aria-label="Technologies used" className="cms-project-technologies-field">
              <div className="cms-project-details-heading">
                <span className="cms-section-index">5. TECHNOLOGY STACK</span>
                <p>Select the languages, frameworks, libraries, and databases used in this project.</p>
              </div>
              {selectedTechnologies.length > 0 && <div aria-label="Selected technologies" className="cms-project-technology-selected">
                {selectedTechnologies.map((technology) => <span className="cms-project-technology-chip" key={technology.id}>
                  {isProgrammingLanguageIcon(technology.icon)
                    ? <ProgrammingLanguageIcon color={programmingIconColor(technology.icon, "#56665c")} name={technology.icon} size={16} />
                    : <Code2 aria-hidden="true" size={16} />}
                  {technology.name}
                  <button aria-label={`Remove ${technology.name}`} onClick={() => setSelectedTechnologies((items) => items.filter((item) => item.id !== technology.id))} type="button"><X size={13} /></button>
                </span>)}
              </div>}
              <label className="cms-project-technology-search"><Search aria-hidden="true" size={16} /><input onChange={(event) => setTechnologySearch(event.target.value)} placeholder="Search technologies..." type="search" value={technologySearch} /></label>
              <div aria-label="Available technologies" className="cms-project-technology-options">
                {projectTechnologyOptions.filter((technology) => technology.name.toLowerCase().includes(technologySearch.trim().toLowerCase())).map((technology) => {
                  const selected = selectedTechnologies.some((item) => item.id === technology.id);
                  return <button aria-pressed={selected} className={selected ? "is-selected" : ""} key={technology.id} onClick={() => setSelectedTechnologies((items) => selected
                    ? items.filter((item) => item.id !== technology.id)
                    : [...items, technology])} type="button">
                    {isProgrammingLanguageIcon(technology.icon)
                      ? <ProgrammingLanguageIcon color={programmingIconColor(technology.icon, "#56665c")} name={technology.icon} size={18} />
                      : <Code2 aria-hidden="true" size={18} />}
                    <span>{technology.name}</span>
                    {selected && <Check aria-hidden="true" size={14} />}
                  </button>;
                })}
                {projectTechnologyOptions.filter((technology) => technology.name.toLowerCase().includes(technologySearch.trim().toLowerCase())).length === 0 && <p className="cms-project-technology-empty">No technologies match your search.</p>}
              </div>
            </section>
            <div className="cms-project-media-field">
              <strong>6. Project Media</strong>
              <p>Upload supporting images, screenshots, and MP4 or WebM demonstrations. Up to 30 files; images up to 8 MB and videos up to 50 MB each.</p>
              <label className="cms-file-choice">Add project media<input accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" multiple onChange={(event) => { addProjectMediaFiles(event.currentTarget.files); event.currentTarget.value = ""; }} type="file" /></label>
              {projectMediaItems.length > 0 && <div aria-label="Project media files" className="cms-project-media-grid">
                {projectMediaItems.map((item, mediaIndex) => <div className="cms-project-media-item" key={`${item.url}-${mediaIndex}`}>
                  {item.type === "video"
                    ? <video muted preload="metadata" src={item.url} />
                    : <img alt={`Project media ${mediaIndex + 1}`} src={item.url} />}
                  <span>{item.type === "video" ? "Video" : "Image"} {mediaIndex + 1}</span>
                  <button aria-label={`Remove project media ${mediaIndex + 1}`} onClick={() => removeProjectMediaItem(mediaIndex)} type="button"><Trash2 size={13} /></button>
                </div>)}
              </div>}
            </div>
          </section>
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