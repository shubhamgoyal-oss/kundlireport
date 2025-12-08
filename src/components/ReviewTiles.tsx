import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const reviews = [
  {
    id: 1,
    name: "Ramesh Chandra Bhatt",
    location: "Nagpur", 
    stars: 4,
    review: "The Dosha Calculator accurately detected Mangal Dosha in my kundli which my family pandit had also confirmed years ago. I booked the recommended puja and within months my delayed marriage finally happened. Truly life-changing tool."
  },
  {
    id: 2,
    name: "Aperna Pal",
    location: "Delhi",
    stars: 5,
    review: "I was skeptical at first but the Dosha Calculator found Shani Sade Sati which explained all my career struggles. The Shani puja they recommended brought such positive changes within weeks. The accuracy of this tool is remarkable and the remedies actually work."
  },
  {
    id: 3,
    name: "Shivraj Dobhi", 
    location: "Lucknow",
    stars: 4,
    review: "Finally found out why I was facing so many obstacles in life - the calculator detected Kaal Sarp Dosha. After doing the recommended puja at Trimbakeshwar, my business started improving. This tool saved me from visiting multiple astrologers."
  },
  {
    id: 4,
    name: "Anushka Varma",
    location: "Varanasi", 
    stars: 5,
    review: "The Dosha Calculator detected Pitra Dosha in my chart which no one had told me before. The detailed explanation helped me understand why our family was facing health issues. After the Pishach Mochan puja, things have improved significantly. Highly recommend this tool."
  },
  {
    id: 5,
    name: "Suhas Sharma",
    location: "Mumbai",
    stars: 4,
    review: "Such an easy and accurate tool to check doshas in your kundli. It found multiple doshas and suggested specific pujas for each one. The remedies have brought peace and prosperity to my family. Best kundli analysis I have ever used online."
  }
];

const StarRating = ({ stars }: { stars: number }) => {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, index) => (
        <svg
          key={index}
          className={`w-4 h-4 ${index < stars ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

export default function ReviewTiles() {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-muted/50 py-8 sm:py-12 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground mb-2">
          {t('reviews.heading')}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground text-center">
          {t('reviews.subheading')}
        </p>
      </div>
      
      <div className="relative">
        <div className="flex animate-scroll gap-4 sm:gap-6 w-max">
          {/* First set of reviews */}
          {reviews.map((review) => (
            <Card key={`first-${review.id}`} className="w-72 sm:w-80 flex-shrink-0 border-border shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base text-foreground">{review.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{review.location}</p>
                  </div>
                  <StarRating stars={review.stars} />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {review.review}
                </p>
              </CardContent>
            </Card>
          ))}
          
          {/* Duplicate set for seamless scrolling */}
          {reviews.map((review) => (
            <Card key={`second-${review.id}`} className="w-72 sm:w-80 flex-shrink-0 border-border shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base text-foreground">{review.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">{review.location}</p>
                  </div>
                  <StarRating stars={review.stars} />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
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