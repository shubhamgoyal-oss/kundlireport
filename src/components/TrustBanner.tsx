import { Users, MapPin, Shield } from 'lucide-react';

export default function TrustBanner() {
  return (
    <div className="bg-orange-500 text-white py-3 overflow-hidden">
      <div>
        <div className="flex whitespace-nowrap animate-banner-scroll">
          <span className="text-lg font-semibold mr-16 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trusted by 30 million+ people
          </span>
          <span className="text-lg font-semibold mr-16 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            India's largest app for Hindu devotees
          </span>
          <span className="text-lg font-semibold mr-16 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            100% secure
          </span>
          <span className="text-lg font-semibold mr-16 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trusted by 30 million+ people
          </span>
          <span className="text-lg font-semibold mr-16 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            India's largest app for Hindu devotees
          </span>
          <span className="text-lg font-semibold mr-16 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            100% secure
          </span>
        </div>
      </div>
    </div>
  );
}