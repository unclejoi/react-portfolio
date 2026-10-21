import './ExpertiseStrip.css';

export default function ExpertiseStrip() {
  return (
    <div className="expertise-strip" aria-label="Core focus">
      <div className="container">
        <span>React & TypeScript</span>
        <span className="strip-star" aria-hidden="true">✳</span>
        <span>Design systems</span>
        <span className="strip-star" aria-hidden="true">✳</span>
        <span>Reusable components</span>
      </div>
    </div>
  );
}
