import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, Users, MousePointerClick, CheckCircle, ShoppingBag } from 'lucide-react';

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

interface ISTHourlyData {
  hour: number;
  unique_visitors: number;
  pct_calculate_dosha_clicked: number;
  pct_book_puja_clicked: number;
  pct_failed_calculate: number;
}

interface DailySummaryRow {
  date: string;
  unique_visitors: number;
  pct_form_interactions: number;
  pct_calculate_clicked: number;
  pct_calculations_completed: number;
  pct_puja_clicks: number;
}

const AnalyticsDashboard = () => {
  const [data, setData] = useState<HourlyFunnelData[]>([]);
  const [istData, setIstData] = useState<ISTHourlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadFunnelData();
    loadTodayISTData();
  }, [timeRange]);

  const loadFunnelData = async () => {
    setLoading(true);
    try {
      const daysBack = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      const startDate = new Date(Date.now() - daysBack * 86400000).toISOString();

      const { data: analyticsData, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate);

      console.log('AnalyticsDashboard: fetched analytics_events', {
        timeRange,
        startDate,
        count: analyticsData?.length ?? 0,
        error,
      });

      if (error) {
        console.error('Error loading analytics data:', error);
        setData([]);
        setDailyData([]);
      } else if (analyticsData && analyticsData.length > 0) {
        const processed = processAnalyticsData(analyticsData);
        const daily = processDailyData(analyticsData);
        setData(processed);
        setDailyData(daily);
      } else {
        setData([]);
        setDailyData([]);
      }
    } catch (err) {
      console.error('Error loading funnel data:', err);
      setData([]);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayISTData = async () => {
    try {
      // Get today's data
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const { data: analyticsData, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startOfDay.toISOString());

      console.log('AnalyticsDashboard: fetched today IST analytics_events', {
        startOfDay: startOfDay.toISOString(),
        count: analyticsData?.length ?? 0,
        error,
      });

      if (error) {
        console.error('Error loading IST data:', error);
        return;
      }

      if (!analyticsData || analyticsData.length === 0) {
        setIstData([]);
        return;
      }

      // Process data by IST hour
      const hourlyMap = new Map<number, {
        visitors: Set<string>;
        calculateClicked: Set<string>;
        pujaClicked: Set<string>;
        failed: Set<string>;
      }>();

      analyticsData.forEach(event => {
        // Convert to IST (UTC+5:30)
        const utcDate = new Date(event.created_at);
        const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
        const hour = istDate.getHours();

        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, {
            visitors: new Set(),
            calculateClicked: new Set(),
            pujaClicked: new Set(),
            failed: new Set(),
          });
        }

        const hourData = hourlyMap.get(hour)!;
        hourData.visitors.add(event.visitor_id);

        if (event.event_name === 'calculate_dosha_clicked') {
          hourData.calculateClicked.add(event.visitor_id);
        }
        if (event.event_name === 'srimandir_puja_click') {
          hourData.pujaClicked.add(event.visitor_id);
        }
        if (event.event_name === 'dosha_calculate_unsuccessful') {
          hourData.failed.add(event.visitor_id);
        }
      });

      // Convert to array format
      const processed = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour,
        unique_visitors: data.visitors.size,
        pct_calculate_dosha_clicked: data.visitors.size > 0 
          ? Number(((data.calculateClicked.size / data.visitors.size) * 100).toFixed(2))
          : 0,
        pct_book_puja_clicked: data.visitors.size > 0
          ? Number(((data.pujaClicked.size / data.visitors.size) * 100).toFixed(2))
          : 0,
        pct_failed_calculate: data.visitors.size > 0
          ? Number(((data.failed.size / data.visitors.size) * 100).toFixed(2))
          : 0,
      })).sort((a, b) => a.hour - b.hour);

      setIstData(processed);
    } catch (err) {
      console.error('Error loading IST hourly data:', err);
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

  const totals = data.reduce(
    (acc, curr) => ({
      page_views: acc.page_views + curr.page_views,
      form_interactions: acc.form_interactions + curr.form_interactions,
      calculate_clicked: acc.calculate_clicked + curr.calculate_clicked,
      calculations_completed: acc.calculations_completed + curr.calculations_completed,
      puja_clicks: acc.puja_clicks + curr.puja_clicks,
    }),
    { page_views: 0, form_interactions: 0, calculate_clicked: 0, calculations_completed: 0, puja_clicks: 0 },
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });
  };

  const processDailyData = (rawData: any[]): DailySummaryRow[] => {
    const dailyMap = new Map<
      string,
      {
        visitors: Set<string>;
        form_interactions: Set<string>;
        calculate_clicked: Set<string>;
        calculations_completed: Set<string>;
        puja_clicks: Set<string>;
      }
    >();

    rawData.forEach((event) => {
      const dateKey = new Date(event.created_at).toISOString().slice(0, 10);
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          visitors: new Set(),
          form_interactions: new Set(),
          calculate_clicked: new Set(),
          calculations_completed: new Set(),
          puja_clicks: new Set(),
        });
      }

      const dayData = dailyMap.get(dateKey)!;
      dayData.visitors.add(event.visitor_id);

      if (event.event_name === 'form_field_filled') dayData.form_interactions.add(event.visitor_id);
      if (event.event_name === 'calculate_dosha_clicked') dayData.calculate_clicked.add(event.visitor_id);
      if (event.event_name === 'dosha_calculate') dayData.calculations_completed.add(event.visitor_id);
      if (event.event_name === 'srimandir_puja_click') dayData.puja_clicks.add(event.visitor_id);
    });

    const rows: DailySummaryRow[] = Array.from(dailyMap.entries()).map(([date, day]) => {
      const visitorsCount = day.visitors.size || 1; // avoid division by zero
      const pct_form_interactions = (day.form_interactions.size / visitorsCount) * 100;
      const pct_calculate_clicked = (day.calculate_clicked.size / visitorsCount) * 100;
      const pct_calculations_completed = (day.calculations_completed.size / visitorsCount) * 100;
      const pct_puja_clicks = (day.puja_clicks.size / visitorsCount) * 100;

      return {
        date,
        unique_visitors: visitorsCount,
        pct_form_interactions: Number(pct_form_interactions.toFixed(2)),
        pct_calculate_clicked: Number(pct_calculate_clicked.toFixed(2)),
        pct_calculations_completed: Number(pct_calculations_completed.toFixed(2)),
        pct_puja_clicks: Number(pct_puja_clicks.toFixed(2)),
      };
    });

    return rows.sort((a, b) => b.unique_visitors - a.unique_visitors);
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
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">Hourly funnel metrics and conversion rates</p>
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
        {data.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No analytics data for selected period</CardTitle>
              <CardDescription>
                Try broadening the time range or confirm that events are being tracked.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
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
                  {totals.page_views > 0
                    ? ((totals.form_interactions / totals.page_views) * 100).toFixed(1)
                    : 0}
                  % of visitors
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
                  {totals.form_interactions > 0
                    ? ((totals.calculate_clicked / totals.form_interactions) * 100).toFixed(1)
                    : 0}
                  % conversion
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
                  {totals.calculate_clicked > 0
                    ? ((totals.calculations_completed / totals.calculate_clicked) * 100).toFixed(1)
                    : 0}
                  % success
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
                  {totals.calculations_completed > 0
                    ? ((totals.puja_clicks / totals.calculations_completed) * 100).toFixed(1)
                    : 0}
                  % engaged
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Funnel Volume Chart */}
        {data.length > 0 && (
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
                  <Area
                    type="monotone"
                    dataKey="page_views"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    name="Page Views"
                  />
                  <Area
                    type="monotone"
                    dataKey="form_interactions"
                    stackId="2"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    name="Form Interactions"
                  />
                  <Area
                    type="monotone"
                    dataKey="calculate_clicked"
                    stackId="3"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    name="Calculate Clicked"
                  />
                  <Area
                    type="monotone"
                    dataKey="calculations_completed"
                    stackId="4"
                    stroke="hsl(var(--chart-4))"
                    fill="hsl(var(--chart-4))"
                    name="Calculations"
                  />
                  <Area
                    type="monotone"
                    dataKey="puja_clicks"
                    stackId="5"
                    stroke="hsl(var(--chart-5))"
                    fill="hsl(var(--chart-5))"
                    name="Puja Clicks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Conversion Rates Chart */}
        {data.length > 0 && (
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
                  <Tooltip
                    labelFormatter={formatDate}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="form_conversion_pct"
                    stroke="hsl(var(--chart-1))"
                    name="Page → Form %"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="click_conversion_pct"
                    stroke="hsl(var(--chart-2))"
                    name="Form → Click %"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="calc_completion_pct"
                    stroke="hsl(var(--chart-3))"
                    name="Click → Calc %"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="puja_conversion_pct"
                    stroke="hsl(var(--chart-4))"
                    name="Calc → Puja %"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detailed Hourly Bar Chart */}
        {data.length > 0 && (
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
                  <Bar
                    dataKey="form_interactions"
                    fill="hsl(var(--chart-2))"
                    name="Form Interactions"
                  />
                  <Bar
                    dataKey="calculate_clicked"
                    fill="hsl(var(--chart-3))"
                    name="Calculate Clicked"
                  />
                  <Bar
                    dataKey="calculations_completed"
                    fill="hsl(var(--chart-4))"
                    name="Calculations"
                  />
                  <Bar dataKey="puja_clicks" fill="hsl(var(--chart-5))" name="Puja Clicks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}


        {/* Daily Summary Table */}
        {dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Conversion Summary</CardTitle>
              <CardDescription>
                Percentage of unique visitors completing each step by day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-right py-3 px-4 font-medium">Unique Visitors</th>
                      <th className="text-right py-3 px-4 font-medium">% Form Interactions</th>
                      <th className="text-right py-3 px-4 font-medium">% Calculate Clicked</th>
                      <th className="text-right py-3 px-4 font-medium">% Calculations Completed</th>
                      <th className="text-right py-3 px-4 font-medium">% Puja Clicked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map((row) => (
                      <tr key={row.date} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">
                          {new Date(row.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="text-right py-3 px-4">{row.unique_visitors}</td>
                        <td className="text-right py-3 px-4">{row.pct_form_interactions}%</td>
                        <td className="text-right py-3 px-4">{row.pct_calculate_clicked}%</td>
                        <td className="text-right py-3 px-4">{row.pct_calculations_completed}%</td>
                        <td className="text-right py-3 px-4">{row.pct_puja_clicks}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Hourly Performance (IST) */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Hourly Performance (IST)</CardTitle>
            <CardDescription>
              Hourly breakdown of key metrics in Indian Standard Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {istData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data available for today
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Hour (IST)</th>
                      <th className="text-right py-3 px-4 font-medium">Unique Visitors</th>
                      <th className="text-right py-3 px-4 font-medium">% Calculate Clicked</th>
                      <th className="text-right py-3 px-4 font-medium">% Puja Clicked</th>
                      <th className="text-right py-3 px-4 font-medium">% Failed Calculate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {istData.map((row) => (
                      <tr key={row.hour} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">
                          {String(row.hour).padStart(2, '0')}:00
                        </td>
                        <td className="text-right py-3 px-4">{row.unique_visitors}</td>
                        <td className="text-right py-3 px-4">
                          {row.pct_calculate_dosha_clicked}%
                        </td>
                        <td className="text-right py-3 px-4">
                          {row.pct_book_puja_clicked}%
                        </td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={row.pct_failed_calculate > 0 ? 'text-destructive' : ''}
                          >
                            {row.pct_failed_calculate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-medium">
                      <td className="py-3 px-4">Total</td>
                      <td className="text-right py-3 px-4">
                        {istData.reduce((sum, row) => sum + row.unique_visitors, 0)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {istData.length > 0
                          ? (
                              istData.reduce(
                                (sum, row) => sum + row.pct_calculate_dosha_clicked,
                                0,
                              ) / istData.length
                            ).toFixed(2)
                          : 0}
                        % avg
                      </td>
                      <td className="text-right py-3 px-4">
                        {istData.length > 0
                          ? (
                              istData.reduce(
                                (sum, row) => sum + row.pct_book_puja_clicked,
                                0,
                              ) / istData.length
                            ).toFixed(2)
                          : 0}
                        % avg
                      </td>
                      <td className="text-right py-3 px-4">
                        {istData.length > 0
                          ? (
                              istData.reduce(
                                (sum, row) => sum + row.pct_failed_calculate,
                                0,
                              ) / istData.length
                            ).toFixed(2)
                          : 0}
                        % avg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
