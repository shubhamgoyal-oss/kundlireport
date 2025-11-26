import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const phoneSchema = z.string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must be less than 15 digits")
  .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number");

interface CallbackFloaterProps {
  calculationId?: string | null;
}

export function CallbackFloater({ calculationId }: CallbackFloaterProps) {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOpenDialog = () => {
    setIsOpen(true);
    trackEvent('callback_floater_clicked', {
      metadata: { calculation_id: calculationId }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate phone number
    const validation = phoneSchema.safeParse(phoneNumber);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const visitorId = localStorage.getItem('analytics_visitor_id') || 'unknown';
      const sessionId = localStorage.getItem('analytics_session_id') || 'unknown';

      // Store callback request in analytics_events
      await supabase.from('analytics_events').insert({
        visitor_id: visitorId,
        session_id: sessionId,
        event_name: 'callback_requested',
        metadata: {
          phone_number: phoneNumber,
          calculation_id: calculationId,
          language: i18n.language,
          timestamp: new Date().toISOString()
        }
      });

      // Track event for analytics
      trackEvent('callback_form_submitted', {
        metadata: {
          calculation_id: calculationId,
          phone_length: phoneNumber.length
        }
      });

      toast.success(
        isHindi
          ? '✅ धन्यवाद! हम 6 घंटे के भीतर आपको कॉल करेंगे'
          : '✅ Thank you! We will call you back within 6 hours'
      );

      setIsOpen(false);
      setPhoneNumber('');
    } catch (error) {
      console.error('Error submitting callback request:', error);
      toast.error(
        isHindi
          ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें'
          : 'Something went wrong. Please try again'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floater Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleOpenDialog}
          className="h-14 px-6 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full"
          size="lg"
        >
          <Phone className="w-5 h-5 mr-2 animate-pulse" />
          <span className="font-semibold">
            {isHindi ? 'कॉलबैक' : 'Request Callback'}
          </span>
        </Button>
      </div>

      {/* Callback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Phone className="w-6 h-6 text-primary" />
              {isHindi ? 'विशेषज्ञ से बात करें' : 'Talk to an Expert'}
            </DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-2">
              <p className="text-base font-medium text-foreground">
                {isHindi
                  ? '🌟 एक विशेषज्ञ अब आपको कॉल करेंगे और मुफ्त में विस्तृत मार्गदर्शन देंगे'
                  : '🌟 An expert will call you and provide detailed guidance free of cost'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHindi
                  ? 'कॉलबैक प्राप्त करने के लिए अपना फ़ोन नंबर दर्ज करें। हम अगले 6 घंटों के भीतर आपको कॉल करेंगे।'
                  : 'Enter your phone number to receive a callback. We will call you back within the next 6 hours.'}
              </p>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base font-medium">
                {isHindi ? 'फ़ोन नंबर' : 'Phone Number'}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={isHindi ? '+91 XXXXX XXXXX' : '+91 XXXXX XXXXX'}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setError('');
                }}
                className="text-lg h-12"
                disabled={isSubmitting}
                required
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !phoneNumber}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isHindi ? 'भेजा जा रहा है...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    {isHindi ? 'कॉलबैक का अनुरोध करें' : 'Request Callback'}
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              {isHindi
                ? '💬 हमारे विशेषज्ञ सुबह 9 बजे से रात 9 बजे तक उपलब्ध हैं'
                : '💬 Our experts are available from 9 AM to 9 PM'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
