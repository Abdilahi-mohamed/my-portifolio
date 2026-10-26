import { useEffect, useState } from "react";
import {
  Award,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
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
  Pencil,
  FolderKanban,
  Send,
  Terminal,
  X as XIcon,
  Zap,
} from "lucide-react";
import { SocialBrandIcon, socialIconOptions } from "./socialIcons";
import { isProgrammingLanguageIcon, ProgrammingLanguageIcon } from "./programmingIcons";
import defaultPortfolio from "../../shared/portfolio.default.json";
import type { IconName, PortfolioContent } from "./types";

type ToastMessage = { title: string; detail?: string };

function ProjectGallery({
  title,
  image,
  gallery,
}: {
  title: string;
  image: string;
  gallery: string[];
}) {
  const images = image
    ? [image, ...gallery.filter((url) => url && url !== image)]
    : gallery.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));

  if (images.length === 0) {
    return (
      <div className="project-image-wrap">
        <div aria-label="Project preview not added" className="project-image-placeholder" role="img">
          <span>Project preview</span>
        </div>
      </div>
    );
  }

  return (
    <div aria-label={`${title} screenshots`} className="project-image-wrap project-gallery">
      <img
        alt={`${title} screenshot ${currentIndex + 1} of ${images.length}`}
        className="project-image"
        loading="lazy"
        src={images[currentIndex]}
      />
      {images.length > 1 && (
        <>
          <button
            aria-label={`Previous ${title} screenshot`}
            className="project-gallery-arrow is-previous"
            onClick={() => setActiveIndex((currentIndex - 1 + images.length) % images.length)}
            type="button"
          >
            <ChevronLeft size={21} />
          </button>
          <button
            aria-label={`Next ${title} screenshot`}
            className="project-gallery-arrow is-next"
            onClick={() => setActiveIndex((currentIndex + 1) % images.length)}
            type="button"
          >
            <ChevronRight size={21} />
          </button>
          <div aria-label="Choose screenshot" className="project-gallery-pagination">
            <span aria-live="polite">{currentIndex + 1} / {images.length}</span>
            <div>
              {images.map((url, index) => (
                <button
                  aria-label={`Show ${title} screenshot ${index + 1}`}
                  aria-pressed={index === currentIndex}
                  className={index === currentIndex ? "is-active" : ""}
                  key={`${url}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
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
const skillGroups = ["Frontend", "Backend", "Databases", "Tools"] as const;

function App() {
  const [portfolio, setPortfolio] = useState<PortfolioContent>(
    defaultPortfolio as PortfolioContent,
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portfolio", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Portfolio content could not be loaded.");
        setPortfolio((await response.json()) as PortfolioContent);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setToast({
          title: "Preview content is shown",
          detail: "The latest saved portfolio could not be loaded.",
        });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const profile = portfolio.about;
  const projects = portfolio.projectsSection.projects.filter((project) => project.visible);
  const skills = portfolio.skillsSection.skills;
  const experience = portfolio.experience;
  const certificates = portfolio.certificates ?? [];
  const socials = portfolio.contact.socials;

  useEffect(() => {
    document.title = `${profile.profileName} — Projects`;
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      `Projects and profile of ${profile.profileName}.`,
    );
  }, [profile.profileName]);

  return (
    <main className="portfolio-page">
      <header className="topbar">
        <a className="wordmark" href="#profile">{profile.profileName}</a>
        <nav aria-label="Portfolio sections" className="topbar-actions">
          <a className="topbar-nav-link" href="#projects">Projects</a>
          <a className="topbar-nav-link" href="#skills">Skills</a>
          <a className="topbar-nav-link" href="#credentials">Certificates & experience</a>
          <a className="topbar-nav-link" href="#socials">Social profiles</a>
          <a className="edit-link" href="/admin"><Pencil size={15} /> Edit portfolio</a>
        </nav>
      </header>

      <section aria-label="Profile" className="profile" id="profile">
        <div
          className={`cover-photo${profile.coverPhoto ? " has-cover" : ""}`}
        >
          {profile.coverPhoto
            ? <>
              <img alt="" aria-hidden="true" className="cover-image-backdrop" src={profile.coverPhoto} />
              <img
                alt="Cover photo"
                className="cover-image"
                src={profile.coverPhoto}
                style={{
                  left: `${(1 - (profile.coverPhotoZoom ?? 1)) * (profile.coverPhotoX ?? 50)}%`,
                  top: `${(1 - (profile.coverPhotoZoom ?? 1)) * (profile.coverPhotoY ?? 50)}%`,
                  transform: `scale(${profile.coverPhotoZoom ?? 1})`,
                }}
              />
            </>
            : <span className="cover-decoration" />}
        </div>
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
            <span className="summary-label">Tech stack & languages</span>
            <strong>{skills.length.toString().padStart(2, "0")}</strong>
            <small>Frontend, Backend, Databases & Tools</small>
          </article>
          <article className="summary-card">
            <span className="summary-icon"><Award size={19} /></span>
            <span className="summary-label">Certificates</span>
            <strong>{certificates.length.toString().padStart(2, "0")}</strong>
            <small>Certificates in my profile</small>
          </article>
          <article className="summary-card">
            <span className="summary-icon"><BriefcaseBusiness size={19} /></span>
            <span className="summary-label">Experience</span>
            <strong>{experience.length.toString().padStart(2, "0")}</strong>
            <small>Workplaces in my timeline</small>
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
                <ProjectGallery gallery={project.gallery ?? []} image={project.image} title={project.title} />
                <div className="project-content">
                  <h3>{project.title}</h3>
                  {project.description && <p>{project.description}</p>}
                  <div className="project-links">
                    {project.githubUrl && (
                      <a href={project.githubUrl} rel="noopener noreferrer" target="_blank">
                        <Github size={16} /> GitHub repository <ArrowUpRight size={14} />
                      </a>
                    )}
                    {project.linkedinUrl && (
                      <a href={project.linkedinUrl} rel="noopener noreferrer" target="_blank">
                        <Linkedin size={16} /> LinkedIn post <ArrowUpRight size={14} />
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
                      return (
                        <article className="skill-card" key={skill.name}>
                          <div className="skill-card-top">
                            <span className="skill-icon" style={{ color: skill.color, backgroundColor: `${skill.color}12` }}>
                              {isProgrammingLanguageIcon(skill.icon)
                                ? <ProgrammingLanguageIcon name={skill.icon} size={19} />
                                : <Icon size={19} strokeWidth={1.8} />}
                            </span>
                            <span className="skill-level">{skill.level}</span>
                          </div>
                          <h3>{skill.name}</h3>
                          <div aria-label={`${skill.name} ${skill.level}`} className="skill-meter" role="img">
                            <span style={{ width: skill.level, backgroundColor: skill.color }} />
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

      <section aria-labelledby="credentials-title" className="credentials-section" id="credentials">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE JOURNEY</p>
            <h2 id="credentials-title">Certificates & experience</h2>
            <p className="section-description">Professional milestones and certifications earned along the way.</p>
          </div>
        </div>
        <div className="credentials-grid">
          <section aria-labelledby="certificates-title" className="credential-panel">
            <div className="credential-panel-heading">
              <span className="credential-kicker">LEARNING & RECOGNITION</span>
              <h3 id="certificates-title">Certificates</h3>
            </div>
            {certificates.length ? (
              <div className="certificate-list">
                {certificates.map((certificate, index) => (
                  <article className="certificate-card" key={`${certificate.title}-${index}`}>
                    {certificate.image && (
                      <a className="certificate-image-wrap" href={certificate.image} rel="noopener noreferrer" target="_blank">
                        <img alt={`${certificate.title} certificate`} loading="lazy" src={certificate.image} />
                      </a>
                    )}
                    <div className="certificate-copy">
                      <span className="certificate-year">{certificate.year}</span>
                      <h4>{certificate.title}</h4>
                      {certificate.issuer && <p className="certificate-issuer">{certificate.issuer}</p>}
                      {certificate.description && <p className="certificate-description">{certificate.description}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="credential-empty">Certificates you add will appear here.</p>
            )}
          </section>
          <section aria-labelledby="experience-title" className="credential-panel">
            <div className="credential-panel-heading">
              <span className="credential-kicker">CAREER PATH</span>
              <h3 id="experience-title">Experience</h3>
            </div>
            {experience.length ? (
              <div className="experience-list">
                {experience.map((item, index) => (
                  <article className={`experience-card${item.image ? " has-image" : ""}`} key={`${item.role}-${item.company ?? ""}-${index}`}>
                    <span aria-hidden="true" className="experience-marker" />
                    {item.image && <a className="experience-image-link" href={item.image} rel="noopener noreferrer" target="_blank"><img alt={`${item.company || item.role} workplace`} loading="lazy" src={item.image} /></a>}
                    <div className="experience-copy">
                      <span className="experience-year">{item.year}</span>
                      <h4>{item.role}</h4>
                      {item.company && <p className="experience-company">{item.company}</p>}
                      {item.location && <p className="experience-location">{item.location}</p>}
                      {item.desc && <p className="experience-description">{item.desc}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="credential-empty">Experience you add will appear here.</p>
            )}
          </section>
        </div>
        <a className="credentials-edit-link" href="/admin#certificates"><Pencil size={14} /> Add certificates or edit experience</a>
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
              const Icon = icons[social.icon] ?? ExternalLink;
              const isSocialBrand = socialIconOptions.some((option) => option.name === social.icon);
              return (
                <a className="social-card" href={social.url} key={`${social.name}-${social.url}`} rel="noopener noreferrer" target="_blank">
                  <span className="social-icon">
                    {isSocialBrand
                      ? <SocialBrandIcon name={social.icon} size={19} />
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
        </div>
      )}
    </main>
  );
}

export default App;
