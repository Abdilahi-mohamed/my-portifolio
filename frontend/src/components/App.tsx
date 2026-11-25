"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  Check,
  Code2,
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

function ProjectLiveIcon({ url, size = 16 }: { url: string; size?: number }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  let faviconUrl: string | null = null;
  try {
    const liveUrl = new URL(url);
    if (liveUrl.protocol === "https:" || liveUrl.protocol === "http:") {
      faviconUrl = `${liveUrl.origin}/favicon.ico`;
    }
  } catch {
    faviconUrl = null;
  }

  if (!faviconUrl || failedUrl === faviconUrl) {
    return <Globe2 aria-hidden="true" size={size} />;
  }
  return (
    <img
      alt=""
      className="project-live-favicon"
      height={size}
      onError={() => setFailedUrl(faviconUrl)}
      referrerPolicy="no-referrer"
      src={faviconUrl}
      width={size}
    />
  );
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

type GitHubContribution = { date: string; count: number; level: number };
type GitHubContributionWeek = { days: (GitHubContribution | null)[]; monthLabel: string };
type GitHubActivityData = { total: number; weeks: GitHubContributionWeek[] };

function isGitHubContribution(value: unknown): value is GitHubContribution {
  if (!value || typeof value !== "object") return false;
  const contribution = value as Record<string, unknown>;
  return typeof contribution.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(contribution.date)
    && Number.isFinite(Date.parse(`${contribution.date}T00:00:00Z`))
    && typeof contribution.count === "number"
    && Number.isFinite(contribution.count)
    && contribution.count >= 0
    && typeof contribution.level === "number"
    && Number.isInteger(contribution.level)
    && contribution.level >= 0
    && contribution.level <= 4;
}

function isGitHubContributionsResponse(value: unknown): value is {
  total: { lastYear: number };
  contributions: GitHubContribution[];
} {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  if (!response.total || typeof response.total !== "object") return false;
  const total = response.total as Record<string, unknown>;
  return typeof total.lastYear === "number"
    && Number.isFinite(total.lastYear)
    && Array.isArray(response.contributions)
    && response.contributions.length > 0
    && response.contributions.every(isGitHubContribution);
}

function groupGitHubContributionsByWeek(contributions: GitHubContribution[]): GitHubContributionWeek[] {
  const weeks: GitHubContributionWeek[] = [];
  let currentWeek: GitHubContributionWeek | undefined;
  let currentMonth = "";

  for (const contribution of contributions) {
    const date = new Date(`${contribution.date}T00:00:00Z`);
    const dayOfWeek = date.getUTCDay();
    if (!currentWeek || dayOfWeek === 0) {
      if (currentWeek) weeks.push(currentWeek);
      currentWeek = { days: Array.from({ length: 7 }, () => null), monthLabel: "" };
    }

    const month = contribution.date.slice(0, 7);
    if (month !== currentMonth) {
      currentWeek.monthLabel = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      currentMonth = month;
    }
    currentWeek.days[dayOfWeek] = contribution;
  }

  if (currentWeek) weeks.push(currentWeek);
  return weeks;
}

function GitHubActivity() {
  const [graphState, setGraphState] = useState<"loading" | "loaded" | "unavailable">("loading");
  const [activity, setActivity] = useState<GitHubActivityData | null>(null);

  useEffect(() => {
    let activeController: AbortController | null = null;
    let hasLoadedActivity = false;

    const loadActivity = () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      fetch("https://github-contributions-api.jogruber.de/v4/Abdilahi-mohamed?y=last", {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`GitHub contributions request failed (${response.status}).`);
          const data: unknown = await response.json();
          if (!isGitHubContributionsResponse(data)) {
            throw new Error("GitHub contributions response was invalid.");
          }
          setActivity({
            total: data.total.lastYear,
            weeks: groupGitHubContributionsByWeek(data.contributions),
          });
          hasLoadedActivity = true;
          setGraphState("loaded");
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          console.error("Could not load GitHub contribution activity.", cause);
          if (!hasLoadedActivity) setGraphState("unavailable");
        });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadActivity();
    };
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadActivity();
    }, 5 * 60 * 1000);

    document.addEventListener("visibilitychange", refreshWhenVisible);
    loadActivity();

    return () => {
      activeController?.abort();
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return (
    <section aria-labelledby="github-activity-title" className="github-activity-section" id="github-activity">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONTRIBUTIONS</p>
          <h2 id="github-activity-title">GitHub Activity</h2>
        </div>
      </div>
      <div className="github-activity-graph-frame">
        {graphState === "loading" && (
          <div className="github-activity-loading" role="status">
            <span aria-hidden="true" />
            <span>Loading GitHub contribution graph...</span>
          </div>
        )}
        {graphState === "unavailable" ? (
          <p className="github-activity-fallback" role="status">
            The contribution graph is temporarily unavailable. Please visit my GitHub profile to view my activity.
          </p>
        ) : activity ? (
          <>
            <a
              className="github-activity-username"
              href="https://github.com/Abdilahi-mohamed"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github aria-hidden="true" size={14} />
              <span>Abdilahi-mohamed</span>
            </a>
            <p className="github-activity-total">
              {activity.total.toLocaleString("en-US")} contributions in the last year
            </p>
            <div aria-label="GitHub contribution calendar" className="github-activity-calendar-scroll" role="region" tabIndex={0}>
              <div
                className="github-activity-calendar"
                style={{ "--github-week-count": activity.weeks.length } as CSSProperties}
              >
                <div className="github-activity-calendar-layout">
                  <div aria-hidden="true" className="github-activity-weekdays">
                    {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => (
                      <span key={index}>{label}</span>
                    ))}
                  </div>
                  <div className="github-activity-calendar-main">
                    <div aria-hidden="true" className="github-activity-months">
                      {activity.weeks.map((week, index) => <span key={index}>{week.monthLabel}</span>)}
                    </div>
                    <div aria-label="Daily contributions" className="github-activity-days" role="grid" aria-rowcount={7} aria-colcount={activity.weeks.length}>
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((dayName, dayIndex) => (
                        <div
                          aria-label={`${dayName} contributions`}
                          className="github-activity-day-row"
                          key={dayName}
                          role="row"
                        >
                          {activity.weeks.map((week, weekIndex) => {
                            const contribution = week.days[dayIndex];
                            return contribution ? (
                              <span
                                aria-label={`${contribution.count} contributions on ${contribution.date}`}
                                className={`github-activity-cell level-${contribution.level}`}
                                key={contribution.date}
                                role="gridcell"
                                title={`${contribution.count} contributions on ${contribution.date}`}
                              />
                            ) : (
                              <span aria-hidden="true" className="github-activity-cell is-empty" key={`${weekIndex}-${dayIndex}`} />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div aria-label="Contribution intensity: less to more" className="github-activity-legend">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((level) => <i aria-hidden="true" className={`github-activity-cell level-${level}`} key={level} />)}
                  <span>More</span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

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
            {project.liveUrl && <a href={project.liveUrl} rel="noopener noreferrer" target="_blank"><ProjectLiveIcon url={project.liveUrl} /> Live project <ArrowUpRight size={15} /></a>}
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

function PortfolioLoadingSkeleton() {
  return (
    <main aria-busy="true" className="portfolio-page portfolio-home portfolio-loading">
      <div aria-label="Loading portfolio" className="portfolio-loading-content" role="status">
        <div aria-hidden="true">
          <section className="portfolio-skeleton-profile">
            <span className="portfolio-skeleton-block portfolio-skeleton-avatar" />
            <span className="portfolio-skeleton-block portfolio-skeleton-name" />
            <span className="portfolio-skeleton-block portfolio-skeleton-role" />
          </section>
          <div className="portfolio-skeleton-intro">
            <section className="portfolio-skeleton-panel">
              <span className="portfolio-skeleton-block portfolio-skeleton-label" />
              <span className="portfolio-skeleton-block portfolio-skeleton-line" />
              <span className="portfolio-skeleton-block portfolio-skeleton-line" />
              <span className="portfolio-skeleton-block portfolio-skeleton-line portfolio-skeleton-line-short" />
            </section>
            <section className="portfolio-skeleton-summary">
              <span className="portfolio-skeleton-block portfolio-skeleton-label" />
              <div className="portfolio-skeleton-summary-grid">
                {Array.from({ length: 5 }, (_, index) => (
                  <span className="portfolio-skeleton-block portfolio-skeleton-summary-card" key={index} />
                ))}
              </div>
            </section>
          </div>
          <section className="portfolio-skeleton-projects">
            <div className="portfolio-skeleton-heading">
              <span className="portfolio-skeleton-block portfolio-skeleton-label" />
              <span className="portfolio-skeleton-block portfolio-skeleton-title" />
            </div>
            <div className="portfolio-skeleton-project-grid">
              {Array.from({ length: 2 }, (_, index) => (
                <article className="portfolio-skeleton-project-card" key={index}>
                  <span className="portfolio-skeleton-block portfolio-skeleton-project-image" />
                  <span className="portfolio-skeleton-block portfolio-skeleton-project-name" />
                  <span className="portfolio-skeleton-block portfolio-skeleton-project-meta" />
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
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
    if (!portfolioLoadError) return <PortfolioLoadingSkeleton />;
    return (
      <main className="portfolio-page">
        <section aria-live="assertive" className="portfolio-load-state" role="alert">
          <h1>Portfolio unavailable</h1>
          <p>{portfolioLoadError}</p>
          <button onClick={() => setPortfolioRetry((attempt) => attempt + 1)} type="button">
            Try again
          </button>
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
                      <ProjectLiveIcon url={project.liveUrl} /> Live Demo <ArrowUpRight size={14} />
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

      <GitHubActivity />

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
            <p className="eyebrow">TECH STACK</p>
            <h2 id="skills-title">Tech Stack</h2>
            {portfolio.skillsSection.description && <div className="section-description rich-section-description" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(portfolio.skillsSection.description) }} />}
          </div>
        </div>
        {skills.length > 0 ? (
          <div className="skills-chip-list">
            {skills.map((skill) => {
              const Icon = icons[skill.icon] ?? ExternalLink;
              const iconColor = programmingIconColor(skill.icon, skill.color);
              return (
                <span className="skill-chip" key={`${skill.category}-${skill.name}`}>
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
            {portfolio.contact.location && (
              <p className="contact-location"><MapPin size={16} /> {portfolio.contact.location}</p>
            )}
            {(portfolio.contact.email || socials.length > 0) && (
              <div aria-label={portfolio.contact.socialTitle || "Social profiles"} className="socials-grid" id="socials">
                {portfolio.contact.email && (
                  <a
                    aria-label={`Email ${portfolio.contact.email}`}
                    className="social-card"
                    href={`mailto:${portfolio.contact.email}`}
                    key="contact-email"
                    title="Email"
                  >
                    <span className="social-icon social-icon-email"><Mail aria-hidden="true" size={19} /></span>
                  </a>
                )}
                {socials.map((social) => {
                  const url = social.url ?? "";
                  const icon = socialIconForUrl(url) ?? social.icon;
                  const Icon = icons[icon] ?? ExternalLink;
                  const isSocialBrand = socialIconOptions.some((option) => option.name === icon);
                  return (
                    <a aria-label={`Open ${social.name} profile in a new tab`} className="social-card" href={url} key={`${social.name}-${url}`} rel="noopener noreferrer" target="_blank" title={social.name}>
                      <span className={`social-icon social-icon-${icon.toLowerCase()}`}>
                        {isSocialBrand
                          ? <SocialBrandIcon name={icon} size={19} />
                          : <Icon size={19} strokeWidth={1.8} />}
                      </span>
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
