import { Youtube, Instagram, Linkedin, MessageCircle, Twitter, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-orange-500 text-white pt-12 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <img 
              src="/lovable-uploads/c8bc8544-fa1e-4c93-ac7d-859753199a68.png" 
              alt="Sri Mandir" 
              className="h-16 w-auto mb-4"
            />
            <p className="text-sm leading-relaxed">
              Sri Mandir has brought religious services to the masses in India by connecting devotees, pundits, and temples. Partnering with over 50 renowned temples, we provide exclusive pujas and offerings services performed by expert pandits and share videos of the completed puja rituals.
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