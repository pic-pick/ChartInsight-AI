import React from "react";

const ErrorMessage = ({ message = "오류가 발생했습니다." }) => {
    return (
        <div className="my-4 rounded-md border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
            {message}
        </div>
    );
};

export default ErrorMessage;