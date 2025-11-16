import React from "react";

const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <span className="ml-2 text-sm text-slate-300">Loading...</span>
        </div>
    );
};

export default LoadingSpinner;