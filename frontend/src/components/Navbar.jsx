import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? "text-indigo-600 bg-indigo-50 font-semibold" : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50";
    const mobileActive = (path) => location.pathname === path ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600";

    return (
        <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
                             <span className="font-bold text-xl tracking-tight text-gray-900">Remind<span className="text-indigo-600">Pro</span></span>
                        </Link>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
                        <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/")}`}>Dashboard</Link>
                        <Link to="/clients" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/clients")}`}>Clients</Link>
                        <Link to="/add-client" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/add-client")}`}>Add Client</Link>
                        <Link to="/create-reminder" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive("/create-reminder")}`}>Create Reminder</Link>
                        {isAuthenticated && (
                            <div className="flex items-center ml-4 border-l pl-4 border-gray-100">
                                <span className="text-gray-500 text-sm mr-3">Hi, {user?.username}</span>
                                <button 
                                    onClick={logout}
                                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {!isOpen ? (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            ) : (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-100">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link to="/" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/")}`}>Dashboard</Link>
                        <Link to="/clients" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/clients")}`}>Clients</Link>
                        <Link to="/add-client" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/add-client")}`}>Add Client</Link>
                        <Link to="/create-reminder" onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${mobileActive("/create-reminder")}`}>Create Reminder</Link>
                        {isAuthenticated && (
                             <button 
                                onClick={() => { setIsOpen(false); logout(); }} 
                                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50 transition-colors"
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
