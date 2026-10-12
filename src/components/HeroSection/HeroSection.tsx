import './HeroSection.css';
import { profile } from '../../data';
import Icon from '../Icon/Icon';

export default function HeroSection() {
  return (
    <section className="hero container" id="home" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <div className="eyebrow hero-eyebrow">
          <span className="tiny-square" /> SENIOR FRONTEND DEVELOPER
        </div>
        <p className="intro">Hello, I’m Joi Emmanuel Holgado.</p>
        <h1 id="hero-heading">Thoughtful code.<br /><em>Meaningful</em><br className="desktop-break" /> experiences.</h1>
        <p className="hero-description">I build intuitive web applications and scalable design systems. Bringing over 7 years of experience to the details that make a difference.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#experience">
            Explore my experience <Icon name="arrow" />
          </a>
          <a className="text-link" href={profile.resumeUrl} download>
            Download résumé <Icon name="download" />
          </a>
        </div>
        <div className="hero-location">
          <Icon name="pin" /> Batangas, Philippines <span className="location-divider" /> Working with the web, worldwide.
        </div>
      </div>
      <div className="hero-visual">
        <div className="portrait-label">
          <span>THE PERSON BEHIND THE CODE</span>
        </div>
        <div className="portrait-frame">
          <div className="portrait-lines" aria-hidden="true" />
          <img
            className="hero-portrait"
            src="/assets/joi-portrait-primary.jpg"
            alt="Joi Emmanuel Holgado wearing a blue shirt"
            fetchPriority="high"
            width="591"
            height="827"
          />
          <div className="code-stamp" aria-hidden="true"><Icon name="code" /></div>
          <div className="portrait-caption">
            <span className="caption-dot" />
            <span>Engineering with intention.</span>
            <Icon name="arrow-up" />
          </div>
        </div>
        <div className="portrait-bottom">
          <span>REACT & TYPESCRIPT</span>
          <span className="handwritten">Always building.</span>
        </div>
      </div>
    </section>
  );
}
