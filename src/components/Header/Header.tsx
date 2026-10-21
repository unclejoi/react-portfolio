import { useEffect, useRef, useState } from 'react';
import { profile } from '../../data';
import Brand from '../Brand/Brand';
import Icon from '../Icon/Icon';
import './Header.css';

const navigation = [
  { label: 'About', id: 'about' },
  { label: 'Experience', id: 'experience' },
  { label: 'Toolkit', id: 'toolkit' },
  { label: 'Ask my resume', id: 'resume-chat' },
  { label: 'Contact', id: 'contact' },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
    );

    navigation.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const closeOnResize = () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand ariaLabel="Joi Holgado — home" />
        <nav
          className={`navigation ${menuOpen ? 'is-open' : ''}`}
          id="main-navigation"
          aria-label="Main navigation"
        >
          {navigation.map(({ label, id }) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? 'active' : ''}
              aria-current={activeSection === id ? 'location' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <a className="nav-resume" href={profile.resumeUrl} download>
            Résumé <Icon name="arrow-up" />
          </a>
        </nav>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>
    </header>
  );
}

export default Header;
