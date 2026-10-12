import './Brand.css';

interface BrandProps {
  ariaLabel: string;
}

export default function Brand({ ariaLabel }: BrandProps) {
  return (
    <a className="brand" href="#home" aria-label={ariaLabel}>jh<span>.</span></a>
  );
}
