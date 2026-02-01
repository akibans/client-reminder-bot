import { useEffect, useState } from "react";
import { getReminders, deleteReminder, updateReminder, deleteRemindersBulk, retryReminder } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import AlertModal from "./AlertModal";

const ReminderList = () => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [selectedReminders, setSelectedReminders] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editTime, setEditTime] = useState("");

    // Pagination states
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Modal States
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'single', id: null });
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'error' });
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchReminders();
        const interval = setInterval(fetchReminders, 5000); 
        return () => clearInterval(interval);
    }, [activeTab, page, searchTerm]);

    const fetchReminders = async () => {
        try {
            const isSent = activeTab === "history" ? "true" : "false";
            const { data } = await getReminders({ 
                page, 
                limit: 10, 
                sent: isSent,
                search: searchTerm 
            });
            
            setReminders(data.reminders || []);
            setTotalPages(data.totalPages || 1);
            setTotalItems(data.total || 0);
        } catch (error) {
            console.error("Error fetching reminders", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setModalConfig({ isOpen: true, type: 'single', id });
    };

    const handleBulkDeleteClick = () => {
        if (selectedReminders.length === 0) return;
        setModalConfig({ isOpen: true, type: 'bulk', id: null });
    };

    const showAlert = (title, message, type = 'error') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const confirmDelete = async () => {
        const { type, id } = modalConfig;
        try {
            if (type === 'single') {
                await deleteReminder(id);
            } else {
                await deleteRemindersBulk(selectedReminders);
                setSelectedReminders([]);
            }
            fetchReminders();
        } catch (error) {
            console.error("Error during deletion", error);
            showAlert("Action Failed", error.response?.data?.message || "We encountered an error while trying to delete the reminder(s).");
        } finally {
            setModalConfig({ isOpen: false, type: 'single', id: null });
        }
    };

    const handleUpdate = async (id) => {
        try {
            await updateReminder(id, { scheduleAt: editTime });
            setEditingId(null);
            fetchReminders(); 
        } catch (error) {
            console.error("Error updating reminder", error);
            const msg = error.response?.data?.message || "Failed to reschedule the reminder.";
            showAlert("Update Failed", msg);
        }
    };

    const handleRetry = async (id) => {
        try {
            await retryReminder(id);
            fetchReminders();
        } catch (error) {
            console.error("Error retrying reminder", error);
            const msg = error.response?.data?.message || "Failed to retry the reminder.";
            showAlert("Retry Failed", msg);
        }
    };

    const toggleSelect = (id) => {
        if (selectedReminders.includes(id)) {
            setSelectedReminders(selectedReminders.filter(rid => rid !== id));
        } else {
            setSelectedReminders([...selectedReminders, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedReminders.length === reminders.length) {
            setSelectedReminders([]);
        } else {
            setSelectedReminders(reminders.map(r => r.id));
        }
    };

    // Note: Filtering is now handled on the server side via fetchReminders
    const filteredReminders = reminders; 

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading reminders...</div>;

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full ring-1 ring-gray-900/5">
            {/* Search Bar */}
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 bg-white">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by message or client..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50/30 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <nav className="-mb-px flex flex-1" aria-label="Tabs">
                    <button
                        onClick={() => { setActiveTab("upcoming"); setSelectedReminders([]); setPage(1); }}
                        className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab === "upcoming"
                                ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        Upcoming ({activeTab === "upcoming" ? totalItems : "-"})
                    </button>
                    <button
                        onClick={() => { setActiveTab("history"); setSelectedReminders([]); setPage(1); }}
                        className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 ${
                            activeTab === "history"
                                ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        History ({activeTab === "history" ? totalItems : "-"})
                    </button>
                </nav>
            </div>

            {/* Bulk Actions Header */}
            {filteredReminders.length > 0 && (
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedReminders.length === filteredReminders.length && filteredReminders.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        />
                        <span className="ml-2 text-xs text-gray-500">
                            {selectedReminders.length > 0 ? `${selectedReminders.length} Selected` : "Select All"}
                        </span>
                    </div>
                    {selectedReminders.length > 0 && (
                        <button
                            onClick={handleBulkDeleteClick}
                            className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors duration-200"
                        >
                            Delete Selected
                        </button>
                    )}
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto max-h-96">
                {filteredReminders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No {activeTab} reminders found.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {filteredReminders.map((reminder) => (
                            <li key={reminder.id} className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${selectedReminders.includes(reminder.id) ? 'bg-indigo-50/30' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedReminders.includes(reminder.id)}
                                            onChange={() => toggleSelect(reminder.id)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                {reminder.sendVia === 'email' ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">Email</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">WhatsApp</span>
                                                )}
                                                
                                                {/* Status Badge for History Tab */}
                                                {activeTab === 'history' && (
                                                    reminder.status === 'sent' ? (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            Delivered
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <span 
                                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 border border-rose-200 cursor-help"
                                                                title={reminder.failureReason || "Unknown Error"}
                                                            >
                                                                Failed
                                                            </span>
                                                            <button 
                                                                onClick={() => handleRetry(reminder.id)}
                                                                className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors"
                                                            >
                                                                Retry
                                                            </button>
                                                        </div>
                                                    )
                                                )}

                                                {/* Inline Date Editing */}
                                                {editingId === reminder.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="datetime-local" 
                                                            value={editTime}
                                                            onChange={(e) => setEditTime(e.target.value)}
                                                            className="text-xs border border-gray-300 rounded px-1 py-0.5"
                                                        />
                                                        <button onClick={() => handleUpdate(reminder.id)} className="text-green-600 hover:text-green-800 text-xs">💾</button>
                                                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">❌</button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        {formatDate(reminder.scheduleAt)}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2">
                                                {activeTab === 'upcoming' && !editingId && (
                                                    <button
                                                        onClick={() => { 
                                                            setEditingId(reminder.id); 
                                                            // Format: YYYY-MM-DDTHH:mm
                                                            try {
                                                                const date = new Date(reminder.scheduleAt);
                                                                // Adjust for local timezone to match datetime-local expectation
                                                                const tzOffset = date.getTimezoneOffset() * 60000;
                                                                const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                                                                setEditTime(localISOTime);
                                                            } catch (e) {
                                                                setEditTime("");
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-indigo-600 transition-transform transform hover:scale-110"
                                                        title="Reschedule"
                                                    >
                                                        ✎
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteClick(reminder.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-transform transform hover:scale-110"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-sm font-medium text-gray-900 truncate mb-1">
                                            {reminder.message}
                                        </p>
                                        
                                        <div className="flex items-center text-xs text-gray-500 space-x-2">
                                            <span>To:</span>
                                            <div className="flex flex-wrap gap-1">
                                                 {reminder.Clients && reminder.Clients.map(c => (
                                                     <span key={c.id} className="inline-block px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">
                                                         {c.name}
                                                     </span>
                                                 ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                        &larr; Prev
                    </button>
                    <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                        Next &rarr;
                    </button>
                </div>
            )}

            <ConfirmModal 
                isOpen={modalConfig.isOpen}
                title={modalConfig.type === 'bulk' ? `Delete ${selectedReminders.length} Reminders?` : "Delete Reminder?"}
                message={modalConfig.type === 'bulk' 
                    ? `Are you sure you want to delete these ${selectedReminders.length} reminders? This operation is permanent and cannot be reversed.` 
                    : "Are you sure you want to delete this reminder? You will need to recreate it if you change your mind."}
                confirmText={modalConfig.type === 'bulk' ? `Delete Selected` : "Delete"}
                onConfirm={confirmDelete}
                onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
            />

            <AlertModal 
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
            />
        </div>
    );
};

export default ReminderList;

