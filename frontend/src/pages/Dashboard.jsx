import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ClientList from "../components/ClientList";
import ReminderList from "../components/ReminderList";
import { getStats } from "../services/api";
import { Link } from "react-router-dom";

const Dashboard = () => {
    const [stats, setStats] = useState({ totalClients: 0, activeReminders: 0, messagesSent: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await getStats();
                setStats(data);
                setError(null);
            } catch (error) {
                console.error("Error fetching stats:", error);
                setError("Sync Error: Connection lost");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Polling every 5 seconds for "Live" feel
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            Dashboard
                            {error && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                                    {error}
                                </span>
                            )}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">Overview of your client reminders and activity.</p>
                    </div>
                    <div className="mt-4 flex space-x-3 md:mt-0">
                        <Link to="/add-client" className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                           Add Client
                        </Link>
                        <Link to="/create-reminder" className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                           New Reminder
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                    {/* Stat Card 1 */}
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
                        <div className="px-4 py-5 sm:p-6">
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                            <dd className="mt-1 text-3xl font-semibold text-gray-900">{loading ? "..." : stats.totalClients}</dd>
                        </div>
                    </div>
                    {/* Stat Card 2 */}
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
                        <div className="px-4 py-5 sm:p-6">
                            <dt className="text-sm font-medium text-gray-500 truncate">Active Reminders</dt>
                            <dd className="mt-1 text-3xl font-semibold text-gray-900">{loading ? "..." : stats.activeReminders}</dd>
                        </div>
                    </div>
                    {/* Stat Card 3 */}
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
                        <div className="px-4 py-5 sm:p-6">
                            <dt className="text-sm font-medium text-gray-500 truncate">Messages Sent</dt>
                            <dd className="mt-1 text-3xl font-semibold text-gray-900">{loading ? "..." : stats.messagesSent}</dd>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Client List (Takes up 2/3 on large screens) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Clients</h3>
                                <Link to="/clients" className="text-sm text-indigo-600 hover:text-indigo-900 font-medium transition-colors duration-200">
                                    View All &rarr;
                                </Link>
                            </div>
                            <div className="p-0">
                                <ClientList />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Reminder List (Takes up 1/3 on large screens) */}
                    <div className="lg:col-span-1">
                         <div className="bg-white shadow rounded-lg overflow-hidden h-full">
                            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Reminders</h3>
                            </div>
                            <div className="p-0">
                                <ReminderList />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
