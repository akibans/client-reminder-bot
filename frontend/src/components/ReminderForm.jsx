import { useState, useEffect } from "react";
import { createReminder, getClients } from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import TemplatePicker from "./TemplatePicker";

const ReminderForm = () => {
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [form, setForm] = useState({ message: "", sendVia: "email", scheduleAt: "" });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [appliedTemplate, setAppliedTemplate] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data } = await getClients({ limit: 1000 });
                setClients(data.clients || []);
            } catch (error) {
                console.error("Failed to fetch clients", error);
            }
        };
        fetchClients();
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const toggleClient = (clientId) => {
        setSelectedClients(prev => 
            prev.includes(clientId) 
                ? prev.filter(id => id !== clientId) 
                : [...prev, clientId]
        );
    };

    const handleTemplateSelect = (template) => {
        setForm({ ...form, message: template.processedContent || template.content });
        setAppliedTemplate(template);
    };

    const getClientData = () => {
        if (selectedClients.length === 1) {
            const client = clients.find(c => c.id === selectedClients[0]);
            if (client) {
                return {
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                };
            }
        }
        return {};
    };

    const getUnreplacedVars = () => {
        const matches = form.message.match(/\{\{(\w+)\}\}/g) || [];
        return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
    };

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fireConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedClients.length === 0) {
            toast.warning("Please select at least one client");
            return;
        }
        
        const unreplacedVars = getUnreplacedVars();
        if (unreplacedVars.length > 0) {
            const proceed = window.confirm(
                `Your message contains ${unreplacedVars.length} unreplaced variable(s): ${unreplacedVars.map(v => `{{${v}}}`).join(', ')}\n\nDo you want to send anyway?`
            );
            if (!proceed) return;
        }
        
        setLoading(true);
        try {
            // Frontend sends: message, sendVia, scheduleAt, clients
            // Backend expects: message, sendVia, scheduleAt, clients
            await createReminder({ ...form, clients: selectedClients });
            fireConfetti();
            toast.success("Reminder scheduled! 🎉", {
                description: `${selectedClients.length} client(s) will be notified via ${form.sendVia}`
            });
            setTimeout(() => navigate("/"), 500);
        } catch (error) {
            console.error("Error creating reminder", error);
            const errors = error.response?.data?.errors;
            // Handle both 'message' and 'error' fields from backend
            const message = error.response?.data?.message || error.response?.data?.error || "Failed to schedule reminder";
            if (errors && errors.length > 0) {
                toast.error(message, { description: errors.join(', ') });
            } else {
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const unreplacedVars = getUnreplacedVars();

    return (
        <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in">
            <div className="px-6 py-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Reminder</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Automate your client follow-ups</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reminder Message</label>
                            <TemplatePicker 
                                onSelect={handleTemplateSelect}
                                clientData={getClientData()}
                            />
                        </div>
                        <textarea 
                            name="message" 
                            rows="4" 
                            required
                            value={form.message}
                            onChange={handleChange} 
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="Enter your reminder message here or use a template..."
                        />
                        
                        {appliedTemplate && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Using template: <strong>{appliedTemplate.name}</strong></span>
                                <button 
                                    type="button"
                                    onClick={() => setAppliedTemplate(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        
                        {unreplacedVars.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-2 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>
                                    {unreplacedVars.length} variable(s) need replacement: {unreplacedVars.map(v => `{{${v}}}`).join(', ')}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Method</label>
                             <select 
                                name="sendVia" 
                                onChange={handleChange} 
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                             >
                                <option value="email">Email</option>
                                <option value="whatsapp">WhatsApp</option>
                             </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule Time</label>
                            <input 
                                type="datetime-local" 
                                name="scheduleAt" 
                                required
                                onChange={handleChange} 
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Clients</label>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{selectedClients.length} selected</span>
                        </div>
                        
                        <div className="mb-2">
                            <input 
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="max-h-48 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredClients.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No matching clients found</div>
                                ) : (
                                    filteredClients.map(c => (
                                        <label 
                                            key={c.id} 
                                            className={`flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors ${selectedClients.includes(c.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={selectedClients.includes(c.id)}
                                                onChange={() => toggleClient(c.id)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded mr-3"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.email}</p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Selected clients will receive this reminder via {form.sendVia}.
                            {selectedClients.length === 1 && " Client data will auto-fill template variables."}
                        </p>
                    </div>

                    <div className="flex flex-col space-y-3 pt-4">
                        <button 
                            type="submit" 
                            disabled={loading || clients.length === 0}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading || clients.length === 0 ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out`}
                        >
                            {loading ? "Scheduling..." : "Schedule Reminder"}
                        </button>
                        <Link to="/" className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReminderForm;
