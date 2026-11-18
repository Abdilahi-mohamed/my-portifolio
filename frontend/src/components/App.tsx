"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Award,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Code2,
  ExternalLink,
  Figma,
  Facebook,
  Github,
  Globe2,
  Layers3,
  KeyRound,
  Linkedin,
  Instagram,
  MapPin,
  MessageCircle,
  Monitor,
  MoreVertical,
  Moon,
  Palette,
  Pencil,
  FolderKanban,
  Send,
  Sun,
  Terminal,
  X as XIcon,
  Zap,
} from "lucide-react";
import { SocialBrandIcon, socialIconForUrl, socialIconOptions } from "./socialIcons";
import { adminLogin, changeAdminPassword } from "./admin/adminApi";
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

type ToastMessage = { title: string; detail?: string };
type Project = PortfolioContent["projectsSection"]["projects"][number];

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
                        ? <ProgrammingLanguageIcon color={programmingIconColor(technology.icon, "#56665c")} name={technology.icon} size={19} />
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

function App() {
  const [portfolio, setPortfolio] = useState<PortfolioContent | null>(getCachedPortfolio);
  const [portfolioLoadError, setPortfolioLoadError] = useState("");
  const [portfolioRetry, setPortfolioRetry] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem("portfolio-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    document.documentElement.dataset.portfolioTheme = darkMode ? "dark" : "light";
    try {
      window.localStorage.setItem("portfolio-theme", darkMode ? "dark" : "light");
    } catch {
      setToast({
        title: "Theme preference could not be saved",
        detail: "Your selected theme will be reset when you leave this page.",
      });
    }
    return () => {
      delete document.documentElement.dataset.portfolioTheme;
    };
  }, [darkMode]);

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

  useEffect(() => {
    if (!passwordDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !passwordBusy) setPasswordDialogOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [passwordBusy, passwordDialogOpen]);

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    if (newPassword.length < 7) {
      setPasswordError("Use at least 7 characters for your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      await adminLogin(adminUsername, currentPassword);
      const message = await changeAdminPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(message);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Could not change the admin password.");
    } finally {
      setPasswordBusy(false);
    }
  };

  const projectRouteId = /^\/projects\/([a-z0-9][a-z0-9-]{0,99})\/?$/.exec(window.location.pathname)?.[1];
  const isProjectRoute = window.location.pathname.startsWith("/projects/");
  const routeProject = portfolio && projectRouteId
    ? portfolio.projectsSection.projects.find((project) => project.id === projectRouteId && project.visible)
    : undefined;

  useEffect(() => {
    if (!portfolio) return;
    const profile = portfolio.about;
    const pageTitle = routeProject
      ? `${routeProject.title} — ${profile.profileName} — Portfolio`
      : `${profile.profileName} — Portfolio`;
    const pageDescription = routeProject
      ? routeProject.projectDescription || routeProject.fullDescription || routeProject.description
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
  }, [portfolio, routeProject]);

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
  const experience = portfolio.experience;
  const certificates = portfolio.certificates ?? [];
  const socials = portfolio.contact.socials;

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

  return (
    <main className="portfolio-page">
      <header className="topbar">
        <a className="wordmark" href="#profile">{profile.profileName}</a>
        <details className="portfolio-menu">
          <summary aria-label="More portfolio options" title="More options">
            <MoreVertical size={19} />
          </summary>
          <div className="portfolio-menu-items">
            <a href="/admin"><Pencil size={16} /> Edit portfolio settings</a>
            <a href="/admin/analytics"><Monitor size={16} /> Visitor analytics</a>
            <button onClick={() => setDarkMode((enabled) => !enabled)} type="button">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              {darkMode ? "Light mode" : "Dark mode"}
            </button>
            <button
              onClick={() => {
                setPasswordError("");
                setPasswordNotice("");
                setPasswordDialogOpen(true);
              }}
              type="button"
            >
              <KeyRound size={16} /> Change password
            </button>
          </div>
        </details>
        <nav aria-label="Portfolio sections" className="topbar-actions">
          <a className="topbar-nav-link" href="#projects">Projects</a>
          <a className="topbar-nav-link" href="#skills">Skills</a>
          <a className="topbar-nav-link" href="#socials">Social profiles</a>
        </nav>
      </header>

      <section aria-label="Profile" className="profile" id="profile">
        <div className="profile-content">
          <div className="profile-avatar-frame">
            {profile.photo
              ? <img alt={`${profile.profileName} profile`} className="profile-avatar" src={profile.photo} />
              : <span aria-label={`${profile.profileName} profile photo`} className="profile-avatar-fallback">
                {profile.profileName.slice(0, 1).toUpperCase()}
              </span>}
          </div>
          <div className="profile-copy">
            <p className="eyebrow">PORTFOLIO</p>
            <h1>{profile.profileName}</h1>
            <p className="profile-role">{profile.profileRole}</p>
            {profile.profileDescription && <p className="profile-bio">{profile.profileDescription}</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="summary-title" className="summary-section">
        <div className="summary-heading">
          <p className="eyebrow">AT A GLANCE</p>
          <h2 id="summary-title">Summary</h2>
        </div>
        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-icon"><FolderKanban size={19} /></span>
            <span className="summary-label">Projects</span>
            <strong>{projects.length.toString().padStart(2, "0")}</strong>
            <small>Projects in my portfolio</small>
          </article>
          <article className="summary-card">
            <span className="summary-icon"><Code2 size={19} /></span>
            <span className="summary-label">Programming Languages</span>
            <strong>{skills.length.toString().padStart(2, "0")}</strong>
            <small>Frontend, Backend, Databases & Tools</small>
          </article>
          <article className="summary-card">
            <span className="summary-icon"><ExternalLink size={19} /></span>
            <span className="summary-label">Social profiles</span>
            <strong>{socials.length.toString().padStart(2, "0")}</strong>
            <small>Profiles in my portfolio</small>
          </article>
        </div>
      </section>

      <section aria-labelledby="projects-title" className="projects-section" id="projects">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{portfolio.projectsSection.label}</p>
            <h2 id="projects-title">{portfolio.projectsSection.title}</h2>
            {portfolio.projectsSection.description && <p className="section-description">{portfolio.projectsSection.description}</p>}
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
                  <div className="project-content"><h3>{project.title}</h3></div>
                </a>
                <div className="project-content project-card-links">
                  <p className="project-ownership">{project.ownershipLabel?.trim() || "Personal Project"}</p>
                  <div className="project-links">
                  {project.liveUrl && (
                    <a href={project.liveUrl} rel="noopener noreferrer" target="_blank">
                      <Globe2 size={16} /> Live project <ArrowUpRight size={14} />
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

      <section aria-labelledby="skills-title" className="skills-section" id="skills">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{portfolio.skillsSection.label}</p>
            <h2 id="skills-title">{portfolio.skillsSection.title}</h2>
            {portfolio.skillsSection.description && <p className="section-description">{portfolio.skillsSection.description}</p>}
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
                  <div className="skills-grid">
                    {groupedSkills.map((skill) => {
                      const Icon = icons[skill.icon] ?? ExternalLink;
                      const iconColor = programmingIconColor(skill.icon, skill.color);
                      return (
                        <article className="skill-card" key={skill.name}>
                          <div className="skill-icon" style={{
                            color: iconColor,
                            backgroundColor: programmingIconBackground(skill.icon) ?? "#EFE9E3",
                          }}>
                              {isProgrammingLanguageIcon(skill.icon)
                                ? <ProgrammingLanguageIcon name={skill.icon} size={21} color={iconColor} />
                                : <Icon size={21} strokeWidth={1.8} />}
                          </div>
                          <div className="skill-card-copy">
                            <div className="skill-card-heading">
                              <h3>{skill.name}</h3>
                              <span className="skill-level">{skill.level}</span>
                            </div>
                            <div aria-label={`${skill.name} ${skill.level}`} className="skill-meter" role="img">
                            <span style={{ width: skill.level, backgroundColor: skill.color }} />
                            </div>
                          </div>
                        </article>
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

      <section aria-labelledby="socials-title" className="socials-section" id="socials">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{portfolio.contact.label || "CONNECT"}</p>
            <h2 id="socials-title">{portfolio.contact.socialTitle}</h2>
            {portfolio.contact.description && <p className="section-description">{portfolio.contact.description}</p>}
          </div>
        </div>
        {socials.length > 0 ? (
          <div className="socials-grid">
            {socials.map((social) => {
              const icon = socialIconForUrl(social.url) ?? social.icon;
              const Icon = icons[icon] ?? ExternalLink;
              const isSocialBrand = socialIconOptions.some((option) => option.name === icon);
              return (
                <a aria-label={`Open ${social.name} profile in a new tab`} className="social-card" href={social.url} key={`${social.name}-${social.url}`} rel="noopener noreferrer" target="_blank">
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
        ) : (
          <p className="section-empty">Social profiles will appear here when added.</p>
        )}
      </section>

      <footer className="page-footer">
        <span>© {new Date().getFullYear()} {profile.profileName}</span>
        <a href="#profile">Back to top <ArrowUpRight size={14} /></a>
      </footer>

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
      {passwordDialogOpen && (
        <div
          className="password-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !passwordBusy) {
              setPasswordDialogOpen(false);
            }
          }}
        >
          <section aria-labelledby="password-dialog-title" aria-modal="true" className="password-dialog" role="dialog">
            <button
              aria-label="Close change password dialog"
              className="password-dialog-close"
              disabled={passwordBusy}
              onClick={() => setPasswordDialogOpen(false)}
              type="button"
            >
              <XIcon size={18} />
            </button>
            <span className="password-dialog-kicker">ADMIN ACCOUNT</span>
            <h2 id="password-dialog-title">Change password</h2>
            <p>Verify your admin credentials before choosing a new password.</p>
            <form onSubmit={(event) => { void submitPasswordChange(event); }}>
              <label>
                Username
                <input autoComplete="username" autoFocus onChange={(event) => setAdminUsername(event.target.value)} required value={adminUsername} />
              </label>
              <label>
                Current password
                <input autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} />
              </label>
              <label>
                New password
                <input autoComplete="new-password" maxLength={128} minLength={7} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} />
                <small>Use at least 7 characters.</small>
              </label>
              <label>
                Confirm new password
                <input autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
              </label>
              {passwordError && <p className="password-dialog-error" role="alert">{passwordError}</p>}
              {passwordNotice && <p className="password-dialog-notice" role="status">{passwordNotice}</p>}
              <button className="password-dialog-submit" disabled={passwordBusy} type="submit">
                {passwordBusy ? "Changing password..." : "Change password"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
