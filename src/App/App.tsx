import AboutSection from '../components/AboutSection/AboutSection';
import ContactSection from '../components/ContactSection/ContactSection';
import ExperienceSection from '../components/ExperienceSection/ExperienceSection';
import ExpertiseStrip from '../components/ExpertiseStrip/ExpertiseStrip';
import Footer from '../components/Footer/Footer';
import Header from '../components/Header/Header';
import HeroFootnote from '../components/HeroFootnote/HeroFootnote';
import HeroSection from '../components/HeroSection/HeroSection';
import ResumeChat from '../components/ResumeChat/ResumeChat';
import ToolkitSection from '../components/ToolkitSection/ToolkitSection';
import './App.css';

function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <HeroSection />
        <HeroFootnote />
        <ExpertiseStrip />
        <AboutSection />
        <ExperienceSection />
        <ToolkitSection />
        <ResumeChat />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

export default App;
