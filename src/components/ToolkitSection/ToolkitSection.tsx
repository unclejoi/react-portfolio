import { skillGroups } from '../../data';
import type { IconName } from '../Icon/Icon';
import SectionKicker from '../SectionKicker/SectionKicker';
import ToolkitCard from '../ToolkitCard/ToolkitCard';
import './ToolkitSection.css';

const toolkitIcons: IconName[] = ['code', 'check', 'layers', 'arrow-up'];

function ToolkitSection() {
  return (
    <section className="section container toolkit-section" id="toolkit" aria-labelledby="toolkit-heading">
      <SectionKicker number="03" label="THE TOOLKIT" />
      <div className="section-heading-row">
        <h2 id="toolkit-heading">The tools behind<br /><em>the experience.</em></h2>
        <p className="section-description toolkit-intro">A considered stack for building,<br />testing, and working together.</p>
      </div>
      <div className="toolkit-grid">
        {skillGroups.map((group, index) => (
          <ToolkitCard
            key={group.name}
            group={group}
            icon={toolkitIcons[index]}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

export default ToolkitSection;
