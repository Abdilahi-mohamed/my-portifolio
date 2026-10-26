export type IconName =
  | "ArrowUpRight"
  | "Check"
  | "Code2"
  | "ExternalLink"
  | "Figma"
  | "Facebook"
  | "Github"
  | "Globe2"
  | "Layers3"
  | "Linkedin"
  | "MapPin"
  | "MessageCircle"
  | "Monitor"
  | "Instagram"
  | "Palette"
  | "Send"
  | "Terminal"
  | "X"
  | "Zap";

export type PortfolioContent = {
  navigation: { id: string; label: string }[];
  customSections: {
    id: string;
    label: string;
    title: string;
    description: string;
    tinted: boolean;
    cards: {
      title: string;
      description: string;
      image: string;
      tags: string[];
      link: string;
    }[];
  }[];
  hero: {
    brand: string;
    badge: string;
    title: string;
    titleAccent: string;
    description: string;
    projectsButton: string;
    contactButton: string;
    headerButton: string;
    scrollText: string;
    stats: { value: string; label: string; icon: IconName }[];
  };
  about: {
    label: string;
    title: string;
    profileName: string;
    profileRole: string;
    location: string;
    photo: string;
    coverPhoto?: string;
    coverPhotoZoom?: number;
    coverPhotoX?: number;
    coverPhotoY?: number;
    profileDescription: string;
    bioTitle: string;
    bio: string;
    values: { icon: IconName; title: string; description: string }[];
  };
  projectsSection: {
    label: string;
    title: string;
    description: string;
    projects: {
      id: string;
      category: string;
      title: string;
      description: string;
      fullDescription: string;
      image: string;
      gallery: string[];
      tags: string[];
      liveUrl: string;
      githubUrl: string;
      linkedinUrl: string;
      featured: boolean;
      visible: boolean;
    }[];
  };
  skillsSection: {
    label: string;
    title: string;
    description: string;
    skills: {
      name: string;
      level: string;
      icon: IconName;
      color: string;
      category?: string;
    }[];
  };
  experience: {
    role: string;
    desc: string;
    year: string;
    company?: string;
    location?: string;
    image?: string;
  }[];
  certificates: {
    title: string;
    issuer: string;
    year: string;
    description: string;
    image: string;
  }[];
  contact: {
    label: string;
    title: string;
    description: string;
    formTitle: string;
    formDescription: string;
    nameLabel: string;
    emailFieldLabel: string;
    subjectLabel: string;
    messageLabel: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    subjectPlaceholder: string;
    messagePlaceholder: string;
    sendButton: string;
    emailLabel: string;
    locationLabel: string;
    contactInfoTitle: string;
    socialTitle: string;
    availabilityTitle: string;
    availabilityDescription: string;
    email: string;
    location: string;
    socials: { name: string; url: string; icon: IconName }[];
  };
  footer: { copyright: string };
};
