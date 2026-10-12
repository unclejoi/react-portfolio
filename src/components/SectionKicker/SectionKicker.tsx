import './SectionKicker.css';

interface SectionKickerProps {
  number: string;
  label: string;
}

export default function SectionKicker({ number, label }: SectionKickerProps) {
  return (
    <div className="section-kicker">
      <span className="section-number">{number}</span> {label}
    </div>
  );
}
