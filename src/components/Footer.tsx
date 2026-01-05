import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Facebook,
  Twitter,
  Instagram,
  Globe,

  Users,

  HelpCircle,
  MessageCircle,
  Share2,

  User,


  ChevronUp,
  Search,
  Bell,

  Code,
  Lightbulb,
  Linkedin,
  Github,
  MessageSquare
} from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState({ code: 'en', name: 'us English', flag: '🇺🇸' });

  const languages = [
    { code: 'en', name: 'us English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    const footerElement = document.querySelector('#cineflix-footer');
    if (footerElement) observer.observe(footerElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
    const smartBrowseLinks = [
      { name: 'Home', href: '/', icon: Home, badge: '12 New' },
      { name: 'Movies', href: '/movies', icon: Film, badge: 'Latest' },
      { name: 'TV Shows', href: '/tv-shows', icon: Tv, badge: '5 Episodes' },
      { name: 'Documentaries', href: '/documentaries', icon: FileText },
      { name: 'Originals', href: '/originals', icon: Crown, badge: 'Exclusive' },
      { name: 'Collections', href: '/collections', icon: Star },
      { name: 'New & Popular', href: '/new-popular', icon: TrendingUp },
      { name: 'Coming Soon', href: '/coming-soon', icon: Calendar, badge: 'Preview' },
    ];
  
    const myCineFlixLinks = [
      { name: 'My List', href: '/my-list', icon: Bookmark, count: '24' },
      { name: 'Watch History', href: '/history', icon: Clock, count: '156' },
      { name: 'Continue Watching', href: '/continue', icon: Play, count: '8' },
      { name: 'Downloaded', href: '/downloads', icon: Download, count: '12' },
      { name: 'Favorites', href: '/favorites', icon: Heart, count: '43' },
      { name: 'Watch Later', href: '/watch-later', icon: Plus, count: '31' },
      { name: 'Family Profiles', href: '/profiles', icon: Users },
      { name: 'Viewing Stats', href: '/stats', icon: BarChart3 },
    ];
  
    const communityLinks = [
      { name: 'Reviews & Ratings', href: '/reviews', icon: Star },
      { name: 'Discussion Forums', href: '/forums', icon: MessageCircle },
      { name: 'Watch Parties', href: '/watch-parties', icon: Users },
      { name: 'Friend Activity', href: '/friends', icon: Share2 },
      { name: 'Share & Recommend', href: '/share', icon: Share2 },
      { name: 'CineFlix Blog', href: '/blog', icon: FileText },
      { name: 'Creator Spotlights', href: '/creators', icon: Award },
      { name: 'Fan Communities', href: '/communities', icon: Users },
    ];
  
    const premiumFeatureLinks = [
      { name: 'Quality Settings', href: '/settings/quality', icon: Settings },
      { name: 'Download Management', href: '/settings/downloads', icon: Download },
      { name: 'Accessibility Options', href: '/settings/accessibility', icon: Accessibility },
      { name: 'Data & Privacy', href: '/settings/privacy', icon: Shield },
      { name: 'Account Security', href: '/settings/security', icon: Lock },
    ];
  */

  const supportLinks = [
    { name: 'Help Center', href: '/help', icon: HelpCircle },
    { name: 'Community Support', href: '/community-help', icon: Users },
    { name: 'Feature Requests', href: '/feature-requests', icon: Lightbulb },
    { name: 'Developer API', href: '/api', icon: Code },
    { name: 'Contact Us', href: '/contact', icon: MessageCircle },
  ];

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/simoabidx', color: '#1877F2' },
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/SeeMooAbid', color: '#1DA1F2' },
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/simoabiid', color: '#E4405F' },
    { name: 'Discord', icon: MessageSquare, href: 'https://discord.gg/seemoo.a', color: '#5865F2' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/mohamed-amine-abidd', color: '#0A66C2' },
    { name: 'GitHub', icon: Github, href: 'https://github.com/simoabid', color: '#333' },
  ];

  const quickActions = [
    {
      name: 'Search',
      icon: Search,
      action: () => window.dispatchEvent(new CustomEvent('open-search-modal'))
    },
    {
      name: 'Notifications',
      icon: Bell,
      action: () => { },
      badge: '3'
    },
    {
      name: 'Profile',
      icon: User,
      action: () => navigate('/account')
    },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  /*
    const FooterSection = ({ 
      title, 
      links, 
      sectionKey, 
      showCounts = false, 
      showBadges = false 
    }: {
      title: string;
      links: any[];
      sectionKey: string;
      showCounts?: boolean;
      showBadges?: boolean;
    }) => {
      const isExpanded = expandedSection === sectionKey;
      
      return (
        <div className="footer-section">
          <button
            onClick={() => toggleSection(sectionKey)}
            className="flex items-center justify-between w-full text-left group md:pointer-events-none"
          >
            <h3 className="text-lg font-semibold text-white mb-6 group-hover:text-netflix-red transition-colors duration-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-netflix-red" />
              {title}
            </h3>
            <ChevronDown 
              className={`w-5 h-5 text-gray-400 transition-transform duration-300 md:hidden ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </button>
          
          <AnimatePresence>
            {(isExpanded || typeof window !== 'undefined' && window.innerWidth >= 768) && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-4"
              >
                {links.map((link, index) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <a
                      href={link.href}
                      className="group flex items-center gap-3 text-gray-400 hover:text-white transition-all duration-300 hover:translate-x-2"
                    >
                      <link.icon className="w-4 h-4 text-netflix-red group-hover:scale-110 transition-transform duration-300" />
                      <span className="flex-1">{link.name}</span>
                      {showCounts && link.count && (
                        <span className="bg-netflix-red text-white text-xs px-2 py-1 rounded-full font-medium">
                          {link.count}
                        </span>
                      )}
                      {showBadges && link.badge && (
                        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                          {link.badge}
                        </span>
                      )}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      );
    };
  */

  return (
    <footer
      id="cineflix-footer"
      className="relative bg-[#020205] overflow-hidden"
    >
      {/* Premium Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        {/* Deep gradient wash - Starts with Home Page's bottom color (#0A0A1F) for seamless blend */}
        <div className="absolute top-0 w-full h-full bg-gradient-to-b from-[#0A0A1F] via-[#050510] to-[#0A0A1F]" />

        {/* Vibrant Glow Spot at bottom center */}
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-blue-900/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-indigo-600/10 blur-[100px] rounded-full" />


      </div>

      {/* Massive Watermark Text */}
      <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-full flex justify-center opacity-30 select-none pointer-events-none z-10">
        <div className="flex items-start gap-[0.5vw]" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
          {['C', 'I', 'N', 'E', 'F', 'L', 'I', 'X'].map((letter, i) => {
            const scales = [1.35, 1.25, 1.15, 1.1, 1.1, 1.15, 1.25, 1.35];
            return (
              <span
                key={i}
                className="text-[#E50914] text-[15vw] leading-none origin-top block"
                style={{ transform: `scaleY(${scales[i]})` }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">


        {/* Top Section - Brand and Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6 }}
          className="py-12 border-b border-gray-800/50 relative z-20"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Enhanced Logo */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                <motion.div
                  className="flex items-start gap-px"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}
                >
                  {['C', 'I', 'N', 'E', 'F', 'L', 'I', 'X'].map((letter, i) => {
                    const scales = [1, 0.92, 0.87, 0.85, 0.85, 0.87, 0.92, 1];
                    return (
                      <span
                        key={i}
                        className="text-[#E50914] text-5xl leading-none origin-top block tracking-tighter"
                        style={{ transform: `scaleY(${scales[i]})` }}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </motion.div>
                {/* Glow effect under the logo */}
                <div className="absolute -bottom-4 left-0 w-full h-8 bg-red-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-full" />
              </div>
              <div className="hidden lg:block text-sm text-gray-400">
                <p className="font-medium">Premium Streaming Experience</p>
                <p className="text-xs">Unlimited Entertainment</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-4">
              {quickActions.map((action) => (
                <motion.button
                  key={action.name}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-3 bg-gray-800/50 hover:bg-netflix-red/20 rounded-full transition-colors duration-300 group"
                  onClick={action.action}
                >
                  <action.icon className="w-5 h-5 text-gray-400 group-hover:text-netflix-red transition-colors duration-300" />
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 bg-netflix-red text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {action.badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        {/* Main Content Grid 
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="py-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
            <FooterSection
              title="Smart Browse"
              links={smartBrowseLinks}
              sectionKey="browse"
              showBadges={true}
            />
            <FooterSection
              title="My CineFlix"
              links={myCineFlixLinks}
              sectionKey="mycineflix"
              showCounts={true}
            />
            <FooterSection
              title="Community & Social"
              links={communityLinks}
              sectionKey="community"
            />
            <FooterSection
              title="Premium Features"
              links={premiumFeatureLinks}
              sectionKey="premium"
            />
          </div>
        </motion.div>
        */}

        {/* Enhanced Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="py-12 border-t border-gray-800/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Support Links */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-netflix-red" />
                Support & Resources
              </h3>
              <ul className="space-y-4">
                {supportLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="group flex items-center gap-3 text-gray-400 hover:text-white transition-all duration-300"
                    >
                      <link.icon className="w-4 h-4 text-netflix-red group-hover:scale-110 transition-transform duration-300" />
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Language & Accessibility */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-netflix-red" />
                Language & Accessibility
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full bg-[#0B0B12] text-gray-300 px-4 py-3 flex items-center justify-between rounded-lg border transition-all duration-300 group shadow-lg ${isOpen ? 'border-[#E50914] ring-2 ring-[#E50914]/20' : 'border-gray-800 hover:border-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{selectedLang.flag}</span>
                      <span className="text-sm font-medium">{selectedLang.name}</span>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-netflix-red rotate-180" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <>
                        {/* Backdrop to close */}
                        <div
                          className="fixed inset-0 z-[60]"
                          onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="absolute top-full left-0 w-full mt-2 bg-[#151520] border border-gray-800 rounded-xl overflow-hidden shadow-2xl z-[70] backdrop-blur-xl"
                        >
                          <div className="p-1">
                            {languages.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  setSelectedLang(lang);
                                  setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${selectedLang.code === lang.code
                                  ? 'bg-netflix-red text-white'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                  }`}
                              >
                                <span className="text-lg leading-none">{lang.flag}</span>
                                <span className="font-medium">{lang.name}</span>
                                {selectedLang.code === lang.code && (
                                  <motion.div
                                    layoutId="active-check"
                                    className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-800/50 text-xs rounded-full text-gray-400">Subtitles</span>
                  <span className="px-3 py-1 bg-gray-800/50 text-xs rounded-full text-gray-400">Audio Description</span>
                  <span className="px-3 py-1 bg-gray-800/50 text-xs rounded-full text-gray-400">High Contrast</span>
                </div>
              </div>
            </div>

            {/* Social Media Enhanced */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-netflix-red" />
                Connect With Us
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="group p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-300 flex flex-col items-center gap-2"
                    style={{ '--social-color': social.color } as any}
                  >
                    <social.icon className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors duration-300" />
                    <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300">
                      {social.name}
                    </span>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Massive Spacer for Watermark Visibility */}
        <div className="h-40 lg:h-64 w-full" aria-hidden="true" />

        {/* Bottom Section - Legal & Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="pb-8 pt-8 border-t border-gray-800/50 relative z-10"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <a href="/terms" className="hover:text-white transition-colors duration-300">Terms of Service</a>
              <a href="/privacy" className="hover:text-white transition-colors duration-300">Privacy Policy</a>
              <a href="/cookies" className="hover:text-white transition-colors duration-300">Cookie Settings</a>
              <a href="/legal" className="hover:text-white transition-colors duration-300">Legal Notices</a>
            </div>
            <div className="text-sm text-gray-500">
              <p>© {currentYear} CINEFLIX, Inc. All rights reserved.</p>
              <p className="text-xs mt-1">Built with ❤️ by ABID.Dev for movie lovers worldwide 🎥</p>
            </div>
          </div>
        </motion.div>

        {/* Modern Floating Back to Top Button - Fixed to viewport */}
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 20,
            scale: isVisible ? 1 : 0.8
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            opacity: { duration: 0.3 }
          }}
          whileHover={{
            scale: 1.05,
            y: -2,
            transition: { duration: 0.2 }
          }}
          whileTap={{
            scale: 0.9,
            transition: { duration: 0.1 }
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 group"
        >
          <div className="relative p-4 bg-gradient-to-br from-netflix-red via-red-500 to-red-600 hover:from-red-500 hover:via-red-600 hover:to-red-700 rounded-2xl shadow-2xl backdrop-blur-sm border border-red-400/20 transition-all duration-500 overflow-hidden">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 translate-x-full group-hover:translate-x-0"></div>

            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-2xl">
              <div className="absolute inset-0 rounded-2xl bg-netflix-red animate-ping opacity-20"></div>
            </div>

            {/* Icon with enhanced animations */}
            <div className="relative z-10">
              <ChevronUp className="w-6 h-6 text-white group-hover:text-white/90 transition-all duration-300 group-hover:scale-110 drop-shadow-sm" />
            </div>

            {/* Subtle inner shadow */}
            <div className="absolute inset-0 rounded-2xl shadow-inner opacity-30"></div>
          </div>

          {/* Tooltip on hover */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
            Back to top
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
          </div>
        </motion.button>
      </div>
    </footer>
  );
};

export default Footer;
