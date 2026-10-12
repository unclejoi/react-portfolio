import './AboutSection.css';
import { education } from '../../data';
import Icon from '../Icon/Icon';
import SectionKicker from '../SectionKicker/SectionKicker';

export default function AboutSection() {
  return (
    <section className="section container about-section" id="about" aria-labelledby="about-heading">
      <SectionKicker number="01" label="THE INTRODUCTION" />
      <div className="about-grid">
        <div className="about-photo-wrap">
          <img
            src="/assets/joi-portrait-secondary.jpg"
            alt="A second portrait of Joi Emmanuel Holgado"
            width="591"
            height="827"
            loading="lazy"
          />
          <span className="photo-note">A developer. A collaborator.<br />A lifelong learner.</span>
        </div>
        <div className="about-copy">
          <h2 id="about-heading">A little about me.<br /><em>A lot about the craft.</em></h2>
          <p>I’m Joi, a Senior Frontend Developer based in Agoncillo, Batangas. I turn ideas and requirements into websites, web applications, and components that teams can build on.</p>
          <p>My work spans modern React applications, shared component libraries, and design systems. I care about maintainable code, consistent interfaces, and testing that helps teams move forward with confidence.</p>
          <div className="about-facts">
            <div><strong>7+</strong><span>Years of experience</span></div>
            <div><strong>5</strong><span>Companies along the way</span></div>
            <div><strong className="fact-word">One</strong><span>Commitment to quality</span></div>
          </div>
          <div className="education">
            <span className="education-icon"><Icon name="layers" /></span>
            <div>
              <span className="eyebrow">THE FOUNDATION</span>
              <h3>{education.degree}</h3>
              <p>{education.school} <span>· Batangas City</span></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
