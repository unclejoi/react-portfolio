import './Footer.css';
import { profile } from '../../data';
import Brand from '../Brand/Brand';

export default function Footer() {
  return (
    <footer className="site-footer container">
      <Brand ariaLabel="Back to home" />
      <p>© {new Date().getFullYear()} {profile.displayName}. Built with care.</p>
      <a className="back-to-top" href="#home">Back to top <span>↑</span></a>
    </footer>
  );
}
