import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const reviews = [
  {
    id: 1,
    name: "Ramesh Chandra Bhatt",
    location: "Nagpur", 
    stars: 4,
    review: "So many puja options for all the devotees. Great to get the grace of god from our homes. Most authentic and trustworthy puja service compared to others."
  },
  {
    id: 2,
    name: "Aperna Pal",
    location: "Delhi",
    stars: 5,
    review: "I really like the whole process of puja at Sri Mandir. Puja is conducted properly and customer support is available throughout the process. I asked questions to Mamta Maam and she resolved my queries. Most genuine and authentic."
  },
  {
    id: 3,
    name: "Shivraj Dobhi", 
    location: "Lucknow",
    stars: 4,
    review: "Liked the fact that we can book puja online else we have to travel to get everything done. Felt very nice to hear my name and gotra during the puja of Mahadev. Prasad was also received in time."
  },
  {
    id: 4,
    name: "Anushka Varma",
    location: "Varanasi", 
    stars: 5,
    review: "Booking puja online made the entire process so convenient. I was able to participate in the rituals from home and even my family members joined in virtually. The updates were timely, and receiving prasad at home felt very special."
  },
  {
    id: 5,
    name: "Suhas Sharma",
    location: "Mumbai",
    stars: 4,
    review: "Loved how simple and smooth the online puja booking experience was. The priest mentioned my family's details during the puja, which made it feel very personal. We were updated at every step, and the prasad arrived quickly."
  }
];

const StarRating = ({ stars }: { stars: number }) => {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, index) => (
        <img
          key={index}
          src="/lovable-uploads/a398c33a-4475-4e18-ba7d-367b95f5c4c8.png"
          alt="Star"
          className={`w-4 h-4 ${index < stars ? 'opacity-100' : 'opacity-30'}`}
        />
      ))}
    </div>
  );
};

export default function ReviewTiles() {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-muted/50 py-12 overflow-hidden">
      <div className="container mx-auto px-6 mb-8">
        <h2 className="text-2xl font-bold text-center text-foreground mb-2">
          {t('reviews.heading')}
        </h2>
        <p className="text-muted-foreground text-center">
          {t('reviews.subheading')}
        </p>
      </div>
      
      <div className="relative">
        <div className="flex animate-scroll gap-6 w-max">
          {/* First set of reviews */}
          {reviews.map((review) => (
            <Card key={`first-${review.id}`} className="w-80 flex-shrink-0 border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground">{review.name}</h4>
                    <p className="text-sm text-muted-foreground">{review.location}</p>
                  </div>
                  <StarRating stars={review.stars} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.review}
                </p>
              </CardContent>
            </Card>
          ))}
          
          {/* Duplicate set for seamless scrolling */}
          {reviews.map((review) => (
            <Card key={`second-${review.id}`} className="w-80 flex-shrink-0 border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-foreground">{review.name}</h4>
                    <p className="text-sm text-muted-foreground">{review.location}</p>
                  </div>
                  <StarRating stars={review.stars} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.review}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}