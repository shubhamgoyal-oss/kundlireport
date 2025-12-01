import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Search, RefreshCw, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { format } from "date-fns";

type TableName = 'dosha_calculator2' | 'analytics_events' | 'callback_requests' | 'traffic_sources';

interface FilterState {
  table: TableName;
  dateFrom: string;
  dateTo: string;
  utmSource: string;
  utmCampaign: string;
  country: string;
  eventName: string;
  doshaType: string;
}

export default function DataExplorer() {
  const [filters, setFilters] = useState<FilterState>({
    table: 'dosha_calculator2',
    dateFrom: '',
    dateTo: '',
    utmSource: '',
    utmCampaign: '',
    country: '',
    eventName: '',
    doshaType: '',
  });

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'filters' | 'templates'>('filters');
  const pageSize = 50;

  const analyticalQueries = [
    {
      name: "Daily Dosha Breakdown",
      description: "Count of each dosha type by date",
      query: async () => {
        const { data, error } = await supabase
          .from('dosha_calculator2')
          .select('date, mangal_dosha, kaal_sarp_dosha, pitra_dosha, sade_sati');
        if (error) throw error;
        return data;
      }
    },
    {
      name: "Top UTM Sources",
      description: "Traffic sources ranked by visitor count",
      query: async () => {
        const { data, error } = await supabase
          .from('traffic_sources')
          .select('utm_source, utm_campaign, country_code');
        if (error) throw error;
        return data;
      }
    },
    {
      name: "Conversion Funnel",
      description: "Funnel metrics from page view to puja click",
      query: async () => {
        const { data, error } = await supabase
          .from('analytics_events')
          .select('event_name, visitor_id, created_at')
          .in('event_name', ['page_view', 'calculate_dosha_clicked', 'dosha_calculate', 'srimandir_puja_click']);
        if (error) throw error;
        return data;
      }
    },
    {
      name: "Callback Requests by Country",
      description: "Callback requests grouped by country",
      query: async () => {
        const { data, error } = await supabase
          .from('callback_requests')
          .select('user_country, phone_number, created_at, status');
        if (error) throw error;
        return data;
      }
    },
    {
      name: "Recent Calculations",
      description: "Last 100 dosha calculations with user location",
      query: async () => {
        const { data, error } = await supabase
          .from('dosha_calculator2')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data;
      }
    }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      let query: any = supabase.from(filters.table).select('*', { count: 'exact' });

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Apply UTM filters (for traffic_sources and analytics_events)
      if (filters.utmSource && (filters.table === 'traffic_sources' || filters.table === 'analytics_events')) {
        query = query.eq('utm_source', filters.utmSource);
      }
      if (filters.utmCampaign && (filters.table === 'traffic_sources' || filters.table === 'analytics_events')) {
        query = query.eq('utm_campaign', filters.utmCampaign);
      }

      // Apply country filter
      if (filters.country && filters.table !== 'traffic_sources') {
        query = query.eq('user_country', filters.country);
      }
      if (filters.country && filters.table === 'traffic_sources') {
        query = query.eq('country_code', filters.country);
      }

      // Apply event name filter (for analytics_events)
      if (filters.eventName && filters.table === 'analytics_events') {
        query = query.eq('event_name', filters.eventName);
      }

      // Apply dosha filters (for dosha_calculator2)
      if (filters.doshaType && filters.table === 'dosha_calculator2') {
        query = query.eq(filters.doshaType, true);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data: result, error, count } = await query;

      if (error) throw error;

      setData(result || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.table, page]);

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values with commas or quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filters.table}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data exported successfully');
  };

  const renderTableColumns = () => {
    if (data.length === 0) return null;
    return Object.keys(data[0]).map(key => (
      <TableHead key={key} className="text-xs">{key}</TableHead>
    ));
  };

  const renderTableRows = () => {
    return data.map((row, idx) => (
      <TableRow key={idx}>
        {Object.values(row).map((value: any, cellIdx) => (
          <TableCell key={cellIdx} className="text-xs">
            {value === null || value === undefined 
              ? '-' 
              : typeof value === 'object' 
                ? JSON.stringify(value).substring(0, 50) + '...'
                : String(value).substring(0, 100)
            }
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const runQueryTemplate = async (queryFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await queryFn();
      setData(result || []);
      setTotalCount(result?.length || 0);
      setPage(1);
      toast.success('Query executed successfully');
    } catch (error) {
      console.error('Error running query:', error);
      toast.error('Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Explorer</h1>
          <p className="text-muted-foreground">Advanced analytics and data export</p>
        </div>
        <Button onClick={() => window.location.href = '/admin/analytics'} variant="outline">
          Back to Analytics
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="filters">Custom Filters</TabsTrigger>
          <TabsTrigger value="templates">Query Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-6 mt-6">

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and explore your data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Table</Label>
              <Select value={filters.table} onValueChange={(value: TableName) => {
                setFilters({ ...filters, table: value });
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dosha_calculator2">Dosha Calculator</SelectItem>
                  <SelectItem value="analytics_events">Analytics Events</SelectItem>
                  <SelectItem value="callback_requests">Callback Requests</SelectItem>
                  <SelectItem value="traffic_sources">Traffic Sources</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input 
                type="date" 
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input 
                type="date" 
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Input 
                placeholder="e.g., IN, US" 
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              />
            </div>

            {(filters.table === 'traffic_sources' || filters.table === 'analytics_events') && (
              <>
                <div className="space-y-2">
                  <Label>UTM Source</Label>
                  <Input 
                    placeholder="e.g., google, facebook" 
                    value={filters.utmSource}
                    onChange={(e) => setFilters({ ...filters, utmSource: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>UTM Campaign</Label>
                  <Input 
                    placeholder="e.g., summer_2024" 
                    value={filters.utmCampaign}
                    onChange={(e) => setFilters({ ...filters, utmCampaign: e.target.value })}
                  />
                </div>
              </>
            )}

            {filters.table === 'analytics_events' && (
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Select value={filters.eventName} onValueChange={(value) => setFilters({ ...filters, eventName: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All events</SelectItem>
                    <SelectItem value="page_view">page_view</SelectItem>
                    <SelectItem value="calculate_dosha_clicked">calculate_dosha_clicked</SelectItem>
                    <SelectItem value="dosha_calculate">dosha_calculate</SelectItem>
                    <SelectItem value="srimandir_puja_click">srimandir_puja_click</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {filters.table === 'dosha_calculator2' && (
              <div className="space-y-2">
                <Label>Dosha Type</Label>
                <Select value={filters.doshaType} onValueChange={(value) => setFilters({ ...filters, doshaType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All doshas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All doshas</SelectItem>
                    <SelectItem value="mangal_dosha">Mangal Dosha</SelectItem>
                    <SelectItem value="kaal_sarp_dosha">Kaal Sarp Dosha</SelectItem>
                    <SelectItem value="pitra_dosha">Pitra Dosha</SelectItem>
                    <SelectItem value="sade_sati">Sade Sati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchData} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Loading...' : 'Search'}
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => {
              setFilters({
                table: filters.table,
                dateFrom: '',
                dateTo: '',
                utmSource: '',
                utmCampaign: '',
                country: '',
                eventName: '',
                doshaType: '',
              });
              setPage(1);
            }} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results ({totalCount} records)</CardTitle>
          <CardDescription>
            Showing {data.length} records (Page {page} of {totalPages})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {renderTableColumns()}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={100} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={100} className="text-center">No data found</TableCell>
                  </TableRow>
                ) : (
                  renderTableRows()
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="templates" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytical Query Templates</CardTitle>
            <CardDescription>Pre-built queries for common analytical tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticalQueries.map((template, idx) => (
                <Card key={idx} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => runQueryTemplate(template.query)} 
                      disabled={loading}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Query
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results ({totalCount} records)</CardTitle>
            <CardDescription>Query results will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderTableColumns()}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={100} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={100} className="text-center">No data - run a query template above</TableCell>
                    </TableRow>
                  ) : (
                    renderTableRows()
                  )}
                </TableBody>
              </Table>
            </div>
            {data.length > 0 && (
              <Button onClick={exportToCSV} variant="outline" className="mt-4">
                <Download className="h-4 w-4 mr-2" />
                Export Results to CSV
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
}
