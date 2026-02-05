import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Moon, Sun, Menu, X } from "lucide-react";

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const [darkMode, setDarkMode] = useState(() => {
        // Check localStorage or system preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('darkMode');
            if (saved !== null) return saved === 'true';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        // Apply dark mode class to html element
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

    const isActive = (path) => location.pathname === path 
        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-semibold" 
        : "text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800";
    
    const mobileActive = (path) => location.pathname === path 
        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-indigo-600";

    return (
        <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
                             <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Remind<span className="text-indigo-600 dark:text-indigo-400">Pro</span></span>
                        </Link>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
                        <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/")}`}>Dashboard</Link>
                        <Link to="/clients" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/clients")}`}>Clients</Link>
                        <Link to="/add-client" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/add-client")}`}>Add Client</Link>
                        <Link to="/create-reminder" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/create-reminder")}`}>Create Reminder</Link>
                        
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {isAuthenticated && (
                            <div className="flex items-center ml-4 border-l pl-4 border-gray-100 dark:border-gray-700">
                                <span className="text-gray-500 dark:text-gray-400 text-sm mr-3">Hi, {user?.username}</span>
                                <button 
                                    onClick={logout}
                                    className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden gap-2">
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {!isOpen ? <Menu className="w-6 h-6" /> : <X className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link to="/" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/")}`}>Dashboard</Link>
                        <Link to="/clients" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/clients")}`}>Clients</Link>
                        <Link to="/add-client" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/add-client")}`}>Add Client</Link>
                        <Link to="/create-reminder" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/create-reminder")}`}>Create Reminder</Link>
                        {isAuthenticated && (
                             <button 
                                onClick={() => { setIsOpen(false); logout(); }} 
                                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                             >
                                 Logout
                             </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
