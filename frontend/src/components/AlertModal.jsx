import { createPortal } from "react-dom";
import { useEffect } from "react";

const AlertModal = ({ isOpen, title, message, onClose, type = "error" }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === "Enter" || e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }
        
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const bgColor = type === "error" ? "bg-red-100" : "bg-blue-100";
    const iconColor = type === "error" ? "text-red-600" : "text-blue-600";
    const buttonColor = type === "error" ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div 
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border border-gray-100 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex flex-col items-center">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${bgColor}`}>
                                {type === "error" ? (
                                    <svg className={`h-6 w-6 ${iconColor}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                ) : (
                                    <svg className={`h-6 w-6 ${iconColor}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                            <div className="mt-4 text-center">
                                <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                                    {title}
                                </h3>
                                <div className="mt-2 text-center">
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent shadow-sm px-8 py-2 text-base font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColor} hover:scale-105 active:scale-95 sm:text-sm`}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AlertModal;

