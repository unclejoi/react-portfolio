import type { skillGroups } from '../../data';
import Icon, { type IconName } from '../Icon/Icon';
import './ToolkitCard.css';

interface ToolkitCardProps {
  group: (typeof skillGroups)[number];
  icon: IconName;
  index: number;
}

function ToolkitCard({ group, icon, index }: ToolkitCardProps) {
  return (
    <article className="toolkit-card">
      <div className="toolkit-card-top">
        <span className="toolkit-icon"><Icon name={icon} /></span>
      </div>
      <h3>{group.name}</h3>
      <p>{group.description}</p>
      <div className="skill-list">
        {group.skills.map((skill) => <span key={skill}>{skill}</span>)}
      </div>
    </article>
  );
}

export default ToolkitCard;
