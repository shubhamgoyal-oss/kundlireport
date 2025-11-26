import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, Users, MousePointerClick, CheckCircle, ShoppingBag, LogOut } from 'lucide-react';

interface HourlyFunnelData {
  hour: string;
  page_views: number;
  form_interactions: number;
  calculate_clicked: number;
  calculations_completed: number;
  puja_clicks: number;
  form_conversion_pct: number;
  click_conversion_pct: number;
  calc_completion_pct: number;
  puja_conversion_pct: number;
}

const AnalyticsDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<HourlyFunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  useEffect(() => {
    loadFunnelData();
  }, [timeRange]);

  const loadFunnelData = async () => {
    setLoading(true);
    try {
      const daysBack = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      const startDate = new Date(Date.now() - (daysBack * 86400000)).toISOString();
      
      const { data: analyticsData, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate);

      if (error) {
        console.error('Error loading analytics data:', error);
      } else if (analyticsData) {
        const processed = processAnalyticsData(analyticsData);
        setData(processed);
      }
    } catch (err) {
      console.error('Error loading funnel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (rawData: any[]): HourlyFunnelData[] => {
    const hourlyMap = new Map<string, any>();

    rawData.forEach(event => {
      const hour = new Date(event.created_at).toISOString().slice(0, 13) + ':00:00+00';
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, {
          hour,
          visitors: new Set(),
          page_views: new Set(),
          form_interactions: new Set(),
          calculate_clicked: new Set(),
          calculations_completed: new Set(),
          puja_clicks: new Set(),
        });
      }

      const hourData = hourlyMap.get(hour);
      hourData.visitors.add(event.visitor_id);

      if (event.event_name === 'page_view') hourData.page_views.add(event.visitor_id);
      if (event.event_name === 'form_field_filled') hourData.form_interactions.add(event.visitor_id);
      if (event.event_name === 'calculate_dosha_clicked') hourData.calculate_clicked.add(event.visitor_id);
      if (event.event_name === 'dosha_calculate') hourData.calculations_completed.add(event.visitor_id);
      if (event.event_name === 'srimandir_puja_click') hourData.puja_clicks.add(event.visitor_id);
    });

    return Array.from(hourlyMap.values())
      .map(h => ({
        hour: h.hour,
        page_views: h.page_views.size,
        form_interactions: h.form_interactions.size,
        calculate_clicked: h.calculate_clicked.size,
        calculations_completed: h.calculations_completed.size,
        puja_clicks: h.puja_clicks.size,
        form_conversion_pct: h.page_views.size > 0 ? (h.form_interactions.size / h.page_views.size * 100) : 0,
        click_conversion_pct: h.form_interactions.size > 0 ? (h.calculate_clicked.size / h.form_interactions.size * 100) : 0,
        calc_completion_pct: h.calculate_clicked.size > 0 ? (h.calculations_completed.size / h.calculate_clicked.size * 100) : 0,
        puja_conversion_pct: h.calculations_completed.size > 0 ? (h.puja_clicks.size / h.calculations_completed.size * 100) : 0,
      }))
      .sort((a, b) => b.hour.localeCompare(a.hour));
  };

  const totals = data.reduce((acc, curr) => ({
    page_views: acc.page_views + curr.page_views,
    form_interactions: acc.form_interactions + curr.form_interactions,
    calculate_clicked: acc.calculate_clicked + curr.calculate_clicked,
    calculations_completed: acc.calculations_completed + curr.calculations_completed,
    puja_clicks: acc.puja_clicks + curr.puja_clicks,
  }), { page_views: 0, form_interactions: 0, calculate_clicked: 0, calculations_completed: 0, puja_clicks: 0 });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
                <p className="text-muted-foreground mt-2">Hourly funnel metrics and conversion rates</p>
                {user && <p className="text-sm text-muted-foreground mt-1">Logged in as: {user.email}</p>}
              </div>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="ml-4">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="24h">24 Hours</TabsTrigger>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.page_views.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total visitors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Form Interactions</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.form_interactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.page_views > 0 ? ((totals.form_interactions / totals.page_views) * 100).toFixed(1) : 0}% of visitors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calculate Clicked</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.calculate_clicked.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.form_interactions > 0 ? ((totals.calculate_clicked / totals.form_interactions) * 100).toFixed(1) : 0}% conversion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calculations</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.calculations_completed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.calculate_clicked > 0 ? ((totals.calculations_completed / totals.calculate_clicked) * 100).toFixed(1) : 0}% success
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Puja Clicks</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.puja_clicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.calculations_completed > 0 ? ((totals.puja_clicks / totals.calculations_completed) * 100).toFixed(1) : 0}% engaged
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel Volume Over Time</CardTitle>
            <CardDescription>Unique visitors at each funnel stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={[...data].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} />
                <Legend />
                <Area type="monotone" dataKey="page_views" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" name="Page Views" />
                <Area type="monotone" dataKey="form_interactions" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" name="Form Interactions" />
                <Area type="monotone" dataKey="calculate_clicked" stackId="3" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" name="Calculate Clicked" />
                <Area type="monotone" dataKey="calculations_completed" stackId="4" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" name="Calculations" />
                <Area type="monotone" dataKey="puja_clicks" stackId="5" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" name="Puja Clicks" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Rates Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rates Over Time</CardTitle>
            <CardDescription>Percentage conversion at each funnel stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={[...data].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend />
                <Line type="monotone" dataKey="form_conversion_pct" stroke="hsl(var(--chart-1))" name="Page → Form %" strokeWidth={2} />
                <Line type="monotone" dataKey="click_conversion_pct" stroke="hsl(var(--chart-2))" name="Form → Click %" strokeWidth={2} />
                <Line type="monotone" dataKey="calc_completion_pct" stroke="hsl(var(--chart-3))" name="Click → Calc %" strokeWidth={2} />
                <Line type="monotone" dataKey="puja_conversion_pct" stroke="hsl(var(--chart-4))" name="Calc → Puja %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Hourly Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Breakdown</CardTitle>
            <CardDescription>Detailed funnel metrics by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={[...data].reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip labelFormatter={formatDate} />
                <Legend />
                <Bar dataKey="page_views" fill="hsl(var(--primary))" name="Page Views" />
                <Bar dataKey="form_interactions" fill="hsl(var(--chart-2))" name="Form Interactions" />
                <Bar dataKey="calculate_clicked" fill="hsl(var(--chart-3))" name="Calculate Clicked" />
                <Bar dataKey="calculations_completed" fill="hsl(var(--chart-4))" name="Calculations" />
                <Bar dataKey="puja_clicks" fill="hsl(var(--chart-5))" name="Puja Clicks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
