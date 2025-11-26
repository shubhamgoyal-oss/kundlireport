import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, FlaskConical, Users, TrendingUp, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface Experiment {
  id: string;
  name: string;
  description: string | null;
  variants: any;
  is_active: boolean;
  traffic_allocation: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface ExperimentStats {
  experiment: string;
  variant: string;
  exposed_users: number;
  converted_users: number;
  conversion_rate: number;
}

export default function ExperimentAdmin() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [stats, setStats] = useState<ExperimentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  useEffect(() => {
    loadExperiments();
    loadStats();
  }, []);

  const loadExperiments = async () => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExperiments(data || []);
    } catch (error) {
      console.error('Error loading experiments:', error);
      toast.error('Failed to load experiments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // This is a simplified version - you'd want to create a proper view or function
      const { data, error } = await supabase
        .from('analytics_events')
        .select('metadata, visitor_id')
        .like('event_name', 'experiment_%');

      if (error) throw error;

      // Process stats (simplified example)
      const statsMap = new Map<string, ExperimentStats>();
      
      data?.forEach((event: any) => {
        const experimentName = event.metadata?.experiment_name;
        const variantName = event.metadata?.variant_name;
        
        if (experimentName && variantName) {
          const key = `${experimentName}-${variantName}`;
          if (!statsMap.has(key)) {
            statsMap.set(key, {
              experiment: experimentName,
              variant: variantName,
              exposed_users: 0,
              converted_users: 0,
              conversion_rate: 0,
            });
          }
        }
      });

      setStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const toggleExperiment = async (experimentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('experiments')
        .update({ is_active: !currentStatus })
        .eq('id', experimentId);

      if (error) throw error;

      toast.success(`Experiment ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadExperiments();
    } catch (error) {
      console.error('Error toggling experiment:', error);
      toast.error('Failed to update experiment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <FlaskConical className="w-8 h-8" />
              A/B Testing Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor your experiments
            </p>
            {user && <p className="text-sm text-muted-foreground mt-1">Logged in as: {user.email}</p>}
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Experiments List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Experiments</CardTitle>
            <CardDescription>
              Toggle experiments on/off and view their configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {experiments.length === 0 ? (
              <div className="text-center py-12">
                <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No experiments yet</p>
                <p className="text-sm text-muted-foreground">
                  Create an experiment by inserting data into the experiments table
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {experiments.map((exp) => (
                  <Card key={exp.id} className="border-l-4" style={{
                    borderLeftColor: exp.is_active ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                  }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{exp.name}</CardTitle>
                            <Badge variant={exp.is_active ? 'default' : 'secondary'}>
                              {exp.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {exp.description && (
                            <CardDescription>{exp.description}</CardDescription>
                          )}
                        </div>
                        <Switch
                          checked={exp.is_active}
                          onCheckedChange={() => toggleExperiment(exp.id, exp.is_active)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Variants</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(exp.variants) && exp.variants.map((v: any, idx: number) => (
                              <Badge key={idx} variant="outline">
                                {v.name} ({v.weight}%)
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Traffic Allocation</p>
                          <p className="font-medium">{(exp.traffic_allocation * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Created</p>
                          <p className="font-medium">
                            {new Date(exp.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Total Experiments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{experiments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Active Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {experiments.filter(e => e.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Variants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {experiments.reduce((sum, e) => 
                  sum + (Array.isArray(e.variants) ? e.variants.length : 0), 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Create an Experiment</h4>
              <p className="text-sm text-muted-foreground">
                Use the Cloud → Database tab or SQL editor to insert experiments:
              </p>
              <pre className="mt-2 p-3 bg-background rounded-md text-xs overflow-x-auto">
{`INSERT INTO experiments (name, description, variants, is_active)
VALUES (
  'hero_cta_test',
  'Test different CTA button text',
  '[
    {"name": "control", "weight": 50},
    {"name": "variant_a", "weight": 50}
  ]'::jsonb,
  true
);`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Use in Components</h4>
              <p className="text-sm text-muted-foreground">
                Import the useExperiment hook in your React components
              </p>
              <pre className="mt-2 p-3 bg-background rounded-md text-xs overflow-x-auto">
{`const { variant, trackEvent } = useExperiment('hero_cta_test');

<button onClick={() => trackEvent('cta_clicked')}>
  {variant === 'control' ? 'Get Started' : 'Try Now'}
</button>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. View Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Check <code className="text-xs bg-background px-1 py-0.5 rounded">docs/AB_TESTING_GUIDE.md</code> for complete documentation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
