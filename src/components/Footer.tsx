import { Youtube, Instagram, Linkedin, MessageCircle, Twitter, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-orange-500 text-white pt-12 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <img 
              src="/lovable-uploads/cbeff861-08ec-47c1-8450-0878f7dbe47c.png" 
              alt="Sri Mandir" 
              className="h-16 w-auto mb-4"
            />
            <p className="text-sm leading-relaxed">
              Sri Mandir has brought religious services to the masses in India by connecting devotees, pundits, and temples. Partnering with over 50 renowned temples, we provide exclusive pujas and offering services performed by expert pandits and share videos of the completed puja rituals.
            </p>
          </div>

          {/* Company Links */}
          <div className="md:ml-8">
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://www.srimandir.com/aboutus" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                >
                  About Us
                </a>
              </li>
              <li>
                <a 
                  href="https://www.srimandir.com/contact-us" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="md:ml-4">
            <h3 className="font-semibold text-lg mb-4">Our Services</h3>
            <ul className="space-y-2">
              <li><span className="text-sm">Puja</span></li>
              <li><span className="text-sm">Chadhava</span></li>
              <li><span className="text-sm">Panchang</span></li>
              <li><span className="text-sm">Temples</span></li>
            </ul>
            
            <h3 className="font-semibold text-lg mb-4 mt-8">Our Address</h3>
            <p className="text-sm leading-relaxed">
              Firstprinciple AppsForBharat Pvt. Ltd. 435, 1st Floor 17th Cross, 
              19th Main Rd, above Axis Bank, Sector 4, HSR Layout, Bengaluru, 
              Karnataka 560102
            </p>
          </div>
        </div>

        {/* App Download and Social Links */}
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-orange-400 pt-8">
          {/* App Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 md:mb-0">
            <a 
              href="https://play.google.com/store/apps/details?id=com.mandir&pli=1"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-xs">
                <div>GET IT ON</div>
                <div className="font-semibold">Google Play</div>
              </div>
            </a>
            <a 
              href="https://apps.apple.com/in/app/sri-mandir-puja-chadhava/id1637621461"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.17 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
              </svg>
              <div className="text-xs">
                <div>Download on the</div>
                <div className="font-semibold">App Store</div>
              </div>
            </a>
          </div>

          {/* Social Media Icons */}
          <div className="flex gap-4">
            <a 
              href="https://www.youtube.com/@srimandirofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-orange-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Youtube size={20} />
            </a>
            <a 
              href="https://www.instagram.com/sri.mandir"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-orange-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Instagram size={20} />
            </a>
            <a 
              href="https://www.linkedin.com/company/appsforbharat/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-orange-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Linkedin size={20} />
            </a>
            <a 
              href="https://api.whatsapp.com/send?phone=7829661119"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-orange-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MessageCircle size={20} />
            </a>
            <a 
              href="https://x.com/SriMandir_App"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-orange-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Twitter size={20} />
            </a>
            <a 
              href="https://www.facebook.com/srimandirapp"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-orange-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Facebook size={20} />
            </a>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="border-t border-orange-400 pt-6 mt-6 text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
            <a 
              href="https://www.srimandir.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Privacy Policy
            </a>
            <span className="hidden sm:inline">•</span>
            <a 
              href="https://www.srimandir.com/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Terms and Conditions
            </a>
          </div>
          <p className="text-sm mt-4 opacity-80">
            © 2024 Sri Mandir. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}