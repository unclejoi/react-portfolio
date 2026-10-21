import { useEffect, useRef, useState } from 'react';
import { profile } from '../../data';
import Icon from '../Icon/Icon';
import SectionKicker from '../SectionKicker/SectionKicker';
import './ContactSection.css';

function ContactSection() {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }

    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus('idle'), 4000);
  }

  return (
    <section className="contact-section" id="contact" aria-labelledby="contact-heading">
      <div className="container">
        <SectionKicker number="05" label="THE NEXT CONVERSATION" />
        <div className="contact-grid">
          <div>
            <h2 id="contact-heading">
              Good things start<br />with <em>“hello.”</em>
            </h2>
            <p>
              Have a project in mind, an opportunity to share,
              <br className="desktop-break" /> or just want to talk frontend? Let’s connect.
            </p>
            <a className="button button-light" href={`mailto:${profile.email}`}>
              Let’s talk <Icon name="arrow-up" />
            </a>
          </div>
          <div className="contact-details">
            <span className="eyebrow">DROP ME A LINE</span>
            <div className="contact-email-row">
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
              <button
                className="copy-button"
                onClick={copyEmail}
                aria-label="Copy email address"
                title="Copy email address"
              >
                <Icon name={copyStatus === 'copied' ? 'check' : 'copy'} />
              </button>
            </div>
            <p className="copy-status" role="status">
              {copyStatus === 'copied'
                ? 'Email address copied.'
                : copyStatus === 'error'
                  ? 'Select the email address to copy, or click it to email me.'
                  : '\u00a0'}
            </p>
            <div className="contact-links">
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
                <Icon name="linkedin" /> LinkedIn <Icon name="arrow-up" />
              </a>
              <a href={`tel:${profile.phone}`}>
                <Icon name="phone" /> {profile.phoneLabel} <Icon name="arrow-up" />
              </a>
            </div>
            <div className="contact-location">
              <Icon name="pin" /> {profile.location}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
