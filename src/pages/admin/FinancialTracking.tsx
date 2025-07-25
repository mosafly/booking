import React, { useState, useEffect } from "react";
import { useSupabase } from "@/lib/contexts/Supabase";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Calendar, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/dashboard/spinner";
import { formatFCFA } from "@/lib/utils/currency";

const FinancialTracking: React.FC = () => {
  const { supabase } = useSupabase();

  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("month"); // 'week', 'month', 'year'
  const [monthlyRevenue, setMonthlyRevenue] = useState<
    { name: string; revenue: number }[]
  >([]);
  const [courtRevenue, setCourtRevenue] = useState<
    { name: string; value: number }[]
  >([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueByStatus, setRevenueByStatus] = useState({
    confirmed: 0,
    pending: 0,
    cancelled: 0,
  });

  // Colors for pie chart
  const COLORS = ["#3366CC", "#FF9F1C", "#28A745", "#DC3545"];

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const today = new Date();
        let startDate: Date;
        let monthsToFetch = 6;

        if (period === "week") {
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          monthsToFetch = 1;
        } else if (period === "month") {
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 1);
          monthsToFetch = 1;
        } else {
          // year
          startDate = new Date(today);
          startDate.setFullYear(today.getFullYear() - 1);
          monthsToFetch = 12;
        }

        // Fetch monthly revenue data
        const monthlyData = [];
        let runningTotal = 0;

        for (let i = 0; i < monthsToFetch; i++) {
          const currentMonth = subMonths(today, i);
          const firstDay = startOfMonth(currentMonth);
          const lastDay = endOfMonth(currentMonth);

          const { data: revenueData, error: revenueError } = await supabase
            .from("reservations")
            .select("total_price, status")
            .gte("start_time", firstDay.toISOString())
            .lte("start_time", lastDay.toISOString());

          if (revenueError) throw revenueError;

          const monthRevenue =
            revenueData?.reduce((acc, curr) => {
              return acc + (curr.total_price || 0);
            }, 0) || 0;

          const confirmedRevenue =
            revenueData
              ?.filter((r) => r.status === "confirmed")
              .reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;

          const pendingRevenue =
            revenueData
              ?.filter((r) => r.status === "pending")
              .reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;

          const cancelledRevenue =
            revenueData
              ?.filter((r) => r.status === "cancelled")
              .reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;

          monthlyData.push({
            name: format(currentMonth, "MMM"),
            revenue: monthRevenue,
          });

          // Only count the first month in total (current month)
          if (i === 0) {
            runningTotal = monthRevenue;
            setRevenueByStatus({
              confirmed: confirmedRevenue,
              pending: pendingRevenue,
              cancelled: cancelledRevenue,
            });
          }
        }

        setTotalRevenue(runningTotal);
        setMonthlyRevenue(monthlyData.reverse());

        // Fetch revenue by court
        const { data: courtData, error: courtError } = await supabase
          .from("reservations")
          .select(
            `
            total_price,
            courts:court_id (id, name)
          `,
          )
          .gte("start_time", startDate.toISOString())
          .lte("start_time", today.toISOString());

        if (courtError) throw courtError;

        // Group by court and calculate total revenue
        const courtTotals: Record<string, { name: string; value: number }> = {};

        courtData?.forEach((item) => {
          const courtId = item.courts[0].id;
          const courtName = item.courts[0].name;

          if (!courtTotals[courtId]) {
            courtTotals[courtId] = { name: courtName, value: 0 };
          }

          courtTotals[courtId].value += item.total_price || 0;
        });

        setCourtRevenue(Object.values(courtTotals));
      } catch (error) {
        console.error("Error fetching financial data:", error);
        toast.error("Failed to load financial data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinancialData();
  }, [supabase, period]);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriod(e.target.value);
  };

  const handleExportData = () => {
    // In a real app, this would generate a CSV or PDF report
    toast.success("Financial report download started");
  };

  const getPercentage = (value: number) => {
    return totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Financial Tracking
          </h1>
          <p className="text-gray-600">
            Monitor revenue and financial performance
          </p>
        </div>
        <button
          onClick={handleExportData}
          className="btn btn-outline flex items-center"
        >
          <Download size={16} className="mr-1" />
          Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-6 rounded-md shadow-sm">
          <div className="flex items-center mb-2">
            <DollarSign size={24} className="text-[var(--primary)]" />
            <h3 className="text-sm font-medium text-gray-700 ml-1">
              Total Revenue
            </h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${totalRevenue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {period === "week"
              ? "This week"
              : period === "month"
                ? "This month"
                : "This year"}
          </p>
        </div>

        <div className="bg-green-50 p-6 rounded-md shadow-sm">
          <div className="flex items-center mb-2">
            <DollarSign size={24} className="text-[var(--secondary)]" />
            <h3 className="text-sm font-medium text-gray-700 ml-1">
              Confirmed Revenue
            </h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${revenueByStatus.confirmed.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {getPercentage(revenueByStatus.confirmed)}% of total
          </p>
        </div>

        <div className="bg-yellow-50 p-6 rounded-md shadow-sm">
          <div className="flex items-center mb-2">
            <DollarSign size={24} className="text-[var(--accent)]" />
            <h3 className="text-sm font-medium text-gray-700 ml-1">
              Pending Revenue
            </h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${revenueByStatus.pending.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {getPercentage(revenueByStatus.pending)}% of total
          </p>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-lg font-bold">Revenue Over Time</h2>
          <div className="mt-3 sm:mt-0">
            <div className="flex items-center">
              <Calendar size={16} className="mr-1 text-gray-500" />
              <select
                value={period}
                onChange={handlePeriodChange}
                className="form-input py-1 pl-2 pr-8"
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="year">Last 12 months</option>
              </select>
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyRevenue}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip
                formatter={(value) => [`$${value}`, "Revenue"]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "0.5rem",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  border: "1px solid #e5e7eb",
                  padding: "0.5rem",
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="var(--primary)" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-md shadow-sm p-6">
          <h2 className="text-lg font-bold mb-6">Revenue by Court</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courtRevenue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {courtRevenue.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`$${value}`, "Revenue"]}
                  labelStyle={{ color: "#374151" }}
                  contentStyle={{
                    backgroundColor: "white",
                    borderRadius: "0.5rem",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    border: "1px solid #e5e7eb",
                    padding: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6">
          <h2 className="text-lg font-bold mb-6">Revenue by Status</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Confirmed", value: revenueByStatus.confirmed },
                    { name: "Pending", value: revenueByStatus.pending },
                    { name: "Cancelled", value: revenueByStatus.cancelled },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  <Cell fill="var(--secondary)" />
                  <Cell fill="var(--accent)" />
                  <Cell fill="var(--danger)" />
                </Pie>
                <Tooltip
                  formatter={(value) => [`$${value}`, "Revenue"]}
                  labelStyle={{ color: "#374151" }}
                  contentStyle={{
                    backgroundColor: "white",
                    borderRadius: "0.5rem",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    border: "1px solid #e5e7eb",
                    padding: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Court
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Sample transaction data - in a real app, this would be fetched from the database */}
              {[1, 2, 3, 4, 5].map((_, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(2023, 0, index + 1), "MMM dd, yyyy")}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    Court {index + 1}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    user{index + 1}@example.com
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(Math.random() * 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {index % 3 === 0 && (
                      <span className="badge badge-success">Confirmed</span>
                    )}
                    {index % 3 === 1 && (
                      <span className="badge badge-warning">Pending</span>
                    )}
                    {index % 3 === 2 && (
                      <span className="badge badge-danger">Cancelled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialTracking;
