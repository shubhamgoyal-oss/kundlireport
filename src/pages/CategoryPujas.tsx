import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

const categoryPujas = {
  health: [
    {
      name: "Shiv Rudrabhishek",
      description: "Powerful healing and protection puja for health and well-being",
      url: "https://www.srimandir.com/epuja/6122-shiv-rudrabhishek-18th-aug-25"
    },
    {
      name: "Grishneshwar Jyotirlinga Special",
      description: "Sacred blessing for complete health and protection",
      url: "https://www.srimandir.com/epuja/grishneshwar-jyotirlinga-special-18th-aug-25"
    },
    {
      name: "Grishneshwar Jyotirling Special",
      description: "Divine intervention for health and spiritual healing",
      url: "https://www.srimandir.com/epuja/3342-grishneshwar-jyotirling-special-18th-aug-25"
    },
    {
      name: "Omkareshwar 11000 Special",
      description: "Supreme healing puja for physical and mental wellness",
      url: "https://www.srimandir.com/epuja/omkareshwar-11000-special-18th-aug-25"
    }
  ],
  career: [
    {
      name: "Academic Creative Excellence",
      description: "For professional growth, creativity, and career advancement",
      url: "https://www.srimandir.com/epuja/1121-academic-creative-excellence-21st-aug-2025"
    }
  ],
  "love-relationships": [
    {
      name: "Brihaspati Guru Graha Yagya Vishnu Sahasranama Puja",
      description: "For harmonious relationships and marital bliss",
      url: "https://www.srimandir.com/epuja/6656-brihaspati-guru-graha-yagya-vishnu-sahasranama-puja-21st-aug-2025"
    },
    {
      name: "Marriage Blessing Puja",
      description: "Divine blessings for love, marriage, and relationship harmony",
      url: "https://www.srimandir.com/epuja/1122-marriage-blessing-puja-21st-aug-2025"
    }
  ],
  finances: [
    {
      name: "Bagalamukhi Tantra Yukta Hawan",
      description: "Powerful puja for financial stability and wealth attraction",
      url: "https://www.srimandir.com/epuja/bagalamukhi-tantra-yukta-hawan-19th-aug-25"
    },
    {
      name: "21 Somvar Jyotirlinga Special",
      description: "Sacred ritual for financial abundance and prosperity",
      url: "https://www.srimandir.com/epuja/21-somvar-jyotirlinga-special-18th-aug-25"
    },
    {
      name: "Rin Nashak Special",
      description: "Debt removal and financial freedom puja",
      url: "https://www.srimandir.com/epuja/3389-rin-nashak-special-20th-aug-25"
    },
    {
      name: "Omkareshwar Jyotirling Special",
      description: "Divine blessings for wealth and financial growth",
      url: "https://www.srimandir.com/epuja/omkareshwar-jyotirling-special-11th-aug-25-1754907631"
    }
  ],
  "peace-of-mind": [
    {
      name: "Rahu Shanti Jaap Havan",
      description: "For mental peace, removing anxiety and negative influences",
      url: "https://www.srimandir.com/epuja/1111-rahu-shanti-jaap-havan-19th-aug-2025"
    },
    {
      name: "Last Day Sawan Special",
      description: "Sacred puja for inner peace and spiritual tranquility",
      url: "https://www.srimandir.com/epuja/3975-last-day-sawan-special-18th-aug-25"
    },
    {
      name: "Datta Mala Mantra",
      description: "Powerful mantra for mental clarity and peace of mind",
      url: "https://www.srimandir.com/epuja/5509-datta-mala-mantra-19th-august-2025"
    }
  ]
};

const categoryTitles = {
  health: "Health & Wellness Pujas",
  career: "Career & Success Pujas", 
  "love-relationships": "Love & Relationship Pujas",
  finances: "Finance & Prosperity Pujas",
  "peace-of-mind": "Peace of Mind & Mental Well-being Pujas"
};

export default function CategoryPujas() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pujas = category ? categoryPujas[category as keyof typeof categoryPujas] : [];
  const title = category ? categoryTitles[category as keyof typeof categoryTitles] : "";

  if (!category || !pujas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Category Not Found</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              onClick={() => navigate("/")} 
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{title}</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Select from our specially curated pujas for your spiritual journey and divine blessings.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {pujas.map((puja, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    {puja.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {puja.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.open(puja.url, '_blank', 'noopener,noreferrer')}
                    className="w-full"
                  >
                    Book Puja
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}