const allowedIcons = new Set([
  "ArrowUpRight", "Check", "Code2", "ExternalLink", "Figma", "Github",
  "Globe2", "Layers3", "Linkedin", "MapPin", "MessageCircle", "Monitor",
  "Palette", "Send", "Terminal", "Zap",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown, maxLength = 10_000): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isSafeWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isSafeImageReference(value: unknown): value is string {
  return typeof value === "string" &&
    (/^\/api\/media\/[a-f0-9]{32}\.(?:png|jpg|webp|gif)$/.test(value) || isSafeWebUrl(value));
}

export function isPortfolioContent(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const {
    navigation,
    customSections,
    hero,
    about,
    projectsSection,
    skillsSection,
    contact,
    footer,
    experience,
    certificates,
  } = value;
  if (
    !Array.isArray(navigation) ||
    !Array.isArray(experience) ||
    !Array.isArray(certificates) ||
    !isRecord(hero) ||
    !isRecord(about) ||
    !isRecord(projectsSection) ||
    !isRecord(skillsSection) ||
    !isRecord(contact) ||
    !isRecord(footer)
  ) return false;

  const textKeys = (record: Record<string, unknown>, keys: string[]) =>
    keys.every((key) => validText(record[key]));
  const iconKey = (item: Record<string, unknown>) =>
    typeof item.icon === "string" && allowedIcons.has(item.icon);
  const textArray = (
    items: unknown,
    keys: string[],
    limit: number,
  ): items is Record<string, unknown>[] =>
    Array.isArray(items) &&
    items.length <= limit &&
    items.every((item) => isRecord(item) && textKeys(item, keys));
  const projects = projectsSection.projects;
  const builtInSectionIds = new Set(["home", "about", "projects", "languages", "contacts"]);
  if (!Array.isArray(customSections) || customSections.length > 20) return false;
  const customSectionIds = new Set<string>();
  for (const section of customSections) {
    if (
      !isRecord(section) ||
      !textKeys(section, ["id", "label", "title", "description"]) ||
      typeof section.id !== "string" ||
      typeof section.tinted !== "boolean" ||
      !/^custom-[a-z0-9-]+$/.test(section.id) ||
      builtInSectionIds.has(section.id) ||
      customSectionIds.has(section.id) ||
      !textArray(section.cards, ["title", "description", "image", "link"], 30)
    ) return false;
    customSectionIds.add(section.id);
    if (!section.cards.every((card) =>
      (card.image === "" || isSafeWebUrl(card.image)) &&
      (card.link === "" || isSafeWebUrl(card.link)) &&
      Array.isArray(card.tags) &&
      card.tags.length <= 30 &&
      card.tags.every((tag) => validText(tag, 200)),
    )) return false;
  }
  const validSectionIds = new Set([
    ...builtInSectionIds,
    ...customSectionIds,
  ]);
  if (!textArray(navigation, ["id", "label"], 20)) return false;
  const navigationIds = navigation.map((item) => item.id);
  if (
    !navigationIds.every((id): id is string => typeof id === "string" && validSectionIds.has(id)) ||
    new Set(navigationIds).size !== navigation.length
  ) return false;
  const projectsValid = textArray(
    projects,
    ["id", "category", "title", "description", "fullDescription", "image", "liveUrl", "githubUrl", "linkedinUrl"],
    50,
  );
  const projectIds = projectsValid ? projects.map((project) => project.id) : [];
  if (
    !projectsValid ||
    new Set(projectIds).size !== projectIds.length ||
    !projects.every(
      (project) => typeof project.id === "string" &&
        /^[a-z0-9][a-z0-9-]{0,99}$/.test(project.id) &&
        (project.image === "" || isSafeImageReference(project.image)) &&
        (project.liveUrl === "" || isSafeWebUrl(project.liveUrl)) &&
        (project.githubUrl === "" || isSafeWebUrl(project.githubUrl)) &&
        (project.linkedinUrl === "" || isSafeWebUrl(project.linkedinUrl)) &&
        typeof project.featured === "boolean" &&
        typeof project.visible === "boolean" &&
        Array.isArray(project.gallery) &&
        project.gallery.length <= 30 &&
        project.gallery.every((image) => isSafeImageReference(image)) &&
        Array.isArray(project.tags) &&
        project.tags.length <= 30 && project.tags.every((tag) => validText(tag, 200)),
    )
  ) return false;

  if (
    experience.length > 100 ||
    !experience.every((item) =>
      isRecord(item) &&
      textKeys(item, ["role", "desc", "year"]) &&
      (item.company === undefined || validText(item.company, 200)) &&
      (item.location === undefined || validText(item.location, 200)) &&
      (item.image === undefined || (validText(item.image) && (item.image === "" || isSafeImageReference(item.image)))),
    )
  ) return false;

  if (
    certificates.length > 50 ||
    !certificates.every((certificate) =>
      isRecord(certificate) &&
      textKeys(certificate, ["title", "issuer", "year", "description", "image"]) &&
      (certificate.image === "" || isSafeImageReference(certificate.image)),
    )
  ) return false;

  return (
    customSectionIds.size === customSections.length &&
    textKeys(hero, [
      "brand", "badge", "title", "titleAccent", "description", "projectsButton",
      "contactButton", "headerButton", "scrollText",
    ]) &&
    textArray(hero.stats, ["value", "label", "icon"], 12) &&
    hero.stats.every(iconKey) &&
    textKeys(about, [
      "label", "title", "profileName", "profileRole", "location", "photo",
      "profileDescription", "bioTitle", "bio",
    ]) &&
    (about.photo === "" || isSafeImageReference(about.photo)) &&
    (about.coverPhoto === undefined ||
      (validText(about.coverPhoto) && (about.coverPhoto === "" || isSafeImageReference(about.coverPhoto)))) &&
    (about.coverPhotoZoom === undefined ||
      (typeof about.coverPhotoZoom === "number" && about.coverPhotoZoom >= 1 && about.coverPhotoZoom <= 3)) &&
    (about.coverPhotoX === undefined ||
      (typeof about.coverPhotoX === "number" && about.coverPhotoX >= 0 && about.coverPhotoX <= 100)) &&
    (about.coverPhotoY === undefined ||
      (typeof about.coverPhotoY === "number" && about.coverPhotoY >= 0 && about.coverPhotoY <= 100)) &&
    textArray(about.values, ["icon", "title", "description"], 12) &&
    about.values.every(iconKey) &&
    textKeys(projectsSection, ["label", "title", "description"]) &&
    textKeys(skillsSection, ["label", "title", "description"]) &&
    textArray(skillsSection.skills, ["name", "level", "icon", "color"], 50) &&
    skillsSection.skills.every((skill) =>
      iconKey(skill) &&
      typeof skill.level === "string" &&
      /^(100|[1-9]?\d)%$/.test(skill.level) &&
      typeof skill.color === "string" &&
      /^#[\da-fA-F]{6}$/.test(skill.color) &&
      (skill.category === undefined || validText(skill.category, 80)),
    ) &&
    textKeys(contact, [
      "label", "title", "description", "formTitle", "formDescription", "nameLabel",
      "emailFieldLabel", "subjectLabel", "messageLabel", "namePlaceholder",
      "emailPlaceholder", "subjectPlaceholder", "messagePlaceholder", "sendButton",
      "emailLabel", "locationLabel", "contactInfoTitle", "socialTitle", "availabilityTitle",
      "availabilityDescription", "email", "location",
    ]) &&
    textArray(contact.socials, ["name", "url", "icon"], 30) &&
    contact.socials.every((social) => iconKey(social) && isSafeWebUrl(social.url)) &&
    textKeys(footer, ["copyright"])
  );
}
