"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Figma,
  Facebook,
  Github,
  Globe2,
  Home,
  Layers3,
  Linkedin,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  FolderKanban,
  Send,
  Sun,
  Terminal,
  X as XIcon,
  Zap,
} from "lucide-react";
import {
  isLinkedInProfile,
  isValidLinkedInUrl,
  SocialBrandIcon,
  socialIconForUrl,
  socialIconOptions,
} from "./socialIcons";
import {
  apiUrl,
  cachePortfolio,
  getCachedPortfolio,
  resolvePortfolioMedia,
  subscribeToPortfolioUpdates,
} from "./api";
import {
  isProgrammingLanguageIcon,
  ProgrammingLanguageIcon,
  programmingIconBackground,
  programmingIconColor,
} from "./programmingIcons";
import type { IconName, PortfolioContent } from "./types";
import { sanitizeRichTextHtml } from "./RichTextEditor";

type ToastMessage = { title: string; detail?: string };
type Project = PortfolioContent["projectsSection"]["projects"][number];
type Certificate = PortfolioContent["certificates"][number];
type Experience = PortfolioContent["experience"][number];
type AccentTheme = "aurora" | "emerald" | "gold";
type ContainerMode = "compact" | "boxed";

function isAccentTheme(value: string | null): value is AccentTheme {
  return value === "aurora" || value === "emerald" || value === "gold";
}

function isContainerMode(value: string | null): value is ContainerMode {
  return value === "compact" || value === "boxed";
}

function projectMedia(project: Project): { type: "image" | "video"; url: string }[] {
  const media = project.media ?? [];
  const existingImages = [project.image, ...(project.gallery ?? [])]
    .filter((url, index, urls) => Boolean(url) && urls.indexOf(url) === index)
    .filter((url) => !media.some((item) => item.type === "image" && item.url === url))
    .map((url) => ({ type: "image" as const, url }));
  return [...media, ...existingImages];
}

const icons: Partial<Record<IconName, typeof ArrowUpRight>> = {
  ArrowUpRight,
  Check,
  Code2,
  ExternalLink,
  Figma,
  Facebook,
  Github,
  Globe2,
  Layers3,
  Linkedin,
  Instagram,
  MapPin,
  MessageCircle,
  Monitor,
  Palette,
  Send,
  Terminal,
  X: XIcon,
  Zap,
};
const skillGroups = ["Frontend", "Backend", "Databases", "Tools"] as const;

function ProjectDetailsPage({ project, profileName }: { project: Project; profileName: string }) {
  const media = projectMedia(project);
  const technologies = project.technologies ?? [];
  const description = project.projectDescription || project.fullDescription || project.description;
  const sections = [
    { number: "01", title: "Project Description", content: description },
    { number: "02", title: "Problem Statement", content: project.problemStatement },
    { number: "03", title: "Solution", content: project.solution },
    { number: "04", title: "How It Works", content: project.howItWorks },
  ];

  return (
    <main className="portfolio-page project-page">
      <article aria-labelledby="project-detail-title" className="project-detail-page">
        <a className="project-detail-back" href="/#projects">← Back to projects</a>
        <p className="eyebrow">{project.category}</p>
        <h1 id="project-detail-title">{project.title}</h1>
        <p className="project-detail-owner">{profileName} · Project case study</p>
        <div className="project-detail-sections">
          {sections.map((section) => (
            <section key={section.number}>
              <span>{section.number}</span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.content || "No information has been added yet."}</p>
              </div>
            </section>
          ))}
          {project.tags.length > 0 && <section>
            <span>05</span>
            <div>
              <h2>Project Tags</h2>
              <div aria-label="Project tags" className="project-detail-tags">
                {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
          </section>}
          <section>
            <span>06</span>
            <div>
              <h2>Technologies Used</h2>
              {technologies.length > 0
                ? <div aria-label="Project technologies" className="project-detail-technologies">
                  {technologies.map((technology) => (
                    <span className="project-detail-technology" key={technology.id}>
                      {isProgrammingLanguageIcon(technology.icon)
                        ? <ProgrammingLanguageIcon color={programmingIconColor(technology.icon, "#D4AF37")} name={technology.icon} size={19} />
                        : <Code2 aria-hidden="true" size={19} />}
                      {technology.name}
                    </span>
                  ))}
                </div>
                : <p>No technologies have been added yet.</p>}
            </div>
          </section>
          <section className="project-detail-media-section">
            <span>07</span>
            <div>
              <h2>Project Images and Videos</h2>
              {media.length > 0
                ? <div className="project-detail-media">
                  {media.map((item, index) => item.type === "video"
                    ? <video controls key={`${item.url}-${index}`} preload="metadata" src={item.url}>
                      Your browser does not support video playback.
                    </video>
                    : <img alt={`${project.title} project media ${index + 1}`} key={`${item.url}-${index}`} loading="lazy" src={item.url} />)}
                </div>
                : <p>No project media has been added yet.</p>}
            </div>
          </section>
        </div>
        {(project.liveUrl || project.githubUrl || project.linkedinUrl) && (
          <div aria-label="Project links" className="project-detail-links">
            <h2>Project Links</h2>
            {project.liveUrl && <a href={project.liveUrl} rel="noopener noreferrer" target="_blank"><Globe2 size={16} /> Live project <ArrowUpRight size={15} /></a>}
            {project.githubUrl && <a href={project.githubUrl} rel="noopener noreferrer" target="_blank"><Github size={16} /> GitHub <ArrowUpRight size={15} /></a>}
            {project.linkedinUrl && <a href={project.linkedinUrl} rel="noopener noreferrer" target="_blank"><Linkedin size={16} /> LinkedIn <ArrowUpRight size={15} /></a>}
          </div>
        )}
      </article>
    </main>
  );
}

function CertificateDetailsPage({ certificate }: { certificate: Certificate }) {
  return (
    <main className="portfolio-page project-page">
      <article aria-labelledby="certificate-detail-title" className="project-detail-page">
        <a className="project-detail-back" href="/#certificates">← Back to certificates</a>
        <p className="eyebrow">CERTIFICATE</p>
        <h1 id="certificate-detail-title">{certificate.title}</h1>
        <p className="project-detail-owner">
          {[certificate.issuer, certificate.year].filter(Boolean).join(" · ")}
        </p>
        <div className="project-detail-sections">
          <section>
            <span>01</span>
            <div>
              <h2>About this certificate</h2>
              <p>{certificate.description || "No information has been added yet."}</p>
            </div>
          </section>
          <section className="project-detail-media-section">
            <span>02</span>
            <div>
              <h2>Certificate image</h2>
              {certificate.image
                ? <div className="project-detail-media">
                  <img alt={`${certificate.title} certificate`} src={certificate.image} />
                </div>
                : <p>No certificate image has been added yet.</p>}
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}

function ExperienceDetailsPage({ experience }: { experience: Experience }) {
  const details = [experience.company, experience.location, experience.year].filter(Boolean);

  return (
    <main className="portfolio-page project-page">
      <article aria-labelledby="experience-detail-title" className="project-detail-page">
        <a className="project-detail-back" href="/#experience">← Back to experiences</a>
        <p className="eyebrow">EXPERIENCE</p>
        <h1 id="experience-detail-title">{experience.role}</h1>
        {details.length > 0 && <p className="project-detail-owner">{details.join(" · ")}</p>}
        <div className="project-detail-sections">
          <section>
            <span>01</span>
            <div>
              <h2>Experience details</h2>
              <p>{experience.desc || "No information has been added yet."}</p>
            </div>
          </section>
          <section className="project-detail-media-section">
            <span>02</span>
            <div>
              <h2>Experience image</h2>
              {experience.image
                ? <div className="project-detail-media">
                  <img alt={`${experience.role} experience`} src={experience.image} />
                </div>
                : <p>No experience image has been added yet.</p>}
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}

function ExperiencePostDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const canToggle = text.length > 180;

  return (
    <div className="experience-post-copy">
      <p className={expanded ? "experience-post-description is-expanded" : "experience-post-description"}>
        {text}
      </p>
      {canToggle && (
        <button
          aria-expanded={expanded}
          className="experience-post-toggle"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}

function App() {
  const [portfolio, setPortfolio] = useState<PortfolioContent | null>(getCachedPortfolio);
  const [portfolioLoadError, setPortfolioLoadError] = useState("");
  const [portfolioRetry, setPortfolioRetry] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>("aurora");
  const [containerMode, setContainerMode] = useState<ContainerMode>("compact");
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("portfolio-theme");
      if (savedTheme !== null) setDarkMode(savedTheme === "dark");
      const savedAccentTheme = window.localStorage.getItem("portfolio-accent-theme");
      if (isAccentTheme(savedAccentTheme)) setAccentTheme(savedAccentTheme);
      const savedContainerMode = window.localStorage.getItem("portfolio-container-mode");
      if (isContainerMode(savedContainerMode)) setContainerMode(savedContainerMode);
    } catch {
      setToast({
        title: "Theme preference could not be loaded",
        detail: "The default dark theme will be used for this visit.",
      });
    }
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    const root = document.documentElement;
    root.dataset.portfolioTheme = darkMode ? "dark" : "light";
    root.dataset.accentTheme = accentTheme;
    root.dataset.containerMode = containerMode;
    try {
      window.localStorage.setItem("portfolio-theme", darkMode ? "dark" : "light");
      window.localStorage.setItem("portfolio-accent-theme", accentTheme);
      window.localStorage.setItem("portfolio-container-mode", containerMode);
    } catch {
      setToast({
        title: "Display preferences could not be saved",
        detail: "Your selected colors and layout will reset when you leave this page.",
      });
    }
    return () => {
      delete root.dataset.portfolioTheme;
      delete root.dataset.accentTheme;
      delete root.dataset.containerMode;
    };
  }, [accentTheme, containerMode, darkMode, themeReady]);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const loadPortfolio = () => {
      controller?.abort();
      controller = new AbortController();
      setPortfolioLoadError("");
      fetch(apiUrl("/api/portfolio"), { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Portfolio content could not be loaded.");
          const content = (await response.json()) as PortfolioContent;
          if (!active) return;
          setPortfolio(resolvePortfolioMedia(content));
          cachePortfolio(content);
        })
        .catch((error: unknown) => {
          if (!active || (error instanceof Error && error.name === "AbortError")) return;
          const detail = error instanceof Error ? error.message : "The saved portfolio could not be loaded.";
          setPortfolioLoadError(detail);
          setToast({
            title: "Portfolio unavailable",
            detail,
          });
        });
    };
    loadPortfolio();
    const unsubscribe = subscribeToPortfolioUpdates(loadPortfolio);
    return () => {
      active = false;
      controller?.abort();
      unsubscribe();
    };
  }, [portfolioRetry]);

  useEffect(() => {
    let visitorId: string;
    try {
      visitorId = window.sessionStorage.getItem("portfolio-visitor-session") ?? crypto.randomUUID();
      window.sessionStorage.setItem("portfolio-visitor-session", visitorId);
    } catch (error) {
      console.warn("Anonymous visitor analytics could not access session storage:", error);
      visitorId = crypto.randomUUID();
    }

    void fetch(apiUrl("/api/visits"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
    }).catch((error: unknown) => {
      console.warn("Anonymous visitor analytics could not be recorded:", error);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const projectRouteId = /^\/projects\/([a-z0-9][a-z0-9-]{0,99})\/?$/.exec(window.location.pathname)?.[1];
  const certificateRouteIndex = /^\/certificates\/(\d+)\/?$/.exec(window.location.pathname)?.[1];
  const experienceRouteIndex = /^\/experiences\/(\d+)\/?$/.exec(window.location.pathname)?.[1];
  const isProjectRoute = window.location.pathname.startsWith("/projects/");
  const isCertificateRoute = window.location.pathname.startsWith("/certificates/");
  const isExperienceRoute = window.location.pathname.startsWith("/experiences/");
  const routeProject = portfolio && projectRouteId
    ? portfolio.projectsSection.projects.find((project) => project.id === projectRouteId && project.visible)
    : undefined;
  const routeCertificate = portfolio && certificateRouteIndex !== undefined
    ? portfolio.certificates[Number(certificateRouteIndex)]
    : undefined;
  const routeExperience = portfolio && experienceRouteIndex !== undefined
    ? portfolio.experience[Number(experienceRouteIndex)]
    : undefined;

  useEffect(() => {
    if (!portfolio) return;
    const profile = portfolio.about;
    const detailTitle = routeProject?.title ?? routeCertificate?.title ?? routeExperience?.role;
    const pageTitle = detailTitle
      ? `${detailTitle} — ${profile.profileName} — Portfolio`
      : `${profile.profileName} — Portfolio`;
    const pageDescription = routeProject
      ? routeProject.projectDescription || routeProject.fullDescription || routeProject.description
      : routeCertificate
      ? routeCertificate.description
      : routeExperience
      ? routeExperience.desc
      : profile.profileDescription ||
      `Explore ${profile.profileName}'s portfolio, projects, skills, and professional experience.`;
    const imageUrl = new URL("/abdilahi-portfolio.png", window.location.origin).href;
    document.title = pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      pageDescription,
    );
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", pageTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", pageDescription);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", window.location.href);
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", imageUrl);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", pageTitle);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", pageDescription);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", imageUrl);
  }, [portfolio, routeCertificate, routeExperience, routeProject]);

  if (!portfolio) {
    return (
      <main className="portfolio-page">
        <section
          aria-live="polite"
          className="portfolio-load-state"
          role={portfolioLoadError ? "alert" : "status"}
        >
          <h1>{portfolioLoadError ? "Portfolio unavailable" : "Loading portfolio..."}</h1>
          {portfolioLoadError && (
            <>
              <p>{portfolioLoadError}</p>
              <button onClick={() => setPortfolioRetry((attempt) => attempt + 1)} type="button">
                Try again
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  const profile = portfolio.about;
  const projects = portfolio.projectsSection.projects.filter((project) => project.visible);
  const skills = portfolio.skillsSection.skills;
  const socials = portfolio.contact.socials.filter((social) =>
    !isLinkedInProfile(social) || isValidLinkedInUrl(social.url),
  );

  if (isProjectRoute) {
    if (!routeProject) {
      return (
        <main className="portfolio-page project-page">
          <section className="project-detail-page project-not-found">
            <h1>Project not found</h1>
            <p>This project may have been removed or is no longer published.</p>
            <a className="project-detail-back" href="/#projects">Back to projects</a>
          </section>
        </main>
      );
    }
    return <ProjectDetailsPage profileName={profile.profileName} project={routeProject} />;
  }

  if (isCertificateRoute) {
    if (!routeCertificate) {
      return (
        <main className="portfolio-page project-page">
          <section className="project-detail-page project-not-found">
            <h1>Certificate not found</h1>
            <p>This certificate may have been removed or is no longer available.</p>
            <a className="project-detail-back" href="/#certificates">Back to certificates</a>
          </section>
        </main>
      );
    }
    return <CertificateDetailsPage certificate={routeCertificate} />;
  }

  if (isExperienceRoute) {
    if (!routeExperience) {
      return (
        <main className="portfolio-page project-page">
          <section className="project-detail-page project-not-found">
            <h1>Experience not found</h1>
            <p>This experience may have been removed or is no longer available.</p>
            <a className="project-detail-back" href="/#experience">Back to experiences</a>
          </section>
        </main>
      );
    }
    return <ExperienceDetailsPage experience={routeExperience} />;
  }

  return (
    <main className="portfolio-page portfolio-home">
      <section aria-label="Profile" className="profile" id="profile">
        <div className="profile-content">
          <div className="profile-avatar-frame">
            {profile.photo
              ? <img alt={`${profile.profileName} profile`} className="profile-avatar" src={profile.photo} />
              : <span aria-label={`${profile.profileName} profile photo`} className="profile-avatar-fallback">
                {profile.profileName.slice(0, 1).toUpperCase()}
              </span>}
          </div>
          {profile.location && (
            <p className="profile-location"><MapPin size={13} /> {profile.location}</p>
          )}
          <div className="profile-name">
            <div className="profile-name-row">
              <h1>{profile.profileName}</h1>
            </div>
            {profile.title && <p>{profile.title}</p>}
          </div>
        </div>
      </section>

      <div className="portfolio-intro-grid">
        <section aria-label="About" className="about-panel" id="about">
          <p className="eyebrow">{profile.label || "A LITTLE ABOUT ME"}</p>
          <div className="about-rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(profile.bio || profile.profileDescription) }} />
          {profile.values.length > 0 && (
            <div className="about-values">
              {profile.values.map((value) => <span key={value.title}>{value.title}</span>)}
            </div>
          )}
        </section>

        <section aria-labelledby="summary-title" className="summary-section">
          <div className="summary-heading">
            <p className="eyebrow">{profile.snapshotLabel || "PORTFOLIO SNAPSHOT"}</p>
            <h2 id="summary-title">{profile.snapshotTitle || "At a glance"}</h2>
          </div>
          <div className="summary-grid">
            <article className="summary-card">
              <span className="summary-icon"><FolderKanban size={18} /></span>
              <span className="summary-label">{profile.projectCountLabel || "Projects"}</span>
              <strong>{projects.length.toString().padStart(2, "0")}</strong>
            </article>
            <article className="summary-card">
              <span className="summary-icon"><Code2 size={18} /></span>
              <span className="summary-label">{profile.skillCountLabel || "Skills"}</span>
              <strong>{skills.length.toString().padStart(2, "0")}</strong>
            </article>
            <article className="summary-card">
              <span className="summary-icon"><ExternalLink size={18} /></span>
              <span className="summary-label">{profile.socialCountLabel || "Social links"}</span>
              <strong>{socials.length.toString().padStart(2, "0")}</strong>
            </article>
            <article className="summary-card">
              <span className="summary-icon"><Award size={18} /></span>
              <span className="summary-label">Certificates</span>
              <strong>{portfolio.certificates.length.toString().padStart(2, "0")}</strong>
            </article>
            <article className="summary-card">
              <span className="summary-icon"><Briefcase size={18} /></span>
              <span className="summary-label">Experiences</span>
              <strong>{portfolio.experience.length.toString().padStart(2, "0")}</strong>
            </article>
          </div>
        </section>
      </div>

      <section aria-labelledby="projects-title" className="projects-section" id="projects">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{portfolio.projectsSection.label}</p>
            <h2 id="projects-title">{portfolio.projectsSection.title}</h2>
            {portfolio.projectsSection.description && <div className="section-description rich-section-description" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(portfolio.projectsSection.description) }} />}
          </div>
          <span className="project-count">{projects.length.toString().padStart(2, "0")}</span>
        </div>

        {projects.length > 0 ? (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id || project.title}>
                <a aria-label={`View ${project.title} project details`} className="project-card-main" href={`/projects/${project.id}`}>
                  <div className="project-image-wrap">
                    {project.image
                      ? <img alt={`${project.title} preview`} className="project-image" loading="lazy" src={project.image} />
                      : <div aria-label="Project preview not added" className="project-image-placeholder" role="img"><span>Project preview</span></div>}
                  </div>
                  <div className="project-content">
                    <div className="project-title-row">
                      <div>
                        <h3>{project.title}</h3>
                      </div>
                      <ArrowUpRight size={17} />
                    </div>
                    {project.tags.length > 0 && <div className="project-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                  </div>
                </a>
                <div className="project-content project-card-links">
                  <div className="project-links">
                  {project.liveUrl && (
                    <a href={project.liveUrl} rel="noopener noreferrer" target="_blank">
                      <Globe2 size={16} /> Live Demo <ArrowUpRight size={14} />
                    </a>
                  )}
                  {project.githubUrl && (
                      <a href={project.githubUrl} rel="noopener noreferrer" target="_blank">
                        <Github size={16} /> GitHub <ArrowUpRight size={14} />
                      </a>
                    )}
                    {project.linkedinUrl && (
                      <a href={project.linkedinUrl} rel="noopener noreferrer" target="_blank">
                        <Linkedin size={16} /> LinkedIn <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-projects">
            <span className="empty-mark">+</span>
            <h3>Your project showcase starts here</h3>
            <p>Add a project preview, short description, and repository or LinkedIn link.</p>
            <a className="empty-action" href="/admin">Add your first project <ArrowUpRight size={15} /></a>
          </div>
        )}
      </section>

      <section aria-labelledby="certificates-title" className="projects-section" id="certificates">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CERTIFICATES</p>
            <h2 id="certificates-title">Certificates</h2>
          </div>
        </div>
        {portfolio.certificates.length > 0 ? (
          <div className="project-grid">
            {portfolio.certificates.map((certificate, index) => (
              <article className="project-card" key={`${certificate.title}-${certificate.issuer}-${certificate.year}`}>
                <a aria-label={`View ${certificate.title} certificate details`} className="project-card-main" href={`/certificates/${index}`}>
                  <div className="project-image-wrap">
                    {certificate.image
                      ? <img alt={`${certificate.title} certificate`} className="project-image" loading="lazy" src={certificate.image} />
                      : <div aria-label="Certificate image not added" className="project-image-placeholder" role="img"><span>Certificate</span></div>}
                  </div>
                  <div className="project-content">
                    <div className="project-title-row">
                      <div><h3>{certificate.title}</h3></div>
                      <ArrowUpRight size={17} />
                    </div>
                    {certificate.issuer && <p className="project-description">{certificate.issuer}</p>}
                    {certificate.year && <div className="project-tags"><span>{certificate.year}</span></div>}
                  </div>
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="section-empty">Certificates will appear here when added.</p>
        )}
      </section>

      <section aria-labelledby="experience-title" className="projects-section" id="experience">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPERIENCE</p>
            <h2 id="experience-title">Experiences</h2>
          </div>
          <span className="project-count">{portfolio.experience.length.toString().padStart(2, "0")}</span>
        </div>
        {portfolio.experience.length > 0 ? (
          <div className="experience-post-feed">
            {portfolio.experience.map((experience, index) => (
              <article className="experience-post-card" key={`${experience.role}-${experience.company}-${experience.year}`}>
                <header className="experience-post-header">
                  <span aria-hidden="true" className="experience-post-icon"><Briefcase size={20} /></span>
                  <div className="experience-post-heading">
                    <h3>{experience.role}</h3>
                    {experience.company && <p className="experience-post-company">{experience.company}</p>}
                    {[experience.year, experience.location].filter(Boolean).length > 0 && (
                      <p className="experience-post-meta">{[experience.year, experience.location].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                </header>
                {experience.desc && <ExperiencePostDescription text={experience.desc} />}
                {experience.image && (
                  <img alt={`${experience.role} experience`} className="experience-post-image" loading="lazy" src={experience.image} />
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="section-empty">Experiences will appear here when added.</p>
        )}
      </section>

      <section aria-labelledby="skills-title" className="skills-section" id="skills">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{portfolio.skillsSection.label}</p>
            <h2 id="skills-title">{portfolio.skillsSection.title}</h2>
            {portfolio.skillsSection.description && <div className="section-description rich-section-description" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(portfolio.skillsSection.description) }} />}
          </div>
        </div>
        {skills.length > 0 ? (
          <div className="skill-groups">
            {skillGroups.map((group) => {
              const groupedSkills = skills.filter((skill) => skill.category === group);
              if (groupedSkills.length === 0) return null;
              return (
                <section aria-label={`${group} skills`} className="skill-group" key={group}>
                  <h3 className="skill-group-title">{group}</h3>
                  <div className="skills-chip-list">
                    {groupedSkills.map((skill) => {
                      const Icon = icons[skill.icon] ?? ExternalLink;
                      const iconColor = programmingIconColor(skill.icon, skill.color);
                      return (
                        <span className="skill-chip" key={skill.name}>
                          <span aria-hidden="true" className="skill-chip-icon" style={{
                            color: iconColor,
                            backgroundColor: programmingIconBackground(skill.icon) ?? "#292524",
                          }}>
                              {isProgrammingLanguageIcon(skill.icon)
                                ? <ProgrammingLanguageIcon name={skill.icon} size={16} color={iconColor} />
                                : <Icon size={16} strokeWidth={1.8} />}
                          </span>
                          <span>{skill.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="section-empty">Skills will appear here when added.</p>
        )}
      </section>

      <section aria-labelledby="contact-title" className="contact-section" id="contact">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{portfolio.contact.label || "CONNECT"}</p>
            <h2 id="contact-title">{portfolio.contact.title || portfolio.contact.socialTitle}</h2>
            {portfolio.contact.description && <div className="section-description rich-section-description" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(portfolio.contact.description) }} />}
          </div>
        </div>
        <div className="contact-grid">
          <div className="contact-details">
            {portfolio.contact.availabilityTitle && (
              <article className="availability-card">
                <span className="availability-indicator" />
                <div>
                  <h3>{portfolio.contact.availabilityTitle}</h3>
                  {portfolio.contact.availabilityDescription && <p>{portfolio.contact.availabilityDescription}</p>}
                </div>
              </article>
            )}
            {portfolio.contact.email && (
              <a
                aria-label={`Send email to ${portfolio.contact.email}`}
                className="contact-email-card"
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(portfolio.contact.email)}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="contact-icon"><Mail size={18} /></span>
                <span><small>{portfolio.contact.emailLabel || "Send email"}</small><strong>{portfolio.contact.email}</strong></span>
                <Copy aria-hidden="true" size={16} />
              </a>
            )}
            {portfolio.contact.location && (
              <p className="contact-location"><MapPin size={16} /> {portfolio.contact.location}</p>
            )}
            {socials.length > 0 && (
              <div aria-label={portfolio.contact.socialTitle || "Social profiles"} className="socials-grid" id="socials">
                {socials.map((social) => {
                  const url = social.url ?? "";
                  const icon = socialIconForUrl(url) ?? social.icon;
                  const Icon = icons[icon] ?? ExternalLink;
                  const isSocialBrand = socialIconOptions.some((option) => option.name === icon);
                  return (
                    <a aria-label={`Open ${social.name} profile in a new tab`} className="social-card" href={url} key={`${social.name}-${url}`} rel="noopener noreferrer" target="_blank">
                      <span className={`social-icon social-icon-${icon.toLowerCase()}`}>
                        {isSocialBrand
                          ? <SocialBrandIcon name={icon} size={19} />
                          : <Icon size={19} strokeWidth={1.8} />}
                      </span>
                      <span className="social-name">{social.name}</span>
                      <ArrowUpRight className="social-arrow" size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>

      <footer className="page-footer">
        <span>{portfolio.footer.copyright || `© ${new Date().getFullYear()} ${profile.profileName}`}</span>
        <a href="#profile"><Home size={14} /> Back to top</a>
      </footer>

      <nav aria-label="Main navigation" className="quick-nav">
        <a href="#about">About</a>
        <a href="#projects">Projects</a>
        <a href="#certificates">Certificates</a>
        <a href="#experience">Experiences</a>
        <a href="#skills">Skills</a>
        <a href="#contact">Contact</a>
        <button
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setDarkMode((enabled) => !enabled)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          type="button"
        >
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span>{darkMode ? "Light" : "Dark"}</span>
        </button>
        <button
          aria-label={containerMode === "boxed" ? "Use compact container" : "Use boxed frame"}
          aria-pressed={containerMode === "boxed"}
          onClick={() => setContainerMode((mode) => mode === "compact" ? "boxed" : "compact")}
          title={containerMode === "boxed" ? "Use compact container" : "Use boxed frame"}
          type="button"
        >
          <Layers3 size={14} />
          <span>{containerMode === "boxed" ? "Boxed" : "Compact"}</span>
        </button>
      </nav>

      {toast && (
        <div aria-live="polite" className="toast" role="status">
          <strong>{toast.title}</strong>
          {toast.detail && <span>{toast.detail}</span>}
          {portfolioLoadError && (
            <button
              className="toast-action"
              onClick={() => setPortfolioRetry((attempt) => attempt + 1)}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default App;
