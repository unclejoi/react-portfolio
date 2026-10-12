import { useState } from 'react';
import { experiences, profile } from '../../data';
import ExperienceItem from '../ExperienceItem/ExperienceItem';
import Icon from '../Icon/Icon';
import SectionKicker from '../SectionKicker/SectionKicker';
import './ExperienceSection.css';

function ExperienceSection() {
  const [recentOnly, setRecentOnly] = useState(false);
  const visibleExperiences = recentOnly ? experiences.slice(0, 3) : experiences;

  return (
    <section className="experience-section" id="experience" aria-labelledby="experience-heading">
      <div className="container section">
        <SectionKicker number="02" label="THE JOURNEY" />
        <div className="section-heading-row">
          <div>
            <h2 id="experience-heading">Experience that<br /><em>builds on itself.</em></h2>
            <p className="section-description">From my first interfaces to systems that support entire teams.</p>
          </div>
          <div className="experience-filters" aria-label="Filter experience">
            <button
              className={!recentOnly ? 'selected' : ''}
              aria-pressed={!recentOnly}
              onClick={() => setRecentOnly(false)}
            >
              All experience
            </button>
            <button
              className={recentOnly ? 'selected' : ''}
              aria-pressed={recentOnly}
              onClick={() => setRecentOnly(true)}
            >
              Recent roles
            </button>
          </div>
        </div>
        <div className="experience-list">
          {visibleExperiences.map((experience, index) => (
            <ExperienceItem
              key={experience.company}
              experience={experience}
              open={index === 0 ? true : undefined}
            />
          ))}
        </div>
        <div className="experience-footer">
          <span>Every role, a new perspective.</span>
          <a className="text-link" href={profile.resumeUrl} download>
            The full story, in my résumé <Icon name="download" />
          </a>
        </div>
      </div>
    </section>
  );
}

export default ExperienceSection;
