import { useEffect, useRef, useState, type ReactNode } from 'react';
import { education, experiences, profile, skillGroups } from './data';

type IconName = 'arrow' | 'arrow-up' | 'download' | 'code' | 'layers' | 'check' | 'phone' | 'copy' | 'pin' | 'linkedin' | 'menu' | 'close' | 'chevron';

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    'arrow-up': <><path d="M6 18 18 6M6 6h12v12" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20" /></>,
    layers: <><path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    phone: <path d="M7 3H4a1 1 0 0 0-1 1 17 17 0 0 0 17 17 1 1 0 0 0 1-1v-3l-5-2-2 2a13 13 0 0 1-7-7l2-2-2-5Z" />,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    linkedin: <><path d="M5 10v10M5 5v.1M10 20V10h4v2c2-4 6-2 6 1v7M14 12v8" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
  };
  return <svg className={`icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const navigation = [{ label: 'About', id: 'about' }, { label: 'Experience', id: 'experience' }, { label: 'Toolkit', id: 'toolkit' }, { label: 'Contact', id: 'contact' }];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [recentOnly, setRecentOnly] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const menuButton = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActiveSection(entry.target.id);
    }, { rootMargin: '-20% 0px -65% 0px', threshold: 0 });
    navigation.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => {
      observer.disconnect();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    const closeOnResize = () => { if (window.innerWidth > 760) setMenuOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [menuOpen]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyStatus('copied');
    } catch { setCopyStatus('error'); }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus('idle'), 4000);
  }

  const visibleExperiences = recentOnly ? experiences.slice(0, 3) : experiences;

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#home" aria-label="Joi Holgado — home">jh<span>.</span></a>
          <nav className={`navigation ${menuOpen ? 'is-open' : ''}`} id="main-navigation" aria-label="Main navigation">
            {navigation.map(({ label, id }) => <a key={id} href={`#${id}`} className={activeSection === id ? 'active' : ''} aria-current={activeSection === id ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <a className="nav-resume" href={profile.resumeUrl} download>Résumé <Icon name="arrow-up" /></a>
          </nav>
          <button ref={menuButton} className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
        </div>
      </header>

      <main id="main">
        <section className="hero container" id="home" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow"><span className="tiny-square" /> SENIOR FRONTEND DEVELOPER</div>
            <p className="intro">Hello, I’m Joi Emmanuel Holgado.</p>
            <h1 id="hero-heading">Thoughtful code.<br /><em>Meaningful</em><br className="desktop-break" /> experiences.</h1>
            <p className="hero-description">I build intuitive web applications and scalable design systems. Bringing over 7 years of experience to the details that make a difference.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#experience">Explore my experience <Icon name="arrow" /></a>
              <a className="text-link" href={profile.resumeUrl} download>Download résumé <Icon name="download" /></a>
            </div>
            <div className="hero-location"><Icon name="pin" /> Batangas, Philippines <span className="location-divider" /> Working with the web, worldwide.</div>
          </div>
          <div className="hero-visual">
            <div className="portrait-label"><span>THE PERSON BEHIND THE CODE</span><span>01 / 02</span></div>
            <div className="portrait-frame">
              <div className="portrait-lines" aria-hidden="true" />
              <img className="hero-portrait" src="/assets/joi-portrait-primary.jpg" alt="Joi Emmanuel Holgado wearing a blue shirt" fetchPriority="high" width="591" height="827" />
              <div className="code-stamp" aria-hidden="true"><Icon name="code" /></div>
              <div className="portrait-caption"><span className="caption-dot" /><span>Engineering with intention.</span><Icon name="arrow-up" /></div>
            </div>
            <div className="portrait-bottom"><span>REACT & TYPESCRIPT</span><span className="handwritten">Always building.</span></div>
          </div>
        </section>

        <div className="container hero-footnote"><a href="#about">A LITTLE MORE ABOUT ME <span>↓</span></a><span>GOOD EXPERIENCES START WITH GOOD FOUNDATIONS.</span></div>
        <div className="expertise-strip" aria-label="Core focus"><div className="container"><span>React & TypeScript</span><span className="strip-star" aria-hidden="true">✳</span><span>Design systems</span><span className="strip-star" aria-hidden="true">✳</span><span>Reusable components</span></div></div>

        <section className="section container about-section" id="about" aria-labelledby="about-heading">
          <div className="section-kicker"><span className="section-number">01</span> THE INTRODUCTION</div>
          <div className="about-grid">
            <div className="about-photo-wrap"><img src="/assets/joi-portrait-secondary.jpg" alt="A second portrait of Joi Emmanuel Holgado" width="591" height="827" loading="lazy" /><span className="photo-note">A developer. A collaborator.<br />A lifelong learner.</span></div>
            <div className="about-copy">
              <h2 id="about-heading">A little about me.<br /><em>A lot about the craft.</em></h2>
              <p>I’m Joi, a Senior Frontend Developer based in Agoncillo, Batangas. I turn ideas and requirements into websites, web applications, and components that teams can build on.</p>
              <p>My work spans modern React applications, shared component libraries, and design systems. I care about maintainable code, consistent interfaces, and testing that helps teams move forward with confidence.</p>
              <div className="about-facts"><div><strong>7+</strong><span>Years of experience</span></div><div><strong>5</strong><span>Companies along the way</span></div><div><strong className="fact-word">One</strong><span>Commitment to quality</span></div></div>
              <div className="education"><span className="education-icon"><Icon name="layers" /></span><div><span className="eyebrow">THE FOUNDATION</span><h3>{education.degree}</h3><p>{education.school} <span>· Batangas City</span></p></div></div>
            </div>
          </div>
        </section>

        <section className="experience-section" id="experience" aria-labelledby="experience-heading">
          <div className="container section">
            <div className="section-kicker"><span className="section-number">02</span> THE JOURNEY</div>
            <div className="section-heading-row"><div><h2 id="experience-heading">Experience that<br /><em>builds on itself.</em></h2><p className="section-description">From my first interfaces to systems that support entire teams.</p></div><div className="experience-filters" aria-label="Filter experience"><button className={!recentOnly ? 'selected' : ''} aria-pressed={!recentOnly} onClick={() => setRecentOnly(false)}>All experience</button><button className={recentOnly ? 'selected' : ''} aria-pressed={recentOnly} onClick={() => setRecentOnly(true)}>Recent roles</button></div></div>
            <div className="experience-list">
              {visibleExperiences.map((experience, index) => <details className="experience-item" key={experience.company} open={index === 0 ? true : undefined}>
                <summary><div className="experience-date"><span>{experience.period}</span>{experience.current && <span className="current-label"><span /> CURRENT ROLE</span>}</div><div className="experience-title"><h3>{experience.company}</h3><p>{experience.role}</p></div><span className="experience-toggle"><Icon name="arrow-up" /></span></summary>
                <div className="experience-content"><p>{experience.description}</p><ul>{experience.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul><div className="tags">{experience.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
              </details>)}
            </div>
            <div className="experience-footer"><span>Every role, a new perspective.</span><a className="text-link" href={profile.resumeUrl} download>The full story, in my résumé <Icon name="download" /></a></div>
          </div>
        </section>

        <section className="section container toolkit-section" id="toolkit" aria-labelledby="toolkit-heading">
          <div className="section-kicker"><span className="section-number">03</span> THE TOOLKIT</div>
          <div className="section-heading-row"><h2 id="toolkit-heading">The tools behind<br /><em>the experience.</em></h2><p className="section-description toolkit-intro">A considered stack for building,<br />testing, and working together.</p></div>
          <div className="toolkit-grid">{skillGroups.map((group, index) => <article className="toolkit-card" key={group.name}><div className="toolkit-card-top"><span className="toolkit-icon"><Icon name={(['code', 'check', 'layers', 'arrow-up'] as IconName[])[index]} /></span><span>0{index + 1}</span></div><h3>{group.name}</h3><p>{group.description}</p><div className="skill-list">{group.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>)}</div>
        </section>

        <section className="contact-section" id="contact" aria-labelledby="contact-heading"><div className="container"><div className="section-kicker"><span className="section-number">04</span> THE NEXT CONVERSATION</div><div className="contact-grid"><div><h2 id="contact-heading">Good things start<br />with <em>“hello.”</em></h2><p>Have a project in mind, an opportunity to share,<br className="desktop-break" /> or just want to talk frontend? Let’s connect.</p><a className="button button-light" href={`mailto:${profile.email}`}>Let’s talk <Icon name="arrow-up" /></a></div><div className="contact-details"><span className="eyebrow">DROP ME A LINE</span><div className="contact-email-row"><a href={`mailto:${profile.email}`}>{profile.email}</a><button className="copy-button" onClick={copyEmail} aria-label="Copy email address" title="Copy email address"><Icon name={copyStatus === 'copied' ? 'check' : 'copy'} /></button></div><p className="copy-status" role="status">{copyStatus === 'copied' ? 'Email address copied.' : copyStatus === 'error' ? 'Select the email address to copy, or click it to email me.' : '\u00a0'}</p><div className="contact-links"><a href={profile.linkedin} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" /> LinkedIn <Icon name="arrow-up" /></a><a href={`tel:${profile.phone}`}><Icon name="phone" /> {profile.phoneLabel} <Icon name="arrow-up" /></a></div><div className="contact-location"><Icon name="pin" /> {profile.location}</div></div></div></div></section>
      </main>

      <footer className="site-footer container"><a className="brand" href="#home" aria-label="Back to home">jh<span>.</span></a><p>© {new Date().getFullYear()} {profile.displayName}. Built with care.</p><a className="back-to-top" href="#home">Back to top <span>↑</span></a></footer>
    </>
  );
}

export default App;
