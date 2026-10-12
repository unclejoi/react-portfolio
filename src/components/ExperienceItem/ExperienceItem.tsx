import type { Experience } from '../../data';
import Icon from '../Icon/Icon';
import './ExperienceItem.css';

interface ExperienceItemProps {
  experience: Experience;
  open?: boolean;
}

function ExperienceItem({ experience, open }: ExperienceItemProps) {
  return (
    <details className="experience-item" open={open}>
      <summary>
        <div className="experience-date">
          <span>{experience.period}</span>
          {experience.current && (
            <span className="current-label"><span /> CURRENT ROLE</span>
          )}
        </div>
        <div className="experience-title">
          <h3>{experience.company}</h3>
          <p>{experience.role}</p>
        </div>
        <span className="experience-toggle"><Icon name="arrow-up" /></span>
      </summary>
      <div className="experience-content">
        <p>{experience.description}</p>
        <ul>
          {experience.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
        </ul>
        <div className="tags">
          {experience.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
    </details>
  );
}

export default ExperienceItem;
